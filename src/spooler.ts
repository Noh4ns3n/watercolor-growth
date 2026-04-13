import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

// Reconstruct __dirname in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MOCK_DIR = path.resolve(__dirname, "../mock_images");
const HOT_FOLDER = path.resolve(__dirname, "../hot_folder");
const OUTPUT_FILE = path.join(HOT_FOLDER, "latest.png");
const INTERVAL_MS = 5000; // Simulate an image every 60 seconds

async function startSpooler() {
  try {
    const files = (await fs.readdir(MOCK_DIR))
      .filter((f) => f.endsWith(".png"))
      .sort();

    if (files.length === 0) throw new Error("No mock images found.");

    let index = 0;
    console.log(`[Spooler] Starting. Emitting every ${INTERVAL_MS}ms.`);

    setInterval(async () => {
      const currentFile = files[index];
      const sourcePath = path.join(MOCK_DIR, currentFile ?? "");

      // Copy and overwrite the target file
      await fs.copyFile(sourcePath, OUTPUT_FILE);
      console.log(`[Spooler] Emitted: ${currentFile} -> latest.png`);

      index = (index + 1) % files.length;
    }, INTERVAL_MS);
  } catch (error) {
    console.error("[Spooler] Error:", error);
    process.exit(1);
  }
}

startSpooler();
