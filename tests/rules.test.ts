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

import { describe, it, expect } from "vitest";
import { autoCategoryFor, autoTagsFor, autoMergeTags } from "../src/utils/rules";

describe("autoCategoryFor", () => {
  it("matches grocery merchants case-insensitively", () => {
    expect(autoCategoryFor("WOOLWORTHS METRO 1234")).toBe("Grocery");
    expect(autoCategoryFor("Coles Online #99")).toBe("Grocery");
    expect(autoCategoryFor("aldi store")).toBe("Grocery");
  });

  it("matches restaurant / takeaway merchants", () => {
    expect(autoCategoryFor("MCDONALD'S TOWN HALL")).toBe("Restaurant & Takeaway");
    expect(autoCategoryFor("UBEREATS order")).toBe("Restaurant & Takeaway");
    expect(autoCategoryFor("nandos")).toBe("Restaurant & Takeaway");
  });

  it("returns empty string when no rule matches", () => {
    expect(autoCategoryFor("SALARY PAYMENT")).toBe("");
    expect(autoCategoryFor("")).toBe("");
  });
});

describe("autoTagsFor", () => {
  it("applies a category-scoped tag when the category matches", () => {
    expect(autoTagsFor("COLES ONLINE #12345", "Grocery")).toEqual(["coles"]);
  });

  it("skips a scoped rule whose category does not match", () => {
    // The coles rule is scoped to Grocery; a mismatched category suppresses it.
    expect(autoTagsFor("COLES ONLINE #12345", "Restaurant & Takeaway")).toEqual([]);
  });

  it("returns sorted, de-duplicated tags", () => {
    const tags = autoTagsFor("WOOLWORTHS COLES ALDI IGA COSTCO", "Grocery");
    expect(tags).toContain("coles");
    expect(tags).toContain("woolworths");
    expect(tags).toContain("aldi");
    // sorted alphabetically
    const sorted = [...tags].sort();
    expect(tags).toEqual(sorted);
  });

  it("returns empty for unmatched descriptions", () => {
    expect(autoTagsFor("SOME RANDOM MERCHANT", "Grocery")).toEqual([]);
  });
});

describe("autoMergeTags", () => {
  it("merges, sorts and de-duplicates case-insensitively", () => {
    expect(autoMergeTags(["Banana", "apple"], ["APPLE", "cherry"])).toEqual([
      "apple",
      "Banana",
      "cherry",
    ]);
  });

  it("returns existing tags unchanged when add is empty", () => {
    expect(autoMergeTags(["a", "b"], [])).toEqual(["a", "b"]);
  });

  it("tolerates nullish inputs", () => {
    expect(autoMergeTags(undefined as unknown as string[], ["x"])).toEqual(["x"]);
    expect(autoMergeTags(null as unknown as string[], [])).toEqual([]);
  });
});
