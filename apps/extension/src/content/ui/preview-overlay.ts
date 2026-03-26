import type { FillPreviewItem } from "@es-autofill/shared";

/**
 * Full-page preview overlay using Shadow DOM.
 * Shows all detected fields with proposed content.
 * User can edit content and confirm fill.
 */

let overlayHost: HTMLElement | null = null;
let shadowRoot: ShadowRoot | null = null;

const STYLES = `
  * { margin: 0; padding: 0; box-sizing: border-box; }

  .overlay-backdrop {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 2147483646;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 40px 20px;
    overflow-y: auto;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif;
  }

  .overlay-panel {
    background: #ffffff;
    border-radius: 16px;
    width: 100%;
    max-width: 640px;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.2);
    overflow: hidden;
  }

  .overlay-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    background: #4f46e5;
    color: white;
  }

  .overlay-header h2 {
    font-size: 16px;
    font-weight: 600;
  }

  .overlay-header .close-btn {
    background: rgba(255,255,255,0.2);
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    cursor: pointer;
    font-size: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .overlay-header .close-btn:hover {
    background: rgba(255,255,255,0.3);
  }

  .overlay-body {
    padding: 20px 24px;
    max-height: 60vh;
    overflow-y: auto;
  }

  .field-card {
    border: 1px solid #e5e7eb;
    border-radius: 10px;
    padding: 14px;
    margin-bottom: 12px;
    transition: border-color 0.2s;
  }

  .field-card:hover {
    border-color: #4f46e5;
  }

  .field-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .field-label {
    font-size: 13px;
    font-weight: 600;
    color: #4f46e5;
  }

  .field-chars {
    font-size: 11px;
    color: #9ca3af;
  }

  .field-chars.over-limit {
    color: #ef4444;
    font-weight: 600;
  }

  .field-textarea {
    width: 100%;
    min-height: 80px;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 10px;
    font-size: 13px;
    line-height: 1.6;
    font-family: inherit;
    resize: vertical;
    color: #1f2937;
  }

  .field-textarea:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .field-input {
    width: 100%;
    border: 1px solid #e5e7eb;
    border-radius: 6px;
    padding: 8px 10px;
    font-size: 13px;
    font-family: inherit;
    color: #1f2937;
  }

  .field-input:focus {
    outline: none;
    border-color: #4f46e5;
    box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
  }

  .edited-badge {
    display: inline-block;
    font-size: 10px;
    color: #f59e0b;
    margin-top: 4px;
  }

  .overlay-footer {
    padding: 16px 24px;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 12px;
    justify-content: flex-end;
  }

  .btn {
    padding: 10px 24px;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary {
    background: #4f46e5;
    color: white;
  }

  .btn-primary:hover {
    background: #4338ca;
  }

  .btn-primary:disabled {
    background: #a5b4fc;
    cursor: default;
  }

  .btn-secondary {
    background: #f3f4f6;
    color: #374151;
  }

  .btn-secondary:hover {
    background: #e5e7eb;
  }

  .btn-success {
    background: #22c55e;
    color: white;
  }

  .status-bar {
    padding: 12px 24px;
    background: #f0fdf4;
    color: #15803d;
    font-size: 13px;
    text-align: center;
    font-weight: 500;
  }

  .empty-state {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
    font-size: 14px;
  }

  .loading {
    text-align: center;
    padding: 40px 20px;
    color: #6b7280;
    font-size: 14px;
  }

  .loading .spinner {
    display: inline-block;
    width: 24px;
    height: 24px;
    border: 3px solid #e5e7eb;
    border-top-color: #4f46e5;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
    margin-bottom: 12px;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

export interface OverlayCallbacks {
  onFillAll: (items: FillPreviewItem[]) => void;
  onClose: () => void;
}

/** Show the preview overlay with fill items */
export function showPreviewOverlay(
  items: FillPreviewItem[],
  callbacks: OverlayCallbacks
): void {
  // Remove existing overlay
  removePreviewOverlay();

  overlayHost = document.createElement("div");
  overlayHost.id = "es-autofill-preview-host";
  document.body.appendChild(overlayHost);

  shadowRoot = overlayHost.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadowRoot.appendChild(style);

  const container = document.createElement("div");
  shadowRoot.appendChild(container);

  renderOverlay(container, items, callbacks);
}

/** Show loading state */
export function showLoadingOverlay(): void {
  removePreviewOverlay();

  overlayHost = document.createElement("div");
  overlayHost.id = "es-autofill-preview-host";
  document.body.appendChild(overlayHost);

  shadowRoot = overlayHost.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = STYLES;
  shadowRoot.appendChild(style);

  const container = document.createElement("div");
  container.innerHTML = `
    <div class="overlay-backdrop">
      <div class="overlay-panel">
        <div class="overlay-header">
          <h2>ES AutoFill</h2>
        </div>
        <div class="loading">
          <div class="spinner"></div>
          <div>フォームを解析中...</div>
        </div>
      </div>
    </div>
  `;
  shadowRoot.appendChild(container);
}

/** Remove the overlay */
export function removePreviewOverlay(): void {
  if (overlayHost) {
    overlayHost.remove();
    overlayHost = null;
    shadowRoot = null;
  }
}

function renderOverlay(
  container: HTMLElement,
  items: FillPreviewItem[],
  callbacks: OverlayCallbacks
): void {
  // Track editable state
  const editableItems = items.map((item) => ({ ...item }));
  let filled = false;

  function render() {
    container.innerHTML = "";

    const backdrop = document.createElement("div");
    backdrop.className = "overlay-backdrop";
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) callbacks.onClose();
    });

    const panel = document.createElement("div");
    panel.className = "overlay-panel";

    // Header
    panel.innerHTML = `
      <div class="overlay-header">
        <h2>入力プレビュー (${editableItems.length}件)</h2>
        <button class="close-btn">&times;</button>
      </div>
    `;
    panel.querySelector(".close-btn")!.addEventListener("click", callbacks.onClose);

    // Status bar (shown after fill)
    if (filled) {
      const statusBar = document.createElement("div");
      statusBar.className = "status-bar";
      statusBar.textContent = "全てのフィールドに入力しました";
      panel.appendChild(statusBar);
    }

    // Body
    const body = document.createElement("div");
    body.className = "overlay-body";

    if (editableItems.length === 0) {
      body.innerHTML = '<div class="empty-state">ESフィールドが検出されませんでした</div>';
    } else {
      for (let i = 0; i < editableItems.length; i++) {
        const item = editableItems[i];
        const card = document.createElement("div");
        card.className = "field-card";

        const charCount = [...item.content].length;
        const isOverLimit = item.charLimit != null && charCount > item.charLimit;
        const charClass = isOverLimit ? "field-chars over-limit" : "field-chars";
        const charText = item.charLimit
          ? `${charCount}/${item.charLimit}字`
          : `${charCount}字`;

        const isLongText = item.category !== "basic_info_name" &&
          item.category !== "basic_info_furigana" &&
          item.category !== "basic_info_email" &&
          item.category !== "basic_info_phone" &&
          item.category !== "basic_info_university" &&
          item.category !== "basic_info_faculty" &&
          item.category !== "basic_info_graduation";

        card.innerHTML = `
          <div class="field-header">
            <span class="field-label">${escapeHtml(item.fieldLabel)}</span>
            <span class="${charClass}">${charText}</span>
          </div>
        `;

        if (isLongText) {
          const textarea = document.createElement("textarea");
          textarea.className = "field-textarea";
          textarea.value = item.content;
          textarea.rows = Math.max(3, Math.ceil(charCount / 40));
          textarea.addEventListener("input", () => {
            editableItems[i].content = textarea.value;
            editableItems[i].charCount = [...textarea.value].length;
            editableItems[i].edited = true;
            // Update char count display
            const newCount = [...textarea.value].length;
            const newOverLimit = item.charLimit != null && newCount > item.charLimit;
            const charSpan = card.querySelector(".field-chars")!;
            charSpan.className = newOverLimit ? "field-chars over-limit" : "field-chars";
            charSpan.textContent = item.charLimit
              ? `${newCount}/${item.charLimit}字`
              : `${newCount}字`;
          });
          card.appendChild(textarea);
        } else {
          const input = document.createElement("input");
          input.className = "field-input";
          input.value = item.content;
          input.addEventListener("input", () => {
            editableItems[i].content = input.value;
            editableItems[i].charCount = [...input.value].length;
            editableItems[i].edited = true;
          });
          card.appendChild(input);
        }

        if (item.edited) {
          const badge = document.createElement("span");
          badge.className = "edited-badge";
          badge.textContent = "編集済み";
          card.appendChild(badge);
        }

        body.appendChild(card);
      }
    }

    panel.appendChild(body);

    // Footer
    const footer = document.createElement("div");
    footer.className = "overlay-footer";

    const cancelBtn = document.createElement("button");
    cancelBtn.className = "btn btn-secondary";
    cancelBtn.textContent = "キャンセル";
    cancelBtn.addEventListener("click", callbacks.onClose);

    const fillBtn = document.createElement("button");
    fillBtn.className = filled ? "btn btn-success" : "btn btn-primary";
    fillBtn.textContent = filled ? "入力完了" : "全て入力する";
    fillBtn.disabled = filled || editableItems.length === 0;
    fillBtn.addEventListener("click", () => {
      callbacks.onFillAll(editableItems);
      filled = true;
      render();
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(fillBtn);
    panel.appendChild(footer);

    backdrop.appendChild(panel);
    container.appendChild(backdrop);
  }

  render();
}

function escapeHtml(text: string): string {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}
