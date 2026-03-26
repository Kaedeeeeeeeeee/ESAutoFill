import { parsePdf } from "./pdf";
import { parseDocx } from "./docx";
import { parseText } from "./text";

/** Parse an uploaded file buffer into raw text based on file type */
export async function parseFile(
  buffer: Buffer,
  fileType: "pdf" | "docx" | "txt"
): Promise<string> {
  switch (fileType) {
    case "pdf":
      return parsePdf(buffer);
    case "docx":
      return parseDocx(buffer);
    case "txt":
      return parseText(buffer);
  }
}
