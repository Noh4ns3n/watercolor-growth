import fs from "fs";
import path from "path";
import { Jimp } from "jimp";
import { fileURLToPath } from "url";
import { isolateYellowBlob, recoverFrameIndex } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOT_FOLDER = path.resolve(__dirname, "../hot_folder");
const BACKLOG_FOLDER = path.resolve(__dirname, "../backlog");

async function runCatchup() {
  if (!fs.existsSync(BACKLOG_FOLDER)) {
    console.error(
      "[Error] Please create a 'backlog' folder and put the raw images there.",
    );
    return;
  }

  // Get all PNGs and sort them alphabetically (so timestamps are chronological)
  const files = fs
    .readdirSync(BACKLOG_FOLDER)
    .filter((f) => f.endsWith(".png"))
    .sort();
  let frameIndex = recoverFrameIndex(HOT_FOLDER);

  console.log(
    `[Catchup] Found ${files.length} images. Resuming at index ${frameIndex}.`,
  );

  for (const file of files) {
    const filePath = path.join(BACKLOG_FOLDER, file);
    console.log(`[Catchup] Processing ${file}...`);

    try {
      let obsImage = await Jimp.read(filePath);

      obsImage = isolateYellowBlob(obsImage);

      // Save padded filename
      const paddedIndex = frameIndex.toString().padStart(3, "0");
      const outputPath = path.join(HOT_FOLDER, `obs_${paddedIndex}.png`);

      await obsImage.write(outputPath as `${string}.${string}`);
      console.log(`[Catchup] Saved: obs_${paddedIndex}.png`);

      frameIndex++;
    } catch (error) {
      console.error(`[Catchup] Failed to process ${file}:`, error);
    }
  }

  console.log(
    "[Catchup] Done! You can safely delete the files in the backlog folder.",
  );
}

runCatchup();
