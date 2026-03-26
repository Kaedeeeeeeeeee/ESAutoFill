import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

/**
 * Call Gemini 3.1 Flash Lite for fast, cheap classification tasks.
 * Returns parsed JSON response.
 */
export async function callGeminiFlash<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3.1-flash-lite-preview",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.1,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  return JSON.parse(text) as T;
}

/**
 * Call Gemini 3.1 Pro for high-quality content generation.
 * Returns parsed JSON response.
 */
export async function callGeminiPro<T>(
  systemPrompt: string,
  userMessage: string
): Promise<T> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.7,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
  });

  const text = result.response.text();
  return JSON.parse(text) as T;
}

/**
 * Call Gemini 3.1 Pro for plain text generation (not JSON).
 */
export async function callGeminiProText(
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const model = genAI.getGenerativeModel({
    model: "gemini-3-flash-preview",
    generationConfig: {
      temperature: 0.7,
    },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
    systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
  });

  return result.response.text();
}
