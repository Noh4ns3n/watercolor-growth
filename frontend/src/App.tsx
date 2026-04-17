import { useState, useEffect, useRef } from "react";
import SimulationPanel from "./SimulationPanel";
import DiffPanel from "./DiffPanel";
import { UI_COLORS } from "./theme";
import "./App.css";

const SERVER_URL = "http://localhost:3001";
const FPS = 2; // Frames per second for the playback loop
const REFRESH_METADATA_MS = 5000;

export default function App() {
  const [totalFrames, setTotalFrames] = useState<number>(0);
  const [currentFrame, setCurrentFrame] = useState<number>(0);
  const simCanvasRef = useRef<HTMLCanvasElement | null>(null);

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

  useEffect(() => {
    if (totalFrames === 0) return;

    const loop = setInterval(() => {
      setCurrentFrame((prev) => (prev + 1) % totalFrames);
    }, 1000 / FPS);

    return () => clearInterval(loop);
  }, [totalFrames]);

  const loopingIndex = currentFrame.toString().padStart(3, '0');
  const latestIndex = Math.max(0, totalFrames - 1).toString().padStart(3, '0');
  
  const latestImageSrc = totalFrames > 0 ? `${SERVER_URL}/frames/obs_${latestIndex}.png` : "";
  const loopingImageSrc = totalFrames > 0 ? `${SERVER_URL}/frames/obs_${loopingIndex}.png` : "";

  return (
    <div 
      className="app-container"
      style={{
        '--bg-color': UI_COLORS.background,
        '--panel-bg': UI_COLORS.panelBg,
        '--border-color': UI_COLORS.borderColor,
        '--accent-color': UI_COLORS.accentColor,
        '--text-color': UI_COLORS.textColor,
        '--indicator-color': UI_COLORS.indicatorColor,
      } as React.CSSProperties}
    >
      <header className="app-header">
        <h1>UNPREDICTABLE GROWTH</h1>
        <div className="status">
          <span className="indicator active"></span>
          LIVE METRICS: {totalFrames} FRAMES GATHERED
        </div>
      </header>

      {totalFrames === 0 ? (
        <div className="loading">AWAITING BIOLOGICAL SEED...</div>
      ) : (
        <div className="panels-grid">
          <div className="panel">
            <h2 className="panel-title">OBSERVATION HISTORY</h2>
            <div className="panel-content">
              <img src={loopingImageSrc} alt="Observation" className="panel-image" />
            </div>
          </div>
          
          <div className="panel">
            <h2 className="panel-title">PREDICTIVE SIMULATION</h2>
            <div className="panel-content" style={{ position: 'relative' }}>
              <SimulationPanel latestImageSrc={latestImageSrc} canvasRef={simCanvasRef} />
            </div>
          </div>

          <div className="panel">
            <h2 className="panel-title">DIVERGENCE (REAL VS SIM)</h2>
            <div className="panel-content">
              <DiffPanel latestImageSrc={latestImageSrc} simCanvasRef={simCanvasRef} totalFrames={totalFrames} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
