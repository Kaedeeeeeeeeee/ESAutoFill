/** Context extracted from a form field on the page */
export interface FieldContext {
  /** Unique CSS selector for this element */
  selector: string;
  /** Index in the form */
  index: number;
  /** Label text (from <label>, aria-label, placeholder) */
  label: string;
  /** Text from surrounding parent elements */
  surroundingText: string;
  /** Character limit (from maxlength or text pattern) */
  charLimit: number | null;
  /** Type of input element */
  inputType: "textarea" | "input" | "contenteditable" | "select" | "radio" | "checkbox";
  /** Current value if any */
  currentValue: string;
}

/** Form snapshot - all fields on a page */
export interface FormSnapshot {
  url: string;
  title: string;
  fields: FieldContext[];
  detectedAt: string;
}

/** AI classification result for a field */
export interface FieldClassification {
  selector: string;
  index: number;
  category: ESFieldCategory;
  confidence: number;
  charLimit: number | null;
}

/** ES field categories */
export type ESFieldCategory =
  // Basic info
  | "basic_info_name"
  | "basic_info_furigana"
  | "basic_info_email"
  | "basic_info_phone"
  | "basic_info_university"
  | "basic_info_faculty"
  | "basic_info_graduation"
  // ES content fields
  | "gakuchika"
  | "self_pr"
  | "shiboudouki"
  | "weakness"
  | "career_goal"
  | "leadership"
  | "teamwork"
  | "challenge"
  | "free_text"
  // Skip
  | "non_es";

/** Fill instruction from AI */
export interface FillInstruction {
  selector: string;
  index: number;
  category: ESFieldCategory;
  content: string;
  charCount: number;
  sourceExperienceId?: string;
  /** Whether this was from a cached variant or freshly generated */
  source: "variant" | "generated" | "profile";
}

/** Fill preview item shown to user before filling */
export interface FillPreviewItem extends FillInstruction {
  fieldLabel: string;
  charLimit: number | null;
  /** User can edit this before confirming */
  edited: boolean;
}
