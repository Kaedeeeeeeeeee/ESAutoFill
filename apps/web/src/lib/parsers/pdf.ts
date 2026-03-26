import pdfParse from "pdf-parse";

/** Extract text content from a PDF buffer */
export async function parsePdf(buffer: Buffer): Promise<string> {
  const data = await pdfParse(buffer);
  return data.text;
}
