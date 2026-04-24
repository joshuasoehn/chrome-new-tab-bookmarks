import { existsSync, mkdirSync, rmSync } from "node:fs";
import { execFileSync } from "node:child_process";

const DIST_DIR = "dist";
const RELEASE_DIR = "release";
const ZIP_PATH = `${RELEASE_DIR}/chrome-new-tab-bookmarks.zip`;

if (!existsSync(DIST_DIR)) {
  console.error("Missing dist/ directory. Run `npm run build` first.");
  process.exit(1);
}

mkdirSync(RELEASE_DIR, { recursive: true });
rmSync(ZIP_PATH, { force: true });

execFileSync("zip", ["-r", "../" + ZIP_PATH, "."], {
  cwd: DIST_DIR,
  stdio: "inherit",
});

console.log(`Created ${ZIP_PATH}`);
