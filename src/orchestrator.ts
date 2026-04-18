import chokidar from "chokidar";
import { Jimp } from "jimp";
import osc from "osc";
import path from "path";
import express from "express";
import cors from "cors";
import { fileURLToPath } from "url";
import { recoverFrameIndex, isolateYellowBlob } from "./utils.js";

// Reconstruct __dirname in ES Module scope
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOT_FOLDER = path.resolve(__dirname, "../hot_folder");
const WATCH_FILE = path.join(HOT_FOLDER, "latest.png");

// --- Static File Server ---
const app = express();
app.use(cors());
app.use("/frames", express.static(HOT_FOLDER));

// Endpoint so React knows how many frames currently exist
app.get("/metadata", (req: any, res: any) => {
  res.json({ totalFrames: frameIndex });
});

app.listen(3001, () => console.log("[Server] Serving frames on port 3001"));

// --- 1. OSC Setup ---
const udpPort = new osc.UDPPort({
  localAddress: "0.0.0.0",
  localPort: 57121,
  remoteAddress: "127.0.0.1", // Send to localhost TouchDesigner/Ableton
  remotePort: 8000,
});

udpPort.open();
udpPort.on("ready", () => console.log("[OSC] Port open and ready."));

let frameIndex = recoverFrameIndex(HOT_FOLDER);
console.log(`[Orchestrator] Starting at frame index: ${frameIndex}`);

// --- 3. Observation & Delta Pipeline ---
async function processNewFrame(filePath: string) {
  console.log(`[Orchestrator] Processing new physical frame: ${filePath}`);
  try {
    // 1. Load the observed hardware image
    let obsImage = await Jimp.read(filePath);

    obsImage = isolateYellowBlob(obsImage);

    // 2. Save sequentially padded filename (e.g., 000, 001, 002)
    const paddedIndex = frameIndex.toString().padStart(3, "0");
    const outputPath = path.join(HOT_FOLDER, `obs_${paddedIndex}.png`);

    await obsImage.write(outputPath as `${string}.${string}`);

    console.log(`[Orchestrator] Saved: obs_${paddedIndex}.png`);

    // 3. Send a basic OSC trigger
    // Note: Because Node no longer calculates divergence, it cannot send those metrics.
    // We send a basic frame-update trigger to TouchDesigner/Ableton instead.
    udpPort.send({
      address: "/blob/frame",
      args: [{ type: "i", value: frameIndex }],
    });

    // 4. Increment the global frame counter
    frameIndex++;
  } catch (error) {
    console.error("[Orchestrator] Processing error:", error);
  }
}

// --- 4. File Watcher ---
const watcher = chokidar.watch(WATCH_FILE, {
  persistent: true,
  awaitWriteFinish: {
    stabilityThreshold: 500, // Ensure file is completely written before reading
    pollInterval: 100,
  },
});

watcher.on("add", processNewFrame);
watcher.on("change", processNewFrame);

console.log(`[Orchestrator] Watching ${WATCH_FILE}...`);
