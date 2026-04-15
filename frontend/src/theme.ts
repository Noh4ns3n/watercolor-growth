// ==========================================
// CENTRAL COLOR & THEME CONFIGURATION
// ==========================================
// Edit the values below to instantly update the colors of the UI and the Simulation.

export const UI_COLORS = {
  // Main background of the page
  background: "#050508",

  // Background of the 3 main panels
  panelBg: "rgba(10, 12, 16, 0.8)",

  // Borders of the panels and UI elements
  borderColor: "#1a2a3a",

  // Text color and panel titles
  textColor: "#cceeff",

  // Accent color used for titles, corners, and glows
  accentColor: "#00f0ff",

  // Indicator color (the pulsing recording light & clear button)
  indicatorColor: "#ff3366",
};

export const SIMULATION_COLORS = {
  // Color of the actively "Searching" tips (drawn over the blob)
  agents: "rgba(100, 10, 150, 0.2)",

  // Color of the Oat Flakes (Attractants) when you click the canvas
  food: "#FF00EE",

  // The subtle glowing boundary of the petri dish
  dishBoundary: "rgba(0, 240, 255, 0.15)",
};

// ==========================================
// ESTABLISHED BLOB (TRAIL) COLORMAP
// ==========================================
// The physical blob and the historical trails are rendered using a dynamic colormap.
// 'intensity' goes from 0 (empty space) to 255 (thickest veins/growth).
// Tweak the RGB returns below to change the look of the established Aquarelle blob!
// Helper to parse hex strings to [r, g, b] arrays ONCE at startup
const hexToRgb = (hex: string): [number, number, number] => {
  const cleanHex = hex.replace("#", "");
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);
  return [r, g, b];
};

const BLOB_COLORS_HEX = {
  ESTABLISHED: "#FF0000", // Bright Yellow
  FADING: "#00FF00", // Darker, greener yellow
  DISSOLVING: "#0000FF", // Dark olive green
};

const PARSED_RGB = {
  ESTABLISHED: hexToRgb(BLOB_COLORS_HEX.ESTABLISHED),
  FADING: hexToRgb(BLOB_COLORS_HEX.FADING),
  DISSOLVING: hexToRgb(BLOB_COLORS_HEX.DISSOLVING),
};

export function getBlobColor(
  intensity: number,
): [number, number, number, number] {
  if (intensity < 5) {
    // Transparent background for empty dish
    return [0, 0, 0, 0];
  }

  let rgb: [number, number, number];

  if (intensity > 150) {
    rgb = PARSED_RGB.ESTABLISHED;
  } else if (intensity > 50) {
    rgb = PARSED_RGB.FADING;
  } else {
    rgb = PARSED_RGB.DISSOLVING;
  }

  // Alpha channel (transparency) - creates a sharp drop-off at the very edge
  const alpha = intensity > 20 ? 255 : intensity * 12;

  // Return the combined array for the Canvas ImageData buffer
  return [rgb[0], rgb[1], rgb[2], alpha];
}

// Pre-compute the colormap for massive performance gains in the render loop.
// Do not edit this line.
export const BLOB_COLORMAP = Array.from({ length: 256 }, (_, i) =>
  getBlobColor(i),
);
