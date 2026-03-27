import { describe, it, expect, beforeAll } from "vitest";

/**
 * Integration tests for the full API pipeline.
 * Requires: Next.js dev server running on localhost:3000
 * Requires: Valid .env.local with Supabase + Gemini keys
 */

const API_BASE = "http://localhost:3000";
const SUPABASE_URL = "https://rudqwrfkcldxoxgnuleq.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ1ZHF3cmZrY2xkeG94Z251bGVxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0ODA1MzUsImV4cCI6MjA5MDA1NjUzNX0.BRqqjRykoZOhXNrXTH9TKk1ZCRUMAubCUfoxBto3Tvs";

let authToken: string;

async function apiCall(path: string, method: string, body?: unknown) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${authToken}`,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json() };
}

beforeAll(async () => {
  // Login to get auth token
  const res = await fetch(
    `${SUPABASE_URL}/auth/v1/token?grant_type=password`,
    {
      method: "POST",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "testpassword123",
      }),
    }
  );
  const data = await res.json();
  authToken = data.access_token;
  expect(authToken).toBeTruthy();
});

describe("Auth", () => {
  it("rejects requests without token", async () => {
    const res = await fetch(`${API_BASE}/api/profile`, {
      headers: { "Content-Type": "application/json" },
    });
    expect(res.status).toBe(401);
  });

  it("accepts requests with valid token", async () => {
    const { status } = await apiCall("/api/profile", "GET");
    expect(status).toBe(200);
  });
});

describe("POST /api/form/classify", () => {
  it("classifies basic ES fields correctly", async () => {
    const { status, data } = await apiCall("/api/form/classify", "POST", {
      fields: [
        {
          index: 0,
          selector: "#name",
          label: "氏名",
          surroundingText: "氏名（漢字）",
          charLimit: null,
          inputType: "input",
          currentValue: "",
        },
        {
          index: 1,
          selector: "#gakuchika",
          label: "",
          surroundingText:
            "学生時代に最も力を入れたことを400字以内で記入してください",
          charLimit: 400,
          inputType: "textarea",
          currentValue: "",
        },
        {
          index: 2,
          selector: "#motivation",
          label: "志望動機",
          surroundingText: "当社を志望する理由を600字以内でお書きください",
          charLimit: 600,
          inputType: "textarea",
          currentValue: "",
        },
      ],
    });

    expect(status).toBe(200);
    expect(data.classifications).toHaveLength(3);

    const byIndex = Object.fromEntries(
      data.classifications.map((c: { index: number }) => [c.index, c])
    );
    expect(byIndex[0].category).toBe("basic_info_name");
    expect(byIndex[1].category).toBe("gakuchika");
    expect(byIndex[1].char_limit).toBe(400);
    expect(byIndex[2].category).toBe("shiboudouki");
    expect(byIndex[2].char_limit).toBe(600);
  });

  it("classifies non-ES fields as non_es", async () => {
    const { data } = await apiCall("/api/form/classify", "POST", {
      fields: [
        {
          index: 0,
          selector: "#search",
          label: "検索",
          surroundingText: "サイト内検索",
          charLimit: null,
          inputType: "input",
          currentValue: "",
        },
      ],
    });

    expect(data.classifications[0].category).toBe("non_es");
  });

  it("detects self_pr and weakness categories", async () => {
    const { data } = await apiCall("/api/form/classify", "POST", {
      fields: [
        {
          index: 0,
          selector: "#pr",
          label: "自己PR",
          surroundingText: "あなたの強みを200字以内でアピールしてください",
          charLimit: 200,
          inputType: "textarea",
          currentValue: "",
        },
        {
          index: 1,
          selector: "#weak",
          label: "",
          surroundingText: "あなたの短所・改善したい点を教えてください（200字以内）",
          charLimit: 200,
          inputType: "textarea",
          currentValue: "",
        },
      ],
    });

    const byIndex = Object.fromEntries(
      data.classifications.map((c: { index: number }) => [c.index, c])
    );
    expect(byIndex[0].category).toBe("self_pr");
    expect(byIndex[1].category).toBe("weakness");
  });
});

describe("POST /api/form/generate", () => {
  it("generates content for classified fields", { timeout: 120_000 }, async () => {
    const { status, data } = await apiCall("/api/form/generate", "POST", {
      classifications: [
        {
          index: 0,
          selector: "#name",
          category: "basic_info_name",
          confidence: 1,
          charLimit: null,
        },
        {
          index: 1,
          selector: "#gakuchika",
          category: "gakuchika",
          confidence: 1,
          charLimit: 400,
        },
        {
          index: 2,
          selector: "#pr",
          category: "self_pr",
          confidence: 1,
          charLimit: 200,
        },
      ],
      profileId: "",
    });

    expect(status).toBe(200);
    expect(data.fills).toBeDefined();
    expect(data.fills.length).toBeGreaterThan(0);

    // Check gakuchika fill
    const gakuchika = data.fills.find(
      (f: { index: number }) => f.index === 1
    );
    if (gakuchika) {
      expect(gakuchika.content.length).toBeGreaterThan(0);
      // Char count should be within limit
      const charCount = [...gakuchika.content].length;
      expect(charCount).toBeLessThanOrEqual(400);
    }

    // Check self_pr fill
    const selfPr = data.fills.find(
      (f: { index: number }) => f.index === 2
    );
    if (selfPr) {
      const charCount = [...selfPr.content].length;
      expect(charCount).toBeLessThanOrEqual(200);
    }
  });

  it("returns 404 without profile", async () => {
    // This would need a user with no profile — skipping for now
    // since our test user already has a profile
  });
});

describe("GET /api/profile", () => {
  it("returns profile and experiences", async () => {
    const { status, data } = await apiCall("/api/profile", "GET");

    expect(status).toBe(200);
    expect(data.profile).toBeDefined();
    expect(data.profile.university).toBe("東京大学");
    expect(data.profile.faculty).toBe("経済学部");
    expect(data.experiences).toBeInstanceOf(Array);
    expect(data.experiences.length).toBeGreaterThan(0);
  });
});

describe("Full pipeline: classify → generate", () => {
  it("runs the complete ES form pipeline", { timeout: 120_000 }, async () => {
    // Simulated ES form fields (like our test-es-form.html)
    const fields = [
      {
        index: 0,
        selector: "#fullname",
        label: "氏名（漢字）",
        surroundingText: "氏名（漢字）",
        charLimit: null,
        inputType: "input",
        currentValue: "",
      },
      {
        index: 1,
        selector: "#furigana",
        label: "氏名（フリガナ）",
        surroundingText: "氏名（フリガナ）",
        charLimit: null,
        inputType: "input",
        currentValue: "",
      },
      {
        index: 2,
        selector: "#university",
        label: "大学名",
        surroundingText: "大学名",
        charLimit: null,
        inputType: "input",
        currentValue: "",
      },
      {
        index: 3,
        selector: "#gakuchika",
        label: "学生時代に最も力を入れたことを教えてください",
        surroundingText:
          "学生時代に最も力を入れたことを教えてください 400字以内でご記入ください",
        charLimit: 400,
        inputType: "textarea",
        currentValue: "",
      },
      {
        index: 4,
        selector: "#self_pr",
        label: "自己PRをお願いします",
        surroundingText:
          "自己PRをお願いします あなたの強みを200字以内でアピールしてください",
        charLimit: 200,
        inputType: "textarea",
        currentValue: "",
      },
      {
        index: 5,
        selector: "#motivation",
        label: "志望動機",
        surroundingText: "当社を志望する理由を600字以内でお書きください",
        charLimit: 600,
        inputType: "textarea",
        currentValue: "",
      },
      {
        index: 6,
        selector: "#weakness",
        label: "",
        surroundingText:
          "あなたの短所・改善したい点を教えてください 200字以内",
        charLimit: 200,
        inputType: "textarea",
        currentValue: "",
      },
      {
        index: 7,
        selector: "#site-search",
        label: "",
        surroundingText: "サイト内検索...",
        charLimit: null,
        inputType: "input",
        currentValue: "",
      },
    ];

    // Step 1: Classify
    console.log("  → Classifying fields...");
    const classifyRes = await apiCall("/api/form/classify", "POST", { fields });
    expect(classifyRes.status).toBe(200);

    const classifications = classifyRes.data.classifications;
    console.log(
      "  → Classifications:",
      classifications.map(
        (c: { index: number; category: string }) =>
          `[${c.index}] ${c.category}`
      )
    );

    // Verify search field is filtered
    const searchField = classifications.find(
      (c: { index: number }) => c.index === 7
    );
    expect(searchField?.category).toBe("non_es");

    // Filter ES fields
    const esFields = classifications.filter(
      (c: { category: string }) => c.category !== "non_es"
    );
    expect(esFields.length).toBeGreaterThanOrEqual(5);

    // Step 2: Generate
    console.log("  → Generating content...");
    const generateRes = await apiCall("/api/form/generate", "POST", {
      classifications,
      profileId: "",
    });
    expect(generateRes.status).toBe(200);

    const fills = generateRes.data.fills;
    console.log(`  → Generated ${fills.length} fills`);

    // Verify fills
    for (const fill of fills) {
      const classification = classifications.find(
        (c: { index: number }) => c.index === fill.index
      );
      if (!classification) continue;

      const charCount = [...fill.content].length;
      console.log(
        `  → [${fill.index}] ${classification.category}: ${charCount} chars`
      );

      // Check character limits are respected (20% tolerance for AI generation)
      if (classification.char_limit) {
        expect(charCount).toBeLessThanOrEqual(
          classification.char_limit * 1.2
        );
      }

      // Content should not be empty for text fields (except shiboudouki without company context)
      if (
        ["gakuchika", "self_pr", "weakness"].includes(classification.category)
      ) {
        expect(fill.content.length).toBeGreaterThan(0);
      }
      // 志望動機 may need user input when no company context is provided
      if (classification.category === "shiboudouki" && fill.content.length === 0) {
        expect(fill.needsInput).toBe(true);
      }
    }

    console.log("  ✓ Full pipeline passed");
  });
});

describe("Select field handling", () => {
  it("classifies select with options and generates correct value", { timeout: 120_000 }, async () => {
    // Classify a select field with options
    const classifyRes = await apiCall("/api/form/classify", "POST", {
      fields: [
        {
          index: 0,
          selector: "#graduation",
          label: "卒業予定年月",
          surroundingText: "卒業予定年月",
          charLimit: null,
          inputType: "select",
          currentValue: "",
          options: [
            { value: "2027-03", text: "2027年3月" },
            { value: "2027-09", text: "2027年9月" },
            { value: "2028-03", text: "2028年3月" },
          ],
        },
      ],
    });

    expect(classifyRes.status).toBe(200);
    const classification = classifyRes.data.classifications[0];
    expect(classification.category).toBe("basic_info_graduation");
    // Options should be passed through
    expect(classification.options).toBeDefined();
    expect(classification.options).toHaveLength(3);

    // Generate — should pick correct option based on profile (graduation_year: 2027)
    const generateRes = await apiCall("/api/form/generate", "POST", {
      classifications: classifyRes.data.classifications,
      profileId: "",
    });

    expect(generateRes.status).toBe(200);
    const fill = generateRes.data.fills[0];
    // Should contain "2027" since our test user graduates in 2027
    expect(fill.content).toContain("2027");
  });
});

describe("POST /api/chat", () => {
  it("generates content from user response", { timeout: 120_000 }, async () => {
    const { status, data } = await apiCall("/api/chat", "POST", {
      fieldCategory: "shiboudouki",
      fieldLabel: "志望動機",
      charLimit: 400,
      userResponse: "グローバル展開に興味がある。技術力が高く、社会に貢献できる企業だと思った。",
      companyName: "テスト商事",
    });

    expect(status).toBe(200);
    expect(data.content).toBeDefined();
    expect(data.content.length).toBeGreaterThan(0);
    expect(data.charCount).toBeLessThanOrEqual(400);
    console.log(`  → Chat generated 志望動機: ${data.charCount} chars`);
  });

  it("rejects empty response", async () => {
    const { status } = await apiCall("/api/chat", "POST", {
      fieldCategory: "shiboudouki",
      fieldLabel: "志望動機",
      charLimit: 400,
      userResponse: "",
    });

    expect(status).toBe(400);
  });

  it("generates multiple fields in batch mode", { timeout: 120_000 }, async () => {
    const { status, data } = await apiCall("/api/chat", "POST", {
      userResponse: "志望動機はグローバル展開に興味がある。性別は男性。2000年5月15日生まれ。",
      fields: [
        { fieldIndex: 0, fieldCategory: "shiboudouki", fieldLabel: "志望動機", charLimit: 400 },
        { fieldIndex: 1, fieldCategory: "basic_info_gender", fieldLabel: "性別", charLimit: null, options: [{ value: "male", text: "男性" }, { value: "female", text: "女性" }] },
        { fieldIndex: 2, fieldCategory: "basic_info_birthday_year", fieldLabel: "生年月日（年）", charLimit: null },
      ],
    });

    expect(status).toBe(200);
    expect(data.fills).toBeDefined();
    expect(data.fills.length).toBeGreaterThanOrEqual(2);

    console.log("  → Batch fills:", data.fills.map(
      (f: { fieldIndex: number; content: string; charCount: number }) =>
        `[${f.fieldIndex}] ${f.content.slice(0, 30)}... (${f.charCount}字)`
    ));

    // 志望動機 should have content
    const shiboudouki = data.fills.find((f: { fieldIndex: number }) => f.fieldIndex === 0);
    if (shiboudouki) {
      expect(shiboudouki.content.length).toBeGreaterThan(0);
      expect(shiboudouki.charCount).toBeLessThanOrEqual(400);
    }

    // Gender should be picked
    const gender = data.fills.find((f: { fieldIndex: number }) => f.fieldIndex === 1);
    if (gender) {
      expect(gender.content).toBeTruthy();
    }
  });
});

describe("Radio/Gender field classification", () => {
  it("classifies gender radio buttons", { timeout: 60_000 }, async () => {
    const { status, data } = await apiCall("/api/form/classify", "POST", {
      fields: [
        {
          index: 0,
          selector: "input[name='gender']",
          label: "",
          surroundingText: "性別 男性 女性 その他 無回答",
          charLimit: null,
          inputType: "radio",
          currentValue: "",
          options: [
            { value: "male", text: "男性" },
            { value: "female", text: "女性" },
            { value: "other", text: "その他" },
            { value: "no_answer", text: "無回答" },
          ],
        },
      ],
    });

    expect(status).toBe(200);
    expect(data.classifications[0].category).toBe("basic_info_gender");
    expect(data.classifications[0].options).toHaveLength(4);
  });

  it("classifies birthday select fields", { timeout: 60_000 }, async () => {
    const { status, data } = await apiCall("/api/form/classify", "POST", {
      fields: [
        {
          index: 0,
          selector: "#birth_year",
          label: "",
          surroundingText: "生年月日 年",
          charLimit: null,
          inputType: "select",
          currentValue: "",
          options: [
            { value: "2000", text: "2000" },
            { value: "2001", text: "2001" },
            { value: "2002", text: "2002" },
          ],
        },
        {
          index: 1,
          selector: "#birth_month",
          label: "",
          surroundingText: "月",
          charLimit: null,
          inputType: "select",
          currentValue: "",
          options: Array.from({ length: 12 }, (_, i) => ({
            value: String(i + 1),
            text: `${i + 1}`,
          })),
        },
      ],
    });

    expect(status).toBe(200);
    const categories = data.classifications.map((c: { category: string }) => c.category);
    // Should classify as birthday-related
    expect(
      categories.some((c: string) => c.startsWith("basic_info_birthday"))
    ).toBe(true);
  });
});
