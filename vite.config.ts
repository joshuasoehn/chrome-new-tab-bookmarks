import fs from "node:fs";
import path from "node:path";
import { defineConfig, type Plugin } from "vite";

function copyManifestPlugin(): Plugin {
  return {
    name: "copy-manifest",
    apply: "build",
    generateBundle() {
      const manifestRaw = fs.readFileSync("manifest.json", "utf-8");
      const manifest = JSON.parse(manifestRaw) as Record<string, unknown>;

      const icons = manifest.icons as Record<string, string> | undefined;
      if (icons) {
        for (const iconPath of Object.values(icons)) {
          const source = fs.readFileSync(iconPath);
          this.emitFile({
            type: "asset",
            fileName: path.normalize(iconPath).replaceAll("\\", "/"),
            source,
          });
        }
      }

      this.emitFile({
        type: "asset",
        fileName: "manifest.json",
        source: JSON.stringify(manifest, null, 2),
      });
    },
  };
}

export default defineConfig({
  plugins: [copyManifestPlugin()],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        newtab: "newtab.html",
      },
    },
  },
});
