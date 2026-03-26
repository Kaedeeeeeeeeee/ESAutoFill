/** Inject a floating "ES AutoFill" button into the page using Shadow DOM */
export function injectFloatingButton(onClick: () => void): HTMLElement {
  // Create host element
  const host = document.createElement("div");
  host.id = "es-autofill-host";
  document.body.appendChild(host);

  // Attach shadow DOM to prevent CSS conflicts
  const shadow = host.attachShadow({ mode: "closed" });

  const style = document.createElement("style");
  style.textContent = `
    .es-autofill-btn {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      padding: 12px 20px;
      background: #4f46e5;
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4);
      transition: all 0.2s;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .es-autofill-btn:hover {
      background: #4338ca;
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(79, 70, 229, 0.5);
    }
    .es-autofill-btn:active {
      transform: translateY(0);
    }
    .es-autofill-btn .icon {
      width: 18px;
      height: 18px;
    }
  `;

  const button = document.createElement("button");
  button.className = "es-autofill-btn";
  button.innerHTML = `
    <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
    ES AutoFill
  `;
  button.addEventListener("click", onClick);

  shadow.appendChild(style);
  shadow.appendChild(button);

  return host;
}

/** Remove the floating button */
export function removeFloatingButton(): void {
  const host = document.getElementById("es-autofill-host");
  if (host) host.remove();
}
