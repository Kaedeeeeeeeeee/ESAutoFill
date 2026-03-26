import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

/**
 * Call Claude Sonnet for high-quality content generation.
 * Returns parsed JSON response.
 */
export async function callClaudeSonnet<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  // Extract JSON from response (may be wrapped in markdown code block)
  const jsonMatch = textBlock.text.match(/```json\s*([\s\S]*?)\s*```/) ||
    textBlock.text.match(/```\s*([\s\S]*?)\s*```/);
  const jsonStr = jsonMatch ? jsonMatch[1] : textBlock.text;

  return JSON.parse(jsonStr) as T;
}

/**
 * Call Claude Sonnet for plain text generation (not JSON).
 */
export async function callClaudeSonnetText(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude");
  }

  return textBlock.text;
}
