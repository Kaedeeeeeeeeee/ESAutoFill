import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";
import { copyFileSync, mkdirSync, existsSync, writeFileSync } from "fs";

/**
 * Chrome MV3 extension build.
 * All entries are built as IIFE (no ES modules) to comply with CSP.
 * Build in 4 passes: popup, sidepanel, content script, service worker.
 */

const target = process.env.BUILD_TARGET || "popup";

const entries: Record<string, { entry: string; outName: string }> = {
  popup: {
    entry: resolve(__dirname, "src/popup/Popup.tsx"),
    outName: "popup",
  },
  sidepanel: {
    entry: resolve(__dirname, "src/sidepanel/SidePanel.tsx"),
    outName: "sidepanel",
  },
  content: {
    entry: resolve(__dirname, "src/content/index.ts"),
    outName: "content",
  },
  "service-worker": {
    entry: resolve(__dirname, "src/background/service-worker.ts"),
    outName: "service-worker",
  },
};

const current = entries[target];

export default defineConfig({
  plugins: [
    react(),
    // On the last build pass, copy static files
    target === "service-worker"
      ? {
          name: "copy-static",
          closeBundle() {
            const dist = resolve(__dirname, "dist");

            // manifest.json
            copyFileSync(resolve(__dirname, "manifest.json"), resolve(dist, "manifest.json"));

            // Icons
            const iconsDir = resolve(dist, "assets/icons");
            if (!existsSync(iconsDir)) mkdirSync(iconsDir, { recursive: true });
            for (const size of ["16", "48", "128"]) {
              const src = resolve(__dirname, `assets/icons/icon${size}.png`);
              if (existsSync(src)) copyFileSync(src, resolve(iconsDir, `icon${size}.png`));
            }

            // Popup HTML
            writeFileSync(
              resolve(dist, "popup.html"),
              `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { width: 320px; min-height: 200px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif; padding: 16px; color: #1a1a2e; background: #fafafa; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="popup.js"></script>
</body>
</html>`
            );

            // Side panel HTML
            writeFileSync(
              resolve(dist, "sidepanel.html"),
              `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Hiragino Sans", sans-serif; color: #1a1a2e; background: #fafafa; }
  </style>
</head>
<body>
  <div id="root"></div>
  <script src="sidepanel.js"></script>
</body>
</html>`
            );
          },
        }
      : null,
  ].filter(Boolean),
  resolve: {
    alias: { "@": resolve(__dirname, "src") },
  },
  build: {
    outDir: "dist",
    emptyOutDir: target === "popup", // Only first pass clears dist
    lib: {
      entry: current.entry,
      formats: ["iife"],
      name: "ESAutoFill",
      fileName: () => `${current.outName}.js`,
    },
    rollupOptions: {
      external: [],
      output: {
        extend: true,
        globals: {},
      },
    },
    sourcemap: false,
    minify: true,
  },
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});
