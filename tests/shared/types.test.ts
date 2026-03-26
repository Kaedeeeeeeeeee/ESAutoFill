import { describe, it, expect } from "vitest";
import {
  FIELD_CATEGORY_LABELS,
  BASIC_INFO_CATEGORIES,
  CONTENT_CATEGORIES,
  COMMON_CHAR_LIMITS,
} from "@es-autofill/shared";

describe("Field categories", () => {
  it("all basic info categories have labels", () => {
    for (const cat of BASIC_INFO_CATEGORIES) {
      expect(FIELD_CATEGORY_LABELS[cat]).toBeDefined();
      expect(FIELD_CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it("all content categories have labels", () => {
    for (const cat of CONTENT_CATEGORIES) {
      expect(FIELD_CATEGORY_LABELS[cat]).toBeDefined();
      expect(FIELD_CATEGORY_LABELS[cat].length).toBeGreaterThan(0);
    }
  });

  it("basic info and content categories do not overlap", () => {
    const overlap = BASIC_INFO_CATEGORIES.filter((c) =>
      (CONTENT_CATEGORIES as readonly string[]).includes(c)
    );
    expect(overlap).toHaveLength(0);
  });

  it("common char limits are sorted ascending", () => {
    for (let i = 1; i < COMMON_CHAR_LIMITS.length; i++) {
      expect(COMMON_CHAR_LIMITS[i]).toBeGreaterThan(COMMON_CHAR_LIMITS[i - 1]);
    }
  });
});
