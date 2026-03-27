/** System prompt for single field generation */
export const CHAT_FILL_SYSTEM = `You generate Japanese ES (エントリーシート) content for a SINGLE field based on the user's response to a question.

RULES:
1. Write in Japanese (日本語), です/ます調.
2. If a character limit is specified, your output MUST be at or under that limit. Count every character (kanji, kana, punctuation) as 1.
3. Use the user's response as the primary input, combined with their profile data for context.
4. Do NOT fabricate information beyond what the user provided.
5. Structure the text professionally and naturally.

Output ONLY the generated text. No JSON, no explanation, no markdown.`;

/** System prompt for batch field generation from a single user response */
export const CHAT_FILL_BATCH_SYSTEM = `You generate Japanese ES (エントリーシート) content for MULTIPLE fields based on the user's combined response.

The user was asked to provide several pieces of missing information at once. Parse their response and generate appropriate content for each field.

RULES:
1. Write in Japanese (日本語), です/ます調 for essay fields.
2. Respect character limits strictly for each field.
3. For short fields (gender, birthday, etc.), extract the exact value from the user's response.
4. For essay fields (志望動機 etc.), generate professional ES text based on the user's keywords/notes.
5. If the user didn't provide info for a specific field, set content to empty string "".
6. For select/radio fields, return the matching option VALUE (not text).

Respond with JSON:
{
  "fills": [
    {
      "fieldIndex": number,
      "content": string,
      "charCount": number
    }
  ]
}`;

/** Build user message for single-field chat generation */
export function buildChatFillMessage(
  fieldCategory: string,
  fieldLabel: string,
  charLimit: number | null,
  userResponse: string,
  profile?: Record<string, unknown>,
  companyName?: string
): string {
  let msg = `## 入力対象フィールド
カテゴリ: ${fieldCategory}
ラベル: ${fieldLabel}`;

  if (charLimit) {
    msg += `\n文字数制限: ${charLimit}字以内`;
  }

  if (companyName) {
    msg += `\n対象企業: ${companyName}`;
  }

  msg += `\n\n## ユーザーの回答
${userResponse}`;

  if (profile) {
    msg += `\n\n## ユーザープロフィール（参考）
${JSON.stringify(profile, null, 2)}`;
  }

  return msg;
}

/** Build user message for batch field generation */
export function buildChatFillBatchMessage(
  fields: Array<{
    fieldIndex: number;
    fieldCategory: string;
    fieldLabel: string;
    charLimit: number | null;
    options?: Array<{ value: string; text: string }>;
  }>,
  userResponse: string,
  profile?: Record<string, unknown>
): string {
  const fieldList = fields
    .map((f) => {
      let desc = `- [${f.fieldIndex}] ${f.fieldLabel} (${f.fieldCategory})`;
      if (f.charLimit) desc += ` ※${f.charLimit}字以内`;
      if (f.options) desc += ` 選択肢: ${f.options.map((o) => o.text).join(" / ")}`;
      return desc;
    })
    .join("\n");

  let msg = `## 入力が必要なフィールド一覧
${fieldList}

## ユーザーの回答
${userResponse}`;

  if (profile) {
    msg += `\n\n## ユーザープロフィール（参考）
${JSON.stringify(profile, null, 2)}`;
  }

  return msg;
}
