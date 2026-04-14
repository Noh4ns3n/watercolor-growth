// ==========================================
// CENTRAL COLOR & THEME CONFIGURATION
// ==========================================
// Edit the values below to instantly update the colors of the UI and the Simulation.

export const UI_COLORS = {
  // Main background of the page
  background: '#050508',
  
  // Background of the 3 main panels
  panelBg: 'rgba(10, 12, 16, 0.8)',
  
  // Borders of the panels and UI elements
  borderColor: '#1a2a3a',
  
  // Text color and panel titles
  textColor: '#cceeff',

  // Accent color used for titles, corners, and glows
  accentColor: '#00f0ff',
  
  // Indicator color (the pulsing recording light & clear button)
  indicatorColor: '#ff3366',
};

export const SIMULATION_COLORS = {
  // Color of the actively "Searching" tips (drawn over the blob)
  agents: 'rgba(255, 255, 150, 0.9)',
  
  // Color of the Oat Flakes (Attractants) when you click the canvas
  food: '#FFFFEE',
  
  // The subtle glowing boundary of the petri dish
  dishBoundary: 'rgba(0, 240, 255, 0.15)',
};

// ==========================================
// ESTABLISHED BLOB (TRAIL) COLORMAP
// ==========================================
// The physical blob and the historical trails are rendered using a dynamic colormap.
// 'intensity' goes from 0 (empty space) to 255 (thickest veins/growth).
// Tweak the RGB returns below to change the look of the established Aquarelle blob!

function getBlobColor(intensity: number): [number, number, number, number] {
  if (intensity < 5) {
    // Transparent background for empty dish
    return [0, 0, 0, 0]; 
  }
  
  let r, g, b;
  
  if (intensity > 150) {
    // CORE ESTABLISHED VEINS (Highest density) - Bright Yellow
    r = 255;
    g = 240;
    b = 50;
  } else if (intensity > 50) {
    // FADING EDGES (Medium density) - Darker, greener yellow
    r = 200;
    g = 220;
    b = 40;
  } else {
    // OLDEST GROWTH / DISSOLVING (Lowest density) - Dark olive green
    r = 120;
    g = 150;
    b = 30;
  }
  
  // Alpha channel (transparency) - creates a sharp drop-off at the very edge
  const alpha = intensity > 20 ? 255 : intensity * 12;
  
  return [r, g, b, alpha];
}

// Pre-compute the colormap for massive performance gains in the render loop.
// Do not edit this line.
export const BLOB_COLORMAP = Array.from({ length: 256 }, (_, i) => getBlobColor(i));
