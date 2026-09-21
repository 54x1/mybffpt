<!--
  mybffpt — myBudget Forecaster
  Copyright (C) 2026 54x1

  SPDX-License-Identifier: AGPL-3.0-or-later

  This file is part of mybffpt, free software licensed under the GNU Affero
  General Public License v3.0 or later. See the LICENSE file in the project
  root, or <https://www.gnu.org/licenses/agpl-3.0.html>, for details.
-->
<template>
  <!-- Manual PDF statement column mapper -->
  <dialog ref="dialogRef" class="modal" aria-modal="true" aria-labelledby="pdfMapHeading" @close="$emit('close')">
    <div class="modal-box w-full max-w-2xl">
      <h3 id="pdfMapHeading" class="font-bold text-lg mb-1">
        🧭 Map Statement Columns
      </h3>
      <p class="text-sm opacity-70 mb-4 break-all">
        {{ filename }} — {{ detection.rowCount }} transaction-like rows found.
        Tell us which column holds what, and we'll import them.
      </p>

      <div v-if="matchedProfileLabel" class="alert alert-success text-xs mb-3">
        <span>Saved layout <strong>{{ matchedProfileLabel }}</strong> applied — adjust below if needed.</span>
      </div>

      <div v-if="detection.rowCount === 0" class="alert alert-warning text-sm mb-4">
        <span>No transaction-like rows were found in this PDF (lines starting with a date).
          It may be a scanned image or an unusual layout — try exporting a CSV statement instead.</span>
      </div>

      <!-- Amount mode -->
      <div class="form-control mb-3">
        <label class="label pt-0">
          <span class="label-text font-medium text-sm">Amount columns</span>
        </label>
        <div class="role-radios" role="radiogroup" aria-label="Amount column mode">
          <label class="cursor-pointer flex items-center gap-2 text-sm">
            <input type="radio" name="pdfMapMode" value="split" v-model="mode" class="radio radio-sm" />
            Separate debit and credit columns (money out / money in)
          </label>
          <label class="cursor-pointer flex items-center gap-2 text-sm">
            <input type="radio" name="pdfMapMode" value="single" v-model="mode" class="radio radio-sm" />
            One amount column (signed, or positive = spending)
          </label>
        </div>
      </div>

      <!-- Role assignment selects -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
        <template v-if="mode === 'split'">
          <div class="form-control">
            <label class="label py-1" for="pdfMapDebit"><span class="label-text text-sm">Money out (debit)</span></label>
            <select id="pdfMapDebit" class="select select-bordered select-sm w-full" v-model.number="debitAnchor">
              <option disabled :value="-1">Choose column…</option>
              <option v-for="col in numericColumns" :key="'d' + col.anchorCol" :value="col.anchorCol">
                {{ colLabel(col) }}
              </option>
            </select>
          </div>
          <div class="form-control">
            <label class="label py-1" for="pdfMapCredit"><span class="label-text text-sm">Money in (credit)</span></label>
            <select id="pdfMapCredit" class="select select-bordered select-sm w-full" v-model.number="creditAnchor">
              <option disabled :value="-1">Choose column…</option>
              <option v-for="col in numericColumns" :key="'c' + col.anchorCol" :value="col.anchorCol">
                {{ colLabel(col) }}
              </option>
            </select>
          </div>
        </template>
        <template v-else>
          <div class="form-control sm:col-span-2">
            <label class="label py-1" for="pdfMapSingle"><span class="label-text text-sm">Amount column</span></label>
            <select id="pdfMapSingle" class="select select-bordered select-sm w-full" v-model.number="singleAnchor">
              <option disabled :value="-1">Choose column…</option>
              <option v-for="col in numericColumns" :key="'s' + col.anchorCol" :value="col.anchorCol">
                {{ colLabel(col) }}
              </option>
            </select>
          </div>
        </template>

        <div class="form-control sm:col-span-2">
          <label class="label py-1" for="pdfMapDesc"><span class="label-text text-sm">Description column</span></label>
          <select id="pdfMapDesc" class="select select-bordered select-sm w-full" v-model.number="descAnchor">
            <option :value="-2">All text between the date and the amounts</option>
            <option v-for="col in textColumns" :key="'t' + col.anchorCol" :value="col.anchorCol">
              {{ colLabel(col) }}
            </option>
          </select>
        </div>
      </div>

      <!-- Raw statement lines with live column markers, so the user can see
           exactly where each chosen column lands on their own layout. -->
      <div v-if="rawStatement" class="mb-4">
        <p class="text-xs font-semibold mb-1">Raw statement — pick columns that line up</p>
        <div
          class="overflow-x-auto rounded border border-base-300 bg-base-200/50 p-2 font-mono text-[11px] leading-tight"
          style="white-space: pre"
          role="img"
          :aria-label="rawStatementAria"
        >
          <span v-if="rawStatement.ruler.trim()" class="block font-bold text-primary">{{ rawStatement.ruler }}</span>
          <span v-for="(ln, i) in rawStatement.lines" :key="'r' + i" class="block">{{ ln }}</span>
        </div>
        <p class="text-[10px] opacity-70 mt-1">
          <span class="font-bold text-primary">D</span> debit ·
          <span class="font-bold text-primary">C</span> credit ·
          <span class="font-bold text-primary">$</span> amount ·
          <span class="font-bold text-primary">T</span> description start.
          Amount markers sit at the right edge of each column.
        </p>
      </div>

      <!-- Live preview -->
      <div class="mb-4">
        <p class="text-xs font-semibold mb-1">Preview (first {{ Math.min(preview.rows.length, 8) }} of {{ preview.rows.length }})</p>
        <div v-if="preview.rows.length" class="overflow-x-auto rounded border border-base-300">
          <table class="table table-xs w-full">
            <thead>
              <tr><th>Date</th><th>Description</th><th class="text-right">Amount</th></tr>
            </thead>
            <tbody>
              <tr v-for="(r, i) in preview.rows.slice(0, 8)" :key="i">
                <td class="whitespace-nowrap">{{ r.dateISO }}</td>
                <td class="max-w-[16rem] truncate" :title="r.description">{{ r.description }}</td>
                <td class="text-right whitespace-nowrap" :class="r.amount < 0 ? 'text-error' : 'text-success'">
                  {{ r.amount.toFixed(2) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <p v-else class="text-xs text-warning">Nothing matches this selection yet — pick different columns.</p>
      </div>

      <!-- Save as reusable layout -->
      <div class="form-control">
        <label class="flex items-center gap-2 cursor-pointer text-sm">
          <input type="checkbox" class="checkbox checkbox-sm" v-model="saveLayout" />
          Remember this layout for future imports of this statement format
        </label>
        <input v-if="saveLayout" v-model="layoutLabel" type="text" class="input input-bordered input-sm mt-2"
          placeholder="e.g. NAB Reward + Everyday" aria-label="Saved layout name" maxlength="60" />
      </div>

      <div class="modal-action">
        <button type="button" class="btn btn-ghost" @click="dialogRef?.close()">Cancel</button>
        <button type="button" class="btn btn-primary" :disabled="!mappingValid" @click="confirmImport">
          Import {{ preview.rows.length > 0 ? `(${preview.rows.length})` : "" }}
        </button>
      </div>
    </div>
    <form method="dialog" class="modal-backdrop">
      <button>close</button>
    </form>
  </dialog>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useDialogA11y } from "../composables/useDialogA11y";
import type { PdfPageLayout } from "../utils/pdf";
import {
  pdfPagesToStatement,
  type DetectedColumn,
  type PdfColumnDetection,
  type PdfColumnMapping,
  type YearHint,
} from "../utils/pdfStatement";

const dialogRef = ref<HTMLDialogElement | null>(null);
const { openDialog } = useDialogA11y(dialogRef);
onMounted(openDialog);

const props = defineProps<{
  filename: string;
  /** Extracted page layout — used to re-parse live as the selection changes. */
  pages: PdfPageLayout[];
  detection: PdfColumnDetection;
  hint?: YearHint | null;
  /** Preselect from auto-detection or an applied saved profile (null = guess). */
  initialMapping?: PdfColumnMapping | null;
  /** Label of a saved profile auto-applied to this file, if any. */
  matchedProfileLabel?: string | null;
}>();

const emit = defineEmits<{
  (e: "confirm", mapping: PdfColumnMapping, saveLabel: string | null): void;
  (e: "close"): void;
}>();

// Sentinel values for the selects (anchors are always ≥ 0).
const NONE = -1; // role unassigned
const DESC_ALL = -2; // description = all text before amounts

const numericColumns = computed(() =>
  props.detection.columns.filter((c) => c.kind === "numeric"),
);
const textColumns = computed(() =>
  props.detection.columns.filter((c) => c.kind === "text"),
);

// Initial selection: the parent's suggestion (saved profile or auto-detected
// geometry), else sensible defaults from the detected columns.
const init = props.initialMapping ?? null;
const mode = ref<"single" | "split">(init?.mode ?? (numericColumns.value.length >= 2 ? "split" : "single"));

function nearestNum(anchor: number | undefined, exclude?: number): number {
  if (anchor === undefined) return NONE;
  let best = NONE;
  let bestDist = Infinity;
  for (const col of numericColumns.value) {
    if (exclude !== undefined && col.anchorCol === exclude) continue;
    const d = Math.abs(col.anchorCol - anchor);
    if (d < bestDist) { best = col.anchorCol; bestDist = d; }
  }
  return best;
}

const debitAnchor = ref<number>(
  init?.mode === "split" ? nearestNum(init.debitAnchor, init.creditAnchor) : NONE,
);
const creditAnchor = ref<number>(
  init?.mode === "split" ? nearestNum(init.creditAnchor, init.debitAnchor) : NONE,
);
const singleAnchor = ref<number>(
  init?.mode === "single" && init.singleAnchor !== undefined
    ? nearestNum(init.singleAnchor)
    : guessSingle(),
);

/** Default: the numeric column filled on most rows (rightmost on ties). */
function guessSingle(): number {
  let best = NONE;
  let bestFill = -1;
  for (const col of numericColumns.value) {
    if (col.fillCount >= bestFill) { best = col.anchorCol; bestFill = col.fillCount; }
  }
  return best;
}

// Split default when there's no suggestion: the two rightmost numeric bands.
if (mode.value === "split" && debitAnchor.value === NONE && creditAnchor.value === NONE) {
  const cols = numericColumns.value;
  if (cols.length >= 2) {
    debitAnchor.value = cols[cols.length - 2].anchorCol;
    creditAnchor.value = cols[cols.length - 1].anchorCol;
  }
}

const descAnchor = ref<number>(
  init?.descAnchor !== undefined ? nearestText(init.descAnchor) : DESC_ALL,
);

function nearestText(anchor: number): number {
  let best = DESC_ALL;
  let bestDist = Infinity;
  for (const col of textColumns.value) {
    const d = Math.abs(col.anchorCol - anchor);
    if (d < bestDist) { best = col.anchorCol; bestDist = d; }
  }
  return bestDist <= 8 ? best : DESC_ALL;
}

function colLabel(col: DetectedColumn): string {
  const pos = col.kind === "numeric" ? `col ${Math.round(col.anchorCol)} (right edge)` : `col ${Math.round(col.anchorCol)}`;
  const samples = col.samples.slice(0, 3).join(" · ");
  return `${pos} — ${samples || "no samples"} (${col.fillCount} rows)`;
}

const currentMapping = computed<PdfColumnMapping | null>(() => {
  if (mode.value === "split") {
    if (debitAnchor.value === NONE || creditAnchor.value === NONE) return null;
    if (debitAnchor.value === creditAnchor.value) return null;
    const m: PdfColumnMapping = { mode: "split", debitAnchor: debitAnchor.value, creditAnchor: creditAnchor.value };
    if (descAnchor.value !== DESC_ALL) m.descAnchor = descAnchor.value;
    return m;
  }
  if (singleAnchor.value === NONE) return null;
  const m: PdfColumnMapping = { mode: "single", singleAnchor: singleAnchor.value };
  if (descAnchor.value !== DESC_ALL) m.descAnchor = descAnchor.value;
  return m;
});

// Live preview: re-parse the pages with the current selection. Cheap —
// candidate collection is linear over page lines and only runs while this
// modal is open.
const preview = computed(() => {
  const m = currentMapping.value;
  if (!m) return { rows: [] as { dateISO: string; description: string; amount: number }[] };
  try {
    return pdfPagesToStatement(props.pages, props.hint ?? undefined, m);
  } catch {
    return { rows: [] as { dateISO: string; description: string; amount: number }[] };
  }
});

const mappingValid = computed(() => currentMapping.value !== null && preview.value.rows.length > 0);

// ── Raw statement view with live column markers ─────────────────────────────
// previewLines keep their leading whitespace, so character positions line up
// with the anchors: numeric anchorCol is a right edge (marker under the last
// digit), text anchorCol is a start column. The ruler shows the current
// selection in bold; faint dots mark every other detected numeric band.
const rawStatement = computed<{ ruler: string; lines: string[] } | null>(() => {
  const lines = props.detection.previewLines;
  if (!lines.length) return null;

  const marks = new Map<number, string>();
  const put = (col: number, ch: string) => {
    const i = Math.max(0, Math.round(col));
    marks.set(i, ch);
  };

  // Faint guide: every numeric band's right edge.
  const guideCols = new Set<number>();
  for (const col of numericColumns.value) {
    guideCols.add(Math.max(0, Math.round(col.anchorCol) - 1));
  }

  const m = currentMapping.value;
  if (m) {
    if (m.mode === "split") {
      if (m.debitAnchor !== undefined) put(m.debitAnchor - 1, "D");
      if (m.creditAnchor !== undefined) put(m.creditAnchor - 1, "C");
    } else if (m.singleAnchor !== undefined) {
      put(m.singleAnchor - 1, "$");
    }
    if (m.descAnchor !== undefined) put(m.descAnchor, "T");
  }

  const width = Math.max(0, ...lines.map((l) => l.length), ...[...guideCols], ...[...marks.keys()].map((i) => i + 1));
  let ruler = "";
  for (let i = 0; i < width; i++) {
    ruler += marks.get(i) ?? (guideCols.has(i) ? "\u00b7" : " ");
  }
  return { ruler, lines };
});

const rawStatementAria = computed(() => {
  const rs = rawStatement.value;
  if (!rs) return "";
  const m = currentMapping.value;
  const parts: string[] = [];
  if (m?.mode === "split") {
    if (m.debitAnchor !== undefined) parts.push(`debit column at position ${m.debitAnchor}`);
    if (m.creditAnchor !== undefined) parts.push(`credit column at position ${m.creditAnchor}`);
  } else if (m?.singleAnchor !== undefined) {
    parts.push(`amount column at position ${m.singleAnchor}`);
  }
  if (m?.descAnchor !== undefined) parts.push(`description starts at position ${m.descAnchor}`);
  return `Raw statement text, first ${rs.lines.length} transaction lines.${parts.length ? " Markers: " + parts.join(", ") + "." : ""}`;
});

const saveLayout = ref(false);
const layoutLabel = ref("");

function confirmImport() {
  const m = currentMapping.value;
  if (!m) return;
  const label = saveLayout.value ? layoutLabel.value.trim() || props.filename : null;
  emit("confirm", m, label);
}
</script>

<style scoped>
.role-radios {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
</style>
