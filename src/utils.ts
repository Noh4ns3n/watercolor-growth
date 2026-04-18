import fs from "fs";

// --- Terminal Colors & Formatting ---
const c = {
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  dim: "\x1b[2m",
  reset: "\x1b[0m"
};

function getLocalTime() {
  return new Date().toLocaleTimeString('fr-FR');
}

/**
 * Custom logger
 */
export const log = {
  info: (msg: string) => console.log(`${c.dim}[${getLocalTime()}]${c.reset} ${c.magenta}[Orchestrator]${c.reset} ${msg}`),
  success: (msg: string) => console.log(`${c.dim}[${getLocalTime()}]${c.reset} ${c.magenta}[Orchestrator]${c.reset} ${c.green}${msg}${c.reset}`),
  warn: (msg: string) => console.log(`${c.dim}[${getLocalTime()}]${c.reset} ${c.magenta}[Orchestrator]${c.reset} ${c.yellow}${msg}${c.reset}`),
  error: (msg: string) => console.log(`${c.dim}[${getLocalTime()}]${c.reset} ${c.magenta}[Orchestrator]${c.reset} ${c.red}${msg}${c.reset}`),
};

/**
 * Scans a directory for files matching 'obs_XXX.png' and returns the next available index.
 * Creates the directory if it does not exist.
 */
export function recoverFrameIndex(targetFolder: string): number {
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
    return 0;
  }

  const files = fs.readdirSync(targetFolder);
  let maxIndex = -1;

  for (const file of files) {
    const match = file.match(/^obs_(\d+)\.png$/);
    if (match) {
      const index = parseInt(match[1] as string, 10);
      if (index > maxIndex) {
        maxIndex = index;
      }
    }
  }

  return maxIndex + 1;
}

/**
 * Mutates a Jimp instance by thresholding for the yellow Physarum signature,
 * setting all non-conforming pixels to black.
 */
export function isolateYellowBlob(image: any): any {
  image.scan(
    0,
    0,
    image.bitmap.width,
    image.bitmap.height,
    (x: number, y: number, idx: number) => {
      const r = image.bitmap.data[idx + 0];
      const g = image.bitmap.data[idx + 1];
      const b = image.bitmap.data[idx + 2];

      // Yellow/blob detection (high Red & Green, lower Blue)
      const isYellow =
        r > 100 && g > 100 && b < 150 && r - b > 30 && g - b > 30;

      if (!isYellow) {
        image.bitmap.data[idx + 0] = 0;
        image.bitmap.data[idx + 1] = 0;
        image.bitmap.data[idx + 2] = 0;
      }
    },
  );

  return image;
}
