/*
 * mybffpt — myBudget Forecaster
 * Copyright (C) 2026 54x1
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 *
 * This file is part of mybffpt, free software licensed under the GNU Affero
 * General Public License v3.0 or later. See the LICENSE file in the project
 * root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
 */

// Generic bank-statement table parser for PDF layout text produced by
// `src/utils/pdf.ts`. The strategy — anchor on transaction lines (date +
// amount), reject header/footer noise, and infer the amount column geometry
// (single / debit-credit split / running-balance) — follows the design of the
// monopoly generic parser (https://github.com/benjamin-awd/monopoly,
// AGPL-3.0). See NOTICE.md for attribution.
//
// Output is CSV text (`Date,Description,Amount`) so it flows through the
// existing CSV pipeline in `src/utils/csv.ts` (inferColumns →
// scanAmountConvention → rowToTransaction) unchanged.

import type { PdfPageLayout } from "./pdf";
import { parseDateGuess } from "./dates";
import { dbg, dbgw } from "./debug";

/** Column geometry detected across the sampled transaction rows. */
export type AmountMode = "single" | "split" | "balance";

export interface ParsedStatementRow {
  dateISO: string;
  description: string;
  /** Signed amount: negative = spending, positive = income. */
  amount: number;
}

export interface StatementParseResult {
  rows: ParsedStatementRow[];
  csv: string;
  mode: AmountMode;
  /** Page lines that looked like transactions but failed to parse. */
  skippedCount: number;
  /**
   * Manual column mapping suggested by auto-detection, or null when nothing
   * conclusive was found. Used to pre-select roles in the manual mapper UI.
   */
  autoMapping?: PdfColumnMapping | null;
}

/**
 * User-chosen column geometry for statement formats the automatic detector
 * cannot (or wrongly) resolves. Anchors are grid columns: numeric anchors
 * match a cell's RIGHT edge (amounts are right-aligned), the description
 * anchor matches a text cell's START column. Matching tolerance is ±3 / ±4
 * columns respectively — see `ANCHOR_TOL` / `TEXT_TOL`.
 */
export interface PdfColumnMapping {
  /** "split": debit + credit columns; "single": one signed amount column. */
  mode: "single" | "split";
  /** Right-edge anchor of the single amount column (mode "single"). */
  singleAnchor?: number;
  /** Right-edge anchor of the money-out column (mode "split"). */
  debitAnchor?: number;
  /** Right-edge anchor of the money-in column (mode "split"). */
  creditAnchor?: number;
  /** Start-column anchor of the description text cell; undefined = all text. */
  descAnchor?: number;
}

/** A detected vertical column offered to the manual mapper UI. */
export interface DetectedColumn {
  kind: "numeric" | "text";
  /** Numeric: representative right edge. Text: representative start column. */
  anchorCol: number;
  /** Example cell texts (few, short) so the user can recognise the column. */
  samples: string[];
  /** Candidate rows that have a cell in this column. */
  fillCount: number;
}

/** Everything the manual mapper UI needs to present a foreign statement. */
export interface PdfColumnDetection {
  columns: DetectedColumn[];
  /** First few transaction-like raw lines, for visual sanity-checking.
   *  Leading whitespace is preserved so positions line up with `anchorCol`. */
  previewLines: string[];
  /** Transaction-like rows found (date + at least one amount-looking cell). */
  rowCount: number;
}

// ── Token matchers ──────────────────────────────────────────────────────────

/**
 * Transaction date at the START of a line. Covers AU bank formats:
 * `02/07/2026`, `2-7-26`, `02 Jul 2026`, `2 JUL`, `15:10 29-12-25`.
 * Yearless day+month is captured too (year filled from {@link YearHint}).
 */
const DATE_START_RE =
  /^\s*(?:(\d{1,2}):(\d{2})\s+)?(\d{1,2})[\/\-. ]([A-Za-z]{3}|\d{1,2})[\/\-. ](?:(\d{4}|\d{2})\b)?/;

/** A whole cell that is just an amount: `$1,234.56`, `(99.00)`, `12.34 CR`, `-5`. */
const AMOUNT_CELL_RE =
  /^\(?\s*[-+]?\s*\$?-?\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?\s*(?:CR|DR|\)?\s*-)?\s*\)?$/i;

