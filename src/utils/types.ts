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

// ========== SHARED TYPES ==========

export type DateFormatOption = "dd/mm/yyyy" | "mm/dd/yyyy" | "yyyy-mm-dd" | "dd-mmm-yyyy";

export type TransactionType = "income" | "spending";

export type RecurringFrequency =
  | "daily"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "quarterly"
  | "yearly";

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  type: TransactionType;
  amount: number;
  category: string;
  tags: string[];
  recurring?: boolean;
  frequency?: RecurringFrequency;
  recursions?: number;
  description: string;
  endDate?: string;
  source?: string;
  /** Links all occurrences of one recurring series (the anchor's id). */
  seriesId?: string;
}

export type ToastKind = "success" | "info" | "warning" | "error";
export type DescMode = "none" | "replace" | "prepend" | "append";

export type ParsedQuery = {
  text: string[]; // plain includes
  not: string[]; // plain excludes  (e.g. -starbucks)
  type?: "" | TransactionType;
  category?: string | "";
  tagsInclude: string[];
  tagsExclude: string[];
  source?: string | "";
  min?: number;
  max?: number;
  start?: string; // ISO
  end?: string; // ISO
  amount?: number; // exact match (from amount:50 or $50)
};

export type InferredCols = {
  date: number;
  amount?: number;

  // Split amount style (CommBank, NAB, some Westpac exports)
  debit?: number;
  credit?: number;

  // Direction / DR-CR / IN-OUT indicator (Wise Desktop has "Direction")
  drcr?: number;

  // Preferred description columns (ordered by priority)
  desc: number[];

  // Generic currency column (if any)
  currency?: number;

  // Wise Desktop flattened source/target columns
  srcAmt?: number;
  srcCur?: number;
  tgtAmt?: number;
  tgtCur?: number;

  // Sheet detection via ID headers
  desktopId?: number;   // header "ID" (Wise Desktop)
  mobileId?: number;    // header "TransferWise ID" (Wise Mobile)

  // Amount convention detected after scanning rows
  // "normal"           → positive = income, negative = spending
  // "expensesPositive" → positive = spending (some bank exports)
  amountConvention?: "normal" | "expensesPositive";
};
