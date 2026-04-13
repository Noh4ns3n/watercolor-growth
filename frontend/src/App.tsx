// App.tsx
import { useState, useEffect } from "react";
import SimulationPanel from "./SimulationPanel";

const SERVER_URL = "http://localhost:3001";
const FPS = 2; // Frames per second for the playback loop
const REFRESH_METADATA_MS = 5000; // How often to check for new hardware frames

export default function InstallationView() {
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [currentFrame, setCurrentFrame] = useState<number>(0);

  // 1. Poll the Node server for new frames
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const res = await fetch(`${SERVER_URL}/metadata`);
        const data = await res.json();
        setTotalFrames(data.totalFrames);
      } catch (err) {
        console.error("Failed to fetch metadata", err);
      }
    };

    fetchMetadata();
    const interval = setInterval(fetchMetadata, REFRESH_METADATA_MS);
    return () => clearInterval(interval);
  }, []);

  // 2. Handle the playback loop
  useEffect(() => {
    if (totalFrames === 0) return;

    const loop = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, 1000 / FPS);

    return () => clearInterval(loop);
  }, [totalFrames]);

  // This index loops rapidly (e.g., 000, 001, 002...) for the timelapse
  const loopingIndex = currentFrame.toString().padStart(3, '0');
  
  // This index stays completely still until the total frame count increases
  // (e.g., it stays on 007 until the camera takes photo 008)
  const latestIndex = Math.max(0, totalFrames - 1).toString().padStart(3, '0');

  return (
    <div style={styles.container}>
      {totalFrames === 0 ? (
        <div style={styles.loading}>Awaiting initial biological data...</div>
      ) : (
        <>
          {/* LEFT: The historical timelapse loop */}
          <Panel 
            title="Observation History" 
            src={`${SERVER_URL}/frames/obs_${loopingIndex}.png`} 
          />
          
          {/* MIDDLE: The live predictive simulation, anchored only to the PRESENT state */}
          <div style={styles.panel}>
            <h2 style={styles.title}>Predictive Growth</h2>
            <SimulationPanel 
              seedImageSrc={`${SERVER_URL}/frames/obs_${latestIndex}.png`} 
            />
          </div>

          {/* RIGHT: You can decide if Divergence should loop with history, 
              or stay fixed on the latest frame. Here it is fixed on the latest. */}
          <Panel 
             title="Latest Divergence" 
             src={`${SERVER_URL}/frames/delta_${latestIndex}.png`} 
          />
        </>
      )}
    </div>
  );
}

// Sub-component for individual displays
function Panel({ title, src }: { title: string; src: string }) {
  return (
    <div style={styles.panel}>
      <h2 style={styles.title}>{title}</h2>
      <img
        src={src}
        alt={title}
        style={styles.image}
        onError={(e) => {
          e.currentTarget.style.display = "none";
        }}
      />
    </div>
  );
}

// Inline styles for zero-dependency implementation
const styles = {
  container: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "2px",
    backgroundColor: "#111",
    height: "100vh",
    width: "100vw",
    overflow: "hidden",
    color: "#eee",
    fontFamily: "monospace",
  },
  panel: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#000",
    padding: "20px",
  },
  title: {
    fontSize: "1.2rem",
    textTransform: "uppercase" as const,
    letterSpacing: "0.1em",
    marginBottom: "20px",
    opacity: 0.7,
  },
  image: {
    width: "100%",
    maxWidth: "600px",
    aspectRatio: "1/1",
    objectFit: "contain" as const,
    imageRendering: "pixelated" as const, // Preserves sharpness of the simulation grid
  },
  loading: {
    gridColumn: "1 / -1",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "2rem",
  },
};
