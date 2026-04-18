import fs from "fs";

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
