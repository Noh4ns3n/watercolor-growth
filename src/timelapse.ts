import { execSync } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { log } from "./utils.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOT_FOLDER = path.resolve(__dirname, "../hot_folder");
const OUTPUT_FILE = path.resolve(__dirname, "../timelapse_output.mp4");

const FRAMERATE = 60;

log.info(`Initializing FFmpeg render pipeline...`);
log.info(`Source: ${HOT_FOLDER}`);
log.info(`Target FPS: ${FRAMERATE}`);

try {
  // -y overwrites existing output files automatically
  // -c:v libx264 and -pix_fmt yuv420p ensure playback works on QuickTime and iOS
  // Added: -vf "scale=-2:1080"
  const command = `ffmpeg -y -framerate ${FRAMERATE} -pattern_type glob -i "${HOT_FOLDER}/obs_*.png" -vf "scale=-2:1080" -c:v libx264 -r ${FRAMERATE} -pix_fmt yuv420p -profile:v high -level 4.2 -movflags +faststart "${OUTPUT_FILE}"`;

  // Run the command and pipe the FFmpeg terminal output directly to our console
  execSync(command, { stdio: "inherit" });

  log.success(`Render complete! Video saved to: ${OUTPUT_FILE}`);
} catch (error) {
  log.error(`Render failed. Please ensure FFmpeg is installed on your system.`);
  console.error(error);
}