/** Amount with sign indicators extracted (used inside a matched cell). */
const AMOUNT_PARSE_RE = /(\(|-|\+)?\s*\$?(-?)\s*(\d{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\s*(CR|DR)?/i;

/** Noise that never belongs to a transaction row. */
const NOISE_RE =
  /page\s+\d+\s+of|balance brought forward|\bbrought forward\b|balance carried (forward|down)|statement period|account (number|summary)|bsb|routing number|swift|abn\s*:|^\s*©|terms and conditions|important information|your balance summary|transaction history$|statement (from|to)\b/i;

/** ≥3 consecutive dots: NAB-style column fillers padding to the amount. */
const DOT_LEADER_RE = /\.{3,}/g;

/** A period welded between an amount and a CR/DR suffix ("379.21.Cr") —
 * joinRow overlap can fuse a balance item into surrounding leader dots. */
const WELDED_SUFFIX_RE = /(\d)\.(?=CR|DR)/gi;

/** Footer/summary wording that must never become a transaction in leader
 * mode — totals print behind a dot leader under the last day's carry date. */
const TOTALISH_RE = /^\s*(?:total|subtotal|sub total|net (?:change|amount)|closing balance|opening balance)/i;

/** A line whose amount is reached through a dot leader — the shape of every
 * NAB transaction row ("Kahler E ............ 80.00"). Also matches rows that
 * print a running balance after the amount ("... 11.95   379.21 Cr"). The gap
 * between leader and amount may be ZERO: joinRow overlap welds some amounts
 * straight onto the dots ("Happytel Retail....................49.00"), and
 * those rows must count too or their text leaks into the next description. */
const LEADER_AMOUNT_RE = /\.{3,} *\d{1,3}(?:,\d{3})*\.\d{2}/;

/** Replace dot-leader runs with spaces of identical length: the amount cells
 * they were glued to become separable while every character keeps its grid
 * column, so right-edge band clustering stays exact. */
function stripDotLeaders(line: string): string {
  return line
    .replace(WELDED_SUFFIX_RE, "$1 ")
    .replace(DOT_LEADER_RE, (run) => " ".repeat(run.length));
}

/** Column-header lines ("Date Description Debit Credit") — never a description. */
const HEADERISH_RE = /^(date|effective|description|debit|credit|amount|balance|transaction)\b/i;

/** A bare date token repeated in-line before the description, e.g. CBA's
 * "12 Jan     12 Jan     To: …" (transaction date + effective date). */
const BARE_DATE_RE =
  /^\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?$/i;

/** Month-name + explicit 4-digit year, e.g. CBA header "10 January 2024 - 9 May 2024". */
const MONTH_NAME_YEAR_RE =
  /\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+((?:19|20)\d{2})\b/gi;

export interface YearHint {
  /** Reference year, e.g. from the statement filename or a detected header. */
  year: number;
}

/**
 * Detect the statement year from page text (e.g. CBA's "10 January 2024 -
 * 9 May 2024" header line). Scans the first two pages for month-name dates
 * carrying a four-digit year and returns the most common one, so yearless
 * transaction rows ("12 Jan") resolve to the statement's year instead of the
 * current calendar year. Null when no explicit year is present (e.g. Westpac,
 * whose rows already carry "31 Aug 26").
 */
export function yearHintFromPages(pages: PdfPageLayout[]): YearHint | null {
  const counts = new Map<number, number>();
  for (const page of pages.slice(0, 2)) {
    for (const line of page.lines) {
      MONTH_NAME_YEAR_RE.lastIndex = 0;
      let m: RegExpExecArray | null;
      while ((m = MONTH_NAME_YEAR_RE.exec(line)) !== null) {
        const y = Number(m[1]);
        counts.set(y, (counts.get(y) ?? 0) + 1);
      }
    }
  }
  let best: number | null = null;
  let bestN = 0;
  for (const [y, n] of counts) if (n > bestN) { best = y; bestN = n; }
  return best !== null ? { year: best } : null;
}

/** Try to read a leading date off a line. Returns ISO date (or "" if the
 * token is not resolvable) plus the consumed text length. */
export function matchDateAtLineStart(
  line: string,
  hint?: YearHint,
): { dateISO: string; end: number } | null {
  const m = DATE_START_RE.exec(line);
  if (!m) return null;

  const [, hh, mm, dayStr, monthTok, yearTok] = m;
  const day = Number(dayStr);
  let month: number;
  if (/^\d{1,2}$/.test(monthTok)) {
    month = Number(monthTok);
  } else {
    const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
    const idx = months.indexOf(monthTok.toLowerCase());
    if (idx === -1) return null;
    month = idx + 1;
  }

  let year: number | undefined = yearTok ? Number(yearTok) : undefined;
  if (year !== undefined && year < 100) year += 2000;
  if (year === undefined) {
    // Yearless date ("2 JUL") — only accept when we have a hint, and let the
    // caller's parseDateGuess validate day/month.
    if (!hint) return null;
    year = hint.year;
    const iso = guess(`${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`);
    if (iso) return { dateISO: iso, end: m[0].length };
    // Hint year may be wrong for a Dec/Jan boundary — try ±1.
    for (const dy of [-1, 1]) {
      const alt = guess(`${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year + dy}`);
      if (alt) return { dateISO: alt, end: m[0].length };
    }
    return null;
  }

  const raw = hh && mm
    ? `${hh}:${mm} ${day}-${month}-${year}` // Ubank-style "HH:MM DD-MM-YY"
    : `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
  const iso = guess(raw);
  return iso ? { dateISO: iso, end: m[0].length } : null;

  function guess(s: string): string {
    const out = parseDateGuess(s);
    return /^\d{4}-\d{2}-\d{2}$/.test(out) ? out : "";
  }
}

/** Parse a full amount cell into a signed number, honouring CR/DR, parentheses,
 * trailing minus and leading sign. Returns null when the cell isn't an amount. */
export function matchAmountCell(cell: string): number | null {
  const t = cell.trim();
  if (!t || !AMOUNT_CELL_RE.test(t)) return null;
  const m = AMOUNT_PARSE_RE.exec(t);
  if (!m) return null;

  const [, openParen, leadSign, digitsRaw, crdr] = m;
  const digits = digitsRaw.replace(/,/g, "");
  const value = Number(digits);
  if (!isFinite(value)) return null;

  let sign = 1;
  if (openParen) sign *= -1; // (99.00) → negative
  if (leadSign === "-") sign *= -1;
  if (/\-\s*$/.test(t)) sign *= -1; // trailing minus "12.34-"
  if (crdr) {
    const c = crdr.toUpperCase();
    // In statements, CR on a purchase column means money out of the account
    // for credit-card statements and money in for deposit accounts — we cannot
    // know which here, so treat DR as spending and CR as income (deposit view).
    sign = c === "DR" ? -1 : 1;
  }
  return sign * value;
}

/** A cell that is only a reference number ("Ref: 74249235002", "507519") —
 * NAB prints the real merchant on the memo line above such rows. */
const PURE_REF_RE = /^(?:ref[:.]?\s*)?[a-z]?\d{4,}$/i;

// ── Cell splitting on layout gaps ───────────────────────────────────────────

/** A cell within a reconstructed layout line: text + starting character column. */
export interface LayoutCell {
  text: string;
  /** Start index in the line (grid column). */
  col: number;
}

/** Split a reconstructed layout line into cells at wide gaps (≥3 spaces). */
export function splitCells(line: string): LayoutCell[] {
  const cells: LayoutCell[] = [];
  // A cell is a run of tokens separated by at most two spaces; three or more
  // spaces indicate a table column boundary.
  const re = /[^ ]+(?: {1,2}[^ ]+)*/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(line)) !== null) cells.push({ text: m[0], col: m.index });
  return cells;
}

interface NumericHit {
  value: number;
  /** End character column of the amount cell (amounts are right-aligned). */
  endCol: number;
}

/** A bare CR/DR suffix printed as its own cell after a balance ("379.21  Cr"). */
const CRDR_ONLY_RE = /^(CR|DR)\.?$/i;

/**
 * Collect the trailing run of amount cells from a row's cells, right→left.
 * `colOffset` is added to every endCol so callers can re-anchor to full-line
 * coordinates. A standalone "Cr"/"Dr" cell at the far right (NAB prints the
 * running-balance sign separately) folds its sign into the amount just left of
 * it without shifting that amount's column. Returns the hits in column order
 * and `descEnd` — the index where non-numeric description cells begin.
 */
function collectTrailingNumerics(
  cells: LayoutCell[],
  colOffset: number,
): { numerics: NumericHit[]; descEnd: number } {
  const numerics: NumericHit[] = [];
  let i = cells.length - 1;

  // Optional trailing CR/DR suffix cell → remember its sign for the amount left of it.
  let suffixSign = 0;
  if (i >= 0 && CRDR_ONLY_RE.test(cells[i].text.trim())) {
    suffixSign = /^dr/i.test(cells[i].text.trim()) ? -1 : 1;
    i--;
  }

  for (; i >= 0; i--) {
    const v = matchAmountCell(cells[i].text);
    if (v === null) break;
    // Apply a folded suffix sign to the innermost amount it attaches to.
    const signed = suffixSign !== 0 ? Math.abs(v) * suffixSign : v;
    suffixSign = 0;
    numerics.unshift({ value: signed, endCol: colOffset + cells[i].col + cells[i].text.trimEnd().length });
  }
  return { numerics, descEnd: i + 1 };
}

interface CandidateRow {
  dateISO: string;
  /** Every cell after the leading date token (mapping mode scans these). */
  cells: LayoutCell[];
  /** Trailing numeric cells, left→right in column order. */
  numerics: NumericHit[];
  raw: string;
  /** Digit-free lines printed directly above this row (its description when it has no inline text). */
  above: string[];
  /** Digit-free continuation lines printed below this row. */
  below: string[];
}

/** A vertical band of amount columns clustered by right-edge position. */
interface AmountBand {
  endCol: number;
}

interface Clustered {
  bands: AmountBand[];
  /** Per-row band index for each numeric hit (parallel to `rows[].numerics`); -1 impossible after clustering. */
  assigns: number[][];
}

/**
 * Cluster every numeric hit into vertical bands by right edge, recording the
 * exact band membership of each hit. Membership is fixed here — later column
 * trimming must never re-snap a value into a surviving band (a running-
 * balance column killed as noise would otherwise leak back in through its
 * nearest neighbour).
 */
function clusterRows(rows: CandidateRow[]): Clustered {
  const flat: { endCol: number; r: number; h: number }[] = [];
  rows.forEach((row, ri) => row.numerics.forEach((n, hi) => flat.push({ endCol: n.endCol, r: ri, h: hi })));
  flat.sort((a, b) => a.endCol - b.endCol);
  const bands: AmountBand[] = [];
  const assigns: number[][] = rows.map((r) => new Array<number>(r.numerics.length).fill(-1));
  for (const f of flat) {
    const last = bands[bands.length - 1];
    if (!last || Math.abs(f.endCol - last.endCol) > 3) bands.push({ endCol: f.endCol });
    assigns[f.r][f.h] = bands.length - 1;
  }
  return { bands, assigns };
}

/** Column geometry plan derived from all candidate rows. */
interface ColumnPlan {
  mode: AmountMode;
  /** Post-trim sparse values per row, indexed by original band index. */
  grid: (number | null)[][];
  /** Band holding the amount in "single"/"balance" modes (-1 = none). */
  singleIdx: number;
  debitIdx: number | null;
  creditIdx: number | null;
}

/**
 * Detect the amount-column geometry from candidate rows. Because empty
 * debit/credit cells leave no trace, columns are identified by the character
 * positions of the numeric cells themselves (right-aligned amounts share a
 * stable end column), then clustered into vertical bands.
 */
function analyzeColumns(rows: CandidateRow[]): ColumnPlan {
  const { bands, assigns } = clusterRows(rows);
  const alive = bands.map(() => true);
  let sawBalanceTrim = false;

  const valuesOf = (ri: number): (number | null)[] => {
    const out: (number | null)[] = new Array(bands.length).fill(null);
    rows[ri].numerics.forEach((n, hi) => {
      const b = assigns[ri][hi];
      if (b >= 0 && alive[b] && out[b] === null) out[b] = n.value;
    });
    return out;
  };

  // Trim running-balance band(s): filled on nearly every row with a magnitude
  // that dwarfs the other numeric columns (balances accumulate). Scanned
  // right-to-left but NOT restricted to the rightmost band — summary tables
  // on page 1 can add sparse outlier bands further right, which previously
  // blocked trimming and let balance values leak in as transaction amounts.
  while (bands.length >= 2 && rows.length >= 4) {
    const grid = rows.map((_, ri) => valuesOf(ri));
    let killIdx = -1;
    for (let i = bands.length - 1; i >= 0; i--) {
      if (!alive[i]) continue;
      const filled = grid.map((g) => g[i]).filter((v): v is number => v !== null);
      if (filled.length < rows.length * 0.95) continue;
      const medHere = median(filled.map(Math.abs));
      const others: number[] = [];
      rows.forEach((row, ri) =>
        row.numerics.forEach((n, hi) => {
          const b = assigns[ri][hi];
          if (b >= 0 && alive[b] && b !== i) others.push(Math.abs(n.value));
        }),
      );
      if (medHere > Math.max(1, median(others.length ? others : [0])) * 3) { killIdx = i; break; }
    }
    if (killIdx === -1) break;
    alive[killIdx] = false;
    sawBalanceTrim = true;
  }

  const grid = rows.map((_, ri) => valuesOf(ri));
  const aliveCount = alive.filter(Boolean).length;

  // The amount column in single/balance modes: the best-supported band
  // (rightmost on ties), not blindly the right edge — outlier columns from
  // page-1 summary tables must not win.
  let singleIdx = -1;
  let bestSupport = -1;
  for (let i = bands.length - 1; i >= 0; i--) {
    if (!alive[i]) continue;
    const s = grid.filter((g) => g[i] !== null).length;
    if (s > bestSupport) { bestSupport = s; singleIdx = i; }
  }

  if (aliveCount >= 2 && rows.length > 0) {
    // Split debit/credit: pick the band pair where nearly every row fills
    // exactly one member. All pairs are scored (not just the two rightmost)
    // so sparse outlier bands from summary tables can't hijack the pairing;
    // a running-balance column never qualifies because it co-occurs with the
    // amount columns instead of being mutually exclusive to them.
    let bestPair: [number, number] | null = null;
    let bestCoverage = 0;
    for (let i = 0; i < bands.length; i++) {
      if (!alive[i]) continue;
      for (let j = i + 1; j < bands.length; j++) {
        if (!alive[j]) continue;
        let sFill = 0, rFill = 0, xOne = 0;
        for (const g of grid) {
          const a = g[i] !== null, b = g[j] !== null;
          if (a) sFill++;
          if (b) rFill++;
          if (a !== b) xOne++;
        }
        const coverage = sFill + rFill;
        if (sFill > 0 && rFill > 0 && xOne >= grid.length * 0.8 && coverage > bestCoverage) {
          bestPair = [i, j];
          bestCoverage = coverage;
        }
      }
    }
    if (bestPair) {
      return { mode: "split", grid, singleIdx, debitIdx: bestPair[0], creditIdx: bestPair[1] };
    }
  }

  const mode: AmountMode = sawBalanceTrim ? "balance" : "single";
  return { mode, grid, singleIdx, debitIdx: null, creditIdx: null };
}

function median(nums: number[]): number {
  const s = nums.filter((n) => isFinite(n)).sort((a, b) => a - b);
  if (!s.length) return 0;
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Resolve one candidate row's sparse band values to a signed amount. */
function resolveAmount(values: (number | null)[], plan: ColumnPlan): number | null {
  if (plan.mode === "split" && plan.debitIdx !== null && plan.creditIdx !== null) {
    // Left column = debit (spending), right column = credit (income).
    const debit = values[plan.debitIdx];
    const credit = values[plan.creditIdx];
    if (debit !== null) return -Math.abs(debit);
    if (credit !== null) return Math.abs(credit);
    return null;
  }
  return plan.singleIdx >= 0 ? values[plan.singleIdx] : null;
}

// ── Main entry point ────────────────────────────────────────────────────────

/**
 * Parse reconstructed PDF pages into statement rows + CSV text.
 * Conservative by design: lines without a leading date and an amount are
 * treated as noise or description continuations, never transactions.
 *
 * Without `mapping`, the column geometry is auto-detected (single / split /
 * balance). With a {@link PdfColumnMapping} — chosen by the user in the
 * manual mapper UI — the anchors in the mapping decide which columns hold
 * debit / credit / amount and where the description starts.
 */
export function pdfPagesToStatement(
  pages: PdfPageLayout[],
  hint?: YearHint,
  mapping?: PdfColumnMapping | null,
): StatementParseResult {
  // A year spelled out in the page text ("10 January 2024 - 9 May 2024") is
  // statement metadata — more reliable than a filename or the current year.
  const effHint = yearHintFromPages(pages) ?? hint;

  const lines = pages.flatMap((p) => p.lines);
  const { candidates, skippedCount } = collectCandidates(lines, effHint);

  if (mapping) {
    return resolveWithMapping(candidates, mapping, skippedCount);
  }

  // Pass 2 — resolve amounts under the detected column geometry.
  const plan = analyzeColumns(candidates);
  const rows: ParsedStatementRow[] = [];
  let skipped = skippedCount;
  candidates.forEach((c, i) => {
    const amount = resolveAmount(plan.grid[i], plan);
    if (amount === null || !isFinite(amount) || Math.abs(amount) < 0.005) {
      skipped++;
      return;
    }
    rows.push({ dateISO: c.dateISO, description: describeCandidate(c), amount });
  });

  dbg("pdfStatement:", { lines: lines.length, candidates: candidates.length, mode: plan.mode, kept: rows.length, skippedCount: skipped });
  if (candidates.length > 0 && rows.length === 0) {
    dbgw("pdfStatement: candidates found but none resolved — check amount geometry");
  }

  return {
    rows,
    csv: statementRowsToCsv(rows),
    mode: plan.mode,
    skippedCount: skipped,
    autoMapping: suggestMapping(candidates, plan),
  };
}

// ── Pass 1 (shared): collect candidate transaction rows ────────────────────

function collectCandidates(
  lines: string[],
  effHint?: YearHint,
): { candidates: CandidateRow[]; skippedCount: number } {
  // Leader mode: the statement pads rows with dot leaders (NAB). Amounts sit
  // at the end of leader runs and dates print once per day as standalone
  // headers — enable carry-forward parsing only when that shape dominates,
  // so per-row formats (CBA/Westpac/Ubank) keep their exact old behaviour.
  const leaderMode = lines.filter((l) => LEADER_AMOUNT_RE.test(l)).length >= 5;

  // Wrap mode: some statements (CommBank "Direct Credit / Fast Transfer")
  // print the date + description on one line and push the amount onto the
  // NEXT undated reference/memo line. Detect that shape only when it dominates
  // — a handful of stray wrapped lines must not change parsing for formats
  // where every transaction carries its own inline amount.
  const wrapMode = !leaderMode && countWrappedPairs(lines, effHint) >= 5;

  const candidates: CandidateRow[] = [];
  let currentIdx = -1;
  // Digit-free text lines awaiting assignment: they are a description ABOVE
  // the next date row when that row has no inline description (Westpac
  // Choice recurring payments), otherwise a continuation BELOW the preceding
  // candidate (multi-line merchant names, CBA notes). Decided on arrival of
  // the next date row — until then they stay buffered. In leader mode every
  // pending line belongs ABOVE the next amount row (NAB memo lines carry
  // digits: "V0031 02/01 Bunnings 307000").
  let buffer: string[] = [];
  let skippedCount = 0;
  // Most recent standalone day header ("6 Jan 2025"), carried onto the
  // amount-only rows printed beneath it until the next day appears.
  let carryDateISO: string | null = null;

  const flushBelow = () => {
    if (!buffer.length) return;
    if (currentIdx >= 0 && !leaderMode) candidates[currentIdx].below.push(...buffer);
    else if (currentIdx < 0 || leaderMode) buffer = []; // structural break — memos die with it
  };

  let consumedIdx = -1; // index of a line already merged into a header above it
  for (let li = 0; li < lines.length; li++) {
    const rawLine = lines[li];
    if (li === consumedIdx) continue; // consumed as a wrapped-amount line
    if (!rawLine.trim()) continue;
    let line = leaderMode ? stripDotLeaders(rawLine) : rawLine;
    if (NOISE_RE.test(line)) { flushBelow(); currentIdx = -1; continue; }

    const dateHit = matchDateAtLineStart(line, effHint);
    if (dateHit) {
      let cells = splitCells(line.slice(dateHit.end));
      // Trailing numeric cells (amount / balance columns), keeping their grid
      // column so empty debit/credit cells don't misalign the geometry.
      let { numerics, descEnd } = collectTrailingNumerics(cells, dateHit.end);

      // Re-anchor cell columns to the full line for mapping-mode matching.
      let fullCells = cells.map((c) => ({ text: c.text, col: dateHit.end + c.col }));

      if (numerics.length === 0 && wrapMode && !TOTALISH_RE.test(line.slice(dateHit.end))) {
        // Wrapped layout: this header carries the description only — lift the
        // next line's trailing amount cells onto it character-precisely so
        // band clustering sees one complete transaction row.
        const amtIdx = nextNonBlankIndex(lines, li);
        const tail = amtIdx === -1 ? null : wrappedAmountCells(lines[amtIdx], effHint);
        const merged = tail === null ? null : overlayCells(line, tail);
        if (merged !== null) {
          consumedIdx = amtIdx;
          line = merged;
          cells = splitCells(line.slice(dateHit.end));
          ({ numerics, descEnd } = collectTrailingNumerics(cells, dateHit.end));
          fullCells = cells.map((c) => ({ text: c.text, col: dateHit.end + c.col }));
        }
      }

      if (numerics.length === 0) {
        // Date but no amount → day header (leader mode) or summary row.
        // NAB prints the first memo line of the day on the same row as the
        // header ("6 Jan 2025   Online … Linked Acc Trns") — keep that text
        // as a pending description for the next amount row.
        if (leaderMode) {
          carryDateISO = dateHit.dateISO || null;
          buffer.push(...cells.slice(0, descEnd).map((c) => c.text.trim()).filter(Boolean));
          currentIdx = -1;
          continue;
        }
        skippedCount++;
        flushBelow();
        currentIdx = -1;
        continue;
      }

      const above: string[] = [];
      if (buffer.length && !cells.slice(0, descEnd).length) {
        // description printed above this row
        above.push(...buffer.splice(0));
      } else if (buffer.length) {
        flushBelow(); // belongs to the previous candidate as continuation
      }

      candidates.push({ dateISO: dateHit.dateISO, cells: fullCells, numerics, raw: line, above, below: [] });
      if (leaderMode) carryDateISO = dateHit.dateISO || carryDateISO;
      currentIdx = candidates.length - 1;
      continue;
    }

    // No leading date. In leader mode an amount-bearing row under the
    // current day header IS a transaction — NAB prints every amount behind
    // a dot leader, so require that shape to keep memo/summary lines out.
    if (
      leaderMode &&
      carryDateISO &&
      LEADER_AMOUNT_RE.test(rawLine) &&
      !HEADERISH_RE.test(line.trim()) &&
      !TOTALISH_RE.test(line)
    ) {
      const cells = splitCells(line);
      const { numerics } = collectTrailingNumerics(cells, 0);
      if (numerics.length) {
        const fullCells = cells.map((c) => ({ text: c.text, col: c.col }));
        const above = buffer.splice(0); // memo lines printed directly above
        candidates.push({ dateISO: carryDateISO, cells: fullCells, numerics, raw: line, above, below: [] });
        currentIdx = candidates.length - 1;
        continue;
      }
    }

    // No leading date. A text line is a pending description — assigned
    // above-or-below once the next date row reveals its shape (see buffer).
    const digitFree = !/\d/.test(line) && line.trim().length <= 80;
    // In leader mode memo lines carry digits ("V0031 02/01 Bunnings"), so
    // letter-bearing lines are memos too — but never a bare amount or a
    // balance with its CR/DR suffix printed on its own.
    const noSuffix = line.trim().replace(/\s*\(?(?:CR|DR)\)?\.?$/i, "").trim();
    const looksMemo = /[A-Za-z]/.test(line) && !AMOUNT_CELL_RE.test(noSuffix);
    if ((digitFree || (leaderMode && looksMemo)) && !HEADERISH_RE.test(line.trim())) {
      buffer.push(line.trim());
      if (buffer.length > 4) buffer.splice(0, buffer.length - 4); // runaway guard
    } else {
      // Digits or a column header → never description text.
      flushBelow();
      currentIdx = -1;
    }
  }
  flushBelow();

  return { candidates, skippedCount };
}

/** How many date-headers defer their amount to the next line — the trigger
 * for wrap mode. Counted only when the shape dominates so formats that print
 * an inline amount on every row (CBA dual-date, Westpac) never flip into it. */
function countWrappedPairs(lines: string[], effHint?: YearHint): number {
  let n = 0;
  for (let i = 0; i < lines.length - 1; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const dateHit = matchDateAtLineStart(line, effHint);
    if (!dateHit) continue;
    const cells = splitCells(line.slice(dateHit.end));
    const { numerics } = collectTrailingNumerics(cells, dateHit.end);
    if (numerics.length === 0 && !TOTALISH_RE.test(line.slice(dateHit.end)) && wrappedAmountCells(lines[nextNonBlankIndex(lines, i)], effHint)) {
      n++;
    }
  }
  return n;
}

/** Index of the next non-blank line after `i`, or -1 at the end. */
function nextNonBlankIndex(lines: string[], i: number): number {
  for (let j = i + 1; j < lines.length; j++) if (lines[j].trim()) return j;
  return -1;
}

/** Amount cells printed at the end of an undated continuation line — the money
 * a wrapped-layout header (date + description only) pushes onto its next row.
 * Null when `next` is not such a line: it carries its own leading date, reads
 * as a header/footer/summary, or has no trailing amount with cents (so integer
 * reference numbers like "641031007" never masquerade as a deferred amount). */
function wrappedAmountCells(next: string | undefined, effHint?: YearHint): LayoutCell[] | null {
  if (!next || !next.trim()) return null;
  const line = next.replace(/\s+$/, "");
  if (matchDateAtLineStart(line, effHint)) return null; // its own transaction row
  if (NOISE_RE.test(line) || HEADERISH_RE.test(line.trim()) || TOTALISH_RE.test(line)) return null;
  const cells = splitCells(line);
  const { numerics, descEnd } = collectTrailingNumerics(cells, 0);
  if (!numerics.length) return null;
  const trailing = cells.slice(descEnd); // includes a folded standalone CR/DR cell
  if (!trailing.some((c) => /\.\d{2}\s*(?:CR|DR)?\.?$/i.test(c.text.trim()))) return null;
  return trailing.map((c) => ({ text: c.text, col: c.col }));
}

/** Paint amount cells onto a header line at their own grid columns (both lines
 * share the PDF's character coordinate space). Returns null when any cell would
 * overwrite existing description text — safer to leave that row unmerged. */
function overlayCells(base: string, cells: LayoutCell[]): string | null {
  const chars = base.replace(/\s+$/, "").split("");
  for (const c of cells) {
    const text = c.text.trimEnd();
    if (!text) continue;
    for (let i = c.col; i < c.col + text.length; i++) {
      if (i < chars.length && chars[i] !== " ") return null; // collision — bail out
    }
    while (chars.length < c.col) chars.push(" ");
    for (let i = 0; i < text.length; i++) chars[c.col + i] = text[i];
  }
  return chars.join("");
}

/** Inline description cells (text before the trailing numeric run), with
 * in-line repeats of the leading date token dropped (CBA prints it twice). */
function inlineDescCells(c: CandidateRow): string[] {
  const lead = c.cells.slice(0, c.cells.length - c.numerics.length).map((cell) => cell.text.trim());
  while (lead.length && BARE_DATE_RE.test(lead[0])) lead.shift();
  return lead;
}

/** NAB memo lines lead with a bank transaction code and the payment's
 * effective date ("V0031 31/12 Bunnings 307000") — bookkeeping noise that
 * buries the merchant name. Strip the pair so descriptions read naturally;
 * nothing else in the supported formats opens with that exact shape. */
const MEMO_PREFIX_RE = /^[A-Z]\d{4}\s+\d{1,2}\/\d{1,2}\s+/;

function joinDescription(parts: string[]): string {
  return parts.join(" ").replace(MEMO_PREFIX_RE, "").replace(/\s+/g, " ").trim();
}

/** Auto-mode description: inline cells, or the lines printed above when the
 * row has none, plus continuation lines printed below. A pure reference
 * number ("Ref: 74249235002", "507519") is not a merchant name — NAB prints
 * the real one on the memo line above, so prefer that when present. */
function describeCandidate(c: CandidateRow): string {
  let parts = inlineDescCells(c);
  if (parts.length && c.above.length && parts.every((p) => PURE_REF_RE.test(p))) {
    parts = [];
  }
  if (!parts.length && c.above.length) parts.push(...c.above);
  parts.push(...c.below);
  // Standalone amount-looking cells are column values (folded CR/DR suffixes
  // shift the count-based slice), never merchant text.
  parts = parts.filter((p) => matchAmountCell(p) === null);
  return joinDescription(parts) || "Transaction";
}

// ── Manual column mapping ───────────────────────────────────────────────────

/** Tolerance (grid columns) when matching a numeric cell's right edge to an anchor. */
export const ANCHOR_TOL = 3;
/** Tolerance (grid columns) when matching a text cell's start to an anchor. */
export const TEXT_TOL = 4;

function resolveWithMapping(
  candidates: CandidateRow[],
  m: PdfColumnMapping,
  skippedBase: number,
): StatementParseResult {
  const rows: ParsedStatementRow[] = [];
  let skippedCount = skippedBase;

  for (const c of candidates) {
    const usedIdx = new Set<number>();
    let debitVal: number | null = null;
    let creditVal: number | null = null;
    let singleVal: number | null = null;

    c.cells.forEach((cell, i) => {
      const v = matchAmountCell(cell.text);
      if (v === null) return;
      const end = cell.col + cell.text.trimEnd().length;
      if (m.mode === "split") {
        if (debitVal === null && m.debitAnchor !== undefined && Math.abs(end - m.debitAnchor) <= ANCHOR_TOL) {
          debitVal = v; usedIdx.add(i);
        } else if (creditVal === null && m.creditAnchor !== undefined && Math.abs(end - m.creditAnchor) <= ANCHOR_TOL) {
          creditVal = v; usedIdx.add(i);
        }
      } else if (singleVal === null && m.singleAnchor !== undefined && Math.abs(end - m.singleAnchor) <= ANCHOR_TOL) {
        singleVal = v; usedIdx.add(i);
      }
    });

    const amount =
      m.mode === "split"
        ? debitVal !== null
          ? -Math.abs(debitVal)
          : creditVal !== null
            ? Math.abs(creditVal)
            : null
        : singleVal;

    if (amount === null || !isFinite(amount) || Math.abs(amount) < 0.005) {
      skippedCount++;
      continue;
    }

    // Description: unassigned cells from the chosen start column up to the
    // first amount-role cell. No descAnchor → all text before the amounts
    // (same as auto mode). Above/below lines fill in when inline is empty.
    const firstRoleIdx = c.cells.findIndex((_, i) => usedIdx.has(i));
    let parts: string[];
    if (m.descAnchor !== undefined && m.descAnchor !== null) {
      const anchorIdx = c.cells.findIndex(
        (cell, i) => !usedIdx.has(i) && Math.abs(cell.col - m.descAnchor!) <= TEXT_TOL,
      );
      parts =
        anchorIdx === -1
          ? []
          : c.cells
              .slice(anchorIdx, firstRoleIdx === -1 ? undefined : firstRoleIdx)
              .filter((_, j) => !usedIdx.has(anchorIdx + j))
              .map((cell) => cell.text.trim());
    } else {
      parts = inlineDescCells(c);
    }
    while (parts.length && BARE_DATE_RE.test(parts[0])) parts.shift();
    // Standalone amount-looking cells inside the description range are column
    // values the user did not assign a role to — never merchant text.
    parts = parts.filter((p) => p && matchAmountCell(p) === null);
    // Same rule as auto mode: a pure reference number ("Ref: 74940") is not a
    // merchant name — NAB prints the real one on the memo line above.
    if (parts.length && c.above.length && parts.every((p) => PURE_REF_RE.test(p))) {
      parts = [];
    }
    if (!parts.length && c.above.length) parts.push(...c.above);
    parts.push(...c.below);
    const description = joinDescription(parts) || "Transaction";

    rows.push({ dateISO: c.dateISO, description, amount });
  }

  dbg("pdfStatement(mapping):", { candidates: candidates.length, kept: rows.length, skippedCount });
  return { rows, csv: statementRowsToCsv(rows), mode: m.mode, skippedCount };
}

/** Suggest a manual mapping from the auto-detected plan (for UI preselect). */
function suggestMapping(candidates: CandidateRow[], plan: ColumnPlan): PdfColumnMapping | null {
  if (!candidates.length) return null;
  const { bands } = clusterRows(candidates);
  const anchorOf = (idx: number): number | undefined =>
    idx >= 0 && idx < bands.length ? bands[idx].endCol : undefined;

  let mapping: PdfColumnMapping | null = null;
  if (plan.mode === "split" && plan.debitIdx !== null && plan.creditIdx !== null) {
    const d = anchorOf(plan.debitIdx);
    const cr = anchorOf(plan.creditIdx);
    if (d !== undefined && cr !== undefined) mapping = { mode: "split", debitAnchor: d, creditAnchor: cr };
  } else if (plan.mode === "single" || plan.mode === "balance") {
    const s = anchorOf(plan.singleIdx);
    if (s !== undefined) mapping = { mode: "single", singleAnchor: s };
  }
  if (!mapping) return null;

  // Preselect the description column at the most common first-inline-cell
  // start, so the mapper shows a concrete choice instead of "all text".
  const descCol = modalStartCol(candidates);
  if (descCol !== null) mapping.descAnchor = descCol;
  return mapping;
}

function modalStartCol(candidates: CandidateRow[]): number | null {
  const counts = new Map<number, number>();
  for (const c of candidates) {
    const first = inlineDescCells(c)[0];
    if (first === undefined) continue;
    const cell = c.cells.find((cc) => cc.text.trim() === first);
    if (!cell) continue;
    // Quantise to tolerance buckets so near-equal starts merge.
    const bucket = Math.round(cell.col / TEXT_TOL) * TEXT_TOL;
    counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
  }
  let best: number | null = null;
  let bestN = 0;
  for (const [b, n] of counts) if (n > bestN) { best = b; bestN = n; }
  return best;
}

// ── Detection API for the manual mapper UI ──────────────────────────────────

/**
 * Collect candidate rows and summarise their column geometry so a user can
 * manually assign debit / credit / description roles to columns the
 * automatic detector cannot decide (or decides wrongly).
 */
export function detectPdfColumns(pages: PdfPageLayout[], hint?: YearHint): PdfColumnDetection {
  const effHint = yearHintFromPages(pages) ?? hint;
  const lines = pages.flatMap((p) => p.lines);
  const { candidates } = collectCandidates(lines, effHint);

  const columns: DetectedColumn[] = [];

  // Numeric bands by right edge (all of them — including running balances;
  // the user decides what each column means).
  if (candidates.length) {
    const { bands, assigns } = clusterRows(candidates);
    bands.forEach((band, bi) => {
      const samples: string[] = [];
      let fillCount = 0;
      candidates.forEach((c, ri) => {
        c.numerics.forEach((n, hi) => {
          if (assigns[ri][hi] !== bi) return;
          fillCount++;
          if (samples.length < 3) samples.push(rawCellTextAtEnd(c, n.endCol));
        });
      });
      columns.push({ kind: "numeric", anchorCol: band.endCol, samples, fillCount });
    });

    // Text-column candidates: the first inline description cell per row,
    // bucketed by start column.
    const buckets = new Map<number, { samples: string[]; fillCount: number }>();
    for (const c of candidates) {
      const first = inlineDescCells(c)[0];
      if (first === undefined) continue;
      const cell = c.cells.find((cc) => cc.text.trim() === first);
      if (!cell) continue;
      const bucket = Math.round(cell.col / TEXT_TOL) * TEXT_TOL;
      const b = buckets.get(bucket) ?? { samples: [], fillCount: 0 };
      b.fillCount++;
      if (b.samples.length < 3 && !b.samples.includes(first)) b.samples.push(first);
      buckets.set(bucket, b);
    }
    for (const [anchorCol, b] of [...buckets].sort((a, z) => a[0] - z[0])) {
      if (b.fillCount < Math.max(2, candidates.length * 0.1)) continue;
      columns.push({ kind: "text", anchorCol, samples: b.samples, fillCount: b.fillCount });
    }
  }

  return {
    columns,
    // Trailing trim only: leading whitespace must survive so these lines stay
    // in the same character coordinate space as the column anchors above.
    previewLines: candidates.slice(0, 6).map((c) => c.raw.replace(/\s+$/, "")),
    rowCount: candidates.length,
  };
}

/** Recover the original cell text whose right edge sits at `endCol`. */
function rawCellTextAtEnd(c: CandidateRow, endCol: number): string {
  const cell = c.cells.find((cc) => cc.col + cc.text.trimEnd().length === endCol);
  return cell ? cell.text.trim() : "";
}

// ── Fingerprinting & saved profiles ─────────────────────────────────────────

/**
 * Stable identity of a statement layout: the sorted numeric-column anchors.
 * Column positions come from the PDF's own character grid, so the same bank
 * format yields the same anchors across statements (±tolerance absorbed by
 * {@link profileMatches}).
 */
export function fingerprintColumns(detection: PdfColumnDetection): string {
  const nums = detection.columns
    .filter((c) => c.kind === "numeric")
    .map((c) => Math.round(c.anchorCol / ANCHOR_TOL) * ANCHOR_TOL)
    .sort((a, b) => a - b);
  return nums.join(",");
}

/** A user-saved column mapping for a specific statement layout. */
export interface PdfImportProfile {
  id: string;
  /** User-facing name, e.g. "NAB Reward + Everyday". */
  label: string;
  createdAt: string;
  fingerprint: string;
  mapping: PdfColumnMapping;
}

/** Does a saved profile apply to this freshly-detected statement geometry? */
export function profileMatches(
  profile: PdfImportProfile,
  detection: PdfColumnDetection,
): boolean {
  const fp = fingerprintColumns(detection);
  if (fp === profile.fingerprint) return true;
  // Tolerant comparison: same count of numeric bands and every stored anchor
  // within one tolerance step of a detected anchor.
  const nums = detection.columns
    .filter((c) => c.kind === "numeric")
    .map((c) => c.anchorCol)
    .sort((a, b) => a - b);
  const saved = profile.fingerprint.split(",").filter(Boolean).map(Number).sort((a, b) => a - b);
  if (saved.length !== nums.length || !saved.length) return false;
  return saved.every((s, i) => Math.abs(s - nums[i]) <= ANCHOR_TOL * 2);
}

/** Serialize parsed rows to CSV text consumable by `parseCSV`/`inferColumns`. */
export function statementRowsToCsv(rows: ParsedStatementRow[]): string {
  const esc = (s: string) => (/[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);
  const out = ["Date,Description,Amount"];
  for (const r of rows) {
    // Emit explicit signs so scanAmountConvention sees a normal convention.
    out.push(`${r.dateISO},${esc(r.description)},${r.amount.toFixed(2)}`);
  }
  return out.join("\n") + "\n";
}
