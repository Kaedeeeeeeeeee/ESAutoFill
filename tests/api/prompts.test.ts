import { describe, it, expect } from "vitest";
import {
  FIELD_CLASSIFIER_SYSTEM,
  buildClassifyMessage,
} from "@/lib/ai/prompts/field-classifier";
import {
  CONTENT_GENERATOR_SYSTEM,
  buildGenerateMessage,
} from "@/lib/ai/prompts/content-generator";
import {
  CHAR_ADJUSTER_SYSTEM,
  buildAdjustMessage,
} from "@/lib/ai/prompts/char-adjuster";
import {
  PROFILE_PARSER_SYSTEM,
  buildParseMessage,
} from "@/lib/ai/prompts/profile-parser";
import {
  CHAT_FILL_BATCH_SYSTEM,
  buildChatFillBatchMessage,
} from "@/lib/ai/prompts/chat-fill";

describe("Field classifier prompt", () => {
  it("system prompt contains all categories", () => {
    const categories = [
      "basic_info_name",
      "gakuchika",
      "self_pr",
      "shiboudouki",
      "weakness",
      "career_goal",
      "non_es",
    ];
    for (const cat of categories) {
      expect(FIELD_CLASSIFIER_SYSTEM).toContain(`"${cat}"`);
    }
  });

  it("builds valid JSON message", () => {
    const message = buildClassifyMessage([
      {
        index: 0,
        label: "氏名",
        surroundingText: "氏名（漢字）",
        charLimit: null,
        inputType: "input",
      },
    ]);
    const parsed = JSON.parse(message);
    expect(parsed.fields).toHaveLength(1);
    expect(parsed.fields[0].index).toBe(0);
  });
});

describe("Content generator prompt", () => {
  it("system prompt specifies Japanese output", () => {
    expect(CONTENT_GENERATOR_SYSTEM).toContain("日本語");
    expect(CONTENT_GENERATOR_SYSTEM).toContain("です/ます調");
  });

  it("builds message with all required sections", () => {
    const message = buildGenerateMessage(
      [{ index: 0, category: "gakuchika", charLimit: 400 }],
      { university: "東京大学" },
      [{ title: "サークル活動" }],
      { company_name: "テスト企業" }
    );
    const parsed = JSON.parse(message);
    expect(parsed.fields_to_fill).toHaveLength(1);
    expect(parsed.user_profile).toBeDefined();
    expect(parsed.experiences).toBeDefined();
    expect(parsed.company_context).toBeDefined();
  });

  it("handles null company context", () => {
    const message = buildGenerateMessage(
      [{ index: 0, category: "self_pr", charLimit: 200 }],
      {},
      []
    );
    const parsed = JSON.parse(message);
    expect(parsed.company_context).toBeNull();
  });
});

describe("Char adjuster prompt", () => {
  it("system prompt specifies character counting rules", () => {
    expect(CHAR_ADJUSTER_SYSTEM).toContain("です/ます調");
  });

  it("builds message with original text and target", () => {
    const msg = buildAdjustMessage("テスト文章です。", 100);
    expect(msg).toContain("8文字");
    expect(msg).toContain("100文字");
  });
});

describe("Profile parser prompt", () => {
  it("system prompt defines STAR structure", () => {
    expect(PROFILE_PARSER_SYSTEM).toContain("situation");
    expect(PROFILE_PARSER_SYSTEM).toContain("task");
    expect(PROFILE_PARSER_SYSTEM).toContain("action");
    expect(PROFILE_PARSER_SYSTEM).toContain("result");
  });

  it("builds message with raw text", () => {
    const msg = buildParseMessage("履歴書の内容テスト");
    expect(msg).toContain("履歴書の内容テスト");
  });
});

describe("Chat fill batch prompt", () => {
  it("system prompt specifies JSON output format", () => {
    expect(CHAT_FILL_BATCH_SYSTEM).toContain("fills");
    expect(CHAT_FILL_BATCH_SYSTEM).toContain("fieldIndex");
  });

  it("builds batch message with multiple fields", () => {
    const msg = buildChatFillBatchMessage(
      [
        { fieldIndex: 0, fieldCategory: "shiboudouki", fieldLabel: "志望動機", charLimit: 400 },
        { fieldIndex: 1, fieldCategory: "basic_info_gender", fieldLabel: "性別", charLimit: null, options: [{ value: "male", text: "男性" }, { value: "female", text: "女性" }] },
        { fieldIndex: 2, fieldCategory: "basic_info_birthday_year", fieldLabel: "生年月日（年）", charLimit: null },
      ],
      "グローバル展開に興味がある。男性。2000年生まれ。",
      { university: "東京大学" }
    );

    expect(msg).toContain("志望動機");
    expect(msg).toContain("性別");
    expect(msg).toContain("男性 / 女性");
    expect(msg).toContain("400字以内");
    expect(msg).toContain("グローバル展開");
    expect(msg).toContain("東京大学");
  });
});

describe("Field classifier - new categories", () => {
  it("system prompt includes gender and birthday categories", () => {
    expect(FIELD_CLASSIFIER_SYSTEM).toContain("basic_info_gender");
    expect(FIELD_CLASSIFIER_SYSTEM).toContain("basic_info_birthday");
    expect(FIELD_CLASSIFIER_SYSTEM).toContain("basic_info_address");
  });
});
