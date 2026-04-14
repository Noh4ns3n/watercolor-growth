import React, { useEffect, useRef, useState } from 'react';
import { SIMULATION_COLORS, BLOB_COLORMAP } from './theme';

interface Agent {
  x: number;
  y: number;
  angle: number;
}

interface Point {
  x: number;
  y: number;
}

interface SimParams {
  sensorDistance: number;
  sensorAngle: number;
  stepSize: number;
  decay: number;
}

interface Props {
  latestImageSrc: string;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const CANVAS_SIZE = 500;
const DISH_CENTER = CANVAS_SIZE / 2;
const DISH_RADIUS = (CANVAS_SIZE / 2) - 10; 

export default function SimulationPanel({ latestImageSrc, canvasRef }: Props) {
  const agentsRef = useRef<Agent[]>([]);
  const attractantsRef = useRef<Point[]>([]);
  const trailCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const paramsRef = useRef<SimParams>({
    sensorDistance: 12,      
    sensorAngle: 40,        
    stepSize: 0.1,          
    decay: 0.1, 
  });

  const [menuOpen, setMenuOpen] = useState(false);
  const [uiParams, setUiParams] = useState<SimParams>(paramsRef.current);

  // Initialize trail canvas once
  useEffect(() => {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = CANVAS_SIZE;
    offCanvas.height = CANVAS_SIZE;
    trailCanvasRef.current = offCanvas;
  }, []);

  const handleParamChange = (key: keyof SimParams, value: number) => {
    setUiParams(prev => ({ ...prev, [key]: value }));
    paramsRef.current[key] = value; 
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height);
    
    const dx = x - DISH_CENTER;
    const dy = y - DISH_CENTER;
    if (Math.sqrt(dx * dx + dy * dy) <= DISH_RADIUS) {
      attractantsRef.current.push({ x, y });
    }
  };

  useEffect(() => {
    if (!latestImageSrc) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = latestImageSrc;

    img.onload = () => {
      const trailCanvas = trailCanvasRef.current;
      if (!trailCanvas) return;
      const tCtx = trailCanvas.getContext('2d', { willReadFrequently: true });
      if (!tCtx) return;

      const offscreen = document.createElement('canvas');
      offscreen.width = CANVAS_SIZE;
      offscreen.height = CANVAS_SIZE;
      const oCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!oCtx) return;

      oCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const imgData = oCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const data = imgData.data;

      // 1. Reset trail canvas and initialize with observation
      tCtx.fillStyle = 'black';
      tCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      
      // Convert observation to grayscale trail intensity
      const trailData = tCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      for (let i = 0; i < data.length; i += 4) {
        // Simple luminance
        const luma = data[i] * 0.299 + data[i+1] * 0.587 + data[i+2] * 0.114;
        
        // Boost the luma slightly so the imported blob acts as a strong established trail
        const boostedLuma = Math.min(255, luma * 1.5);
        
        trailData.data[i] = boostedLuma;
        trailData.data[i+1] = boostedLuma;
        trailData.data[i+2] = boostedLuma;
        trailData.data[i+3] = 255;
      }
      tCtx.putImageData(trailData, 0, 0);

      // 2. Reset agents - always fresh from the new observation
      const newAgents: Agent[] = [];
      const INJECTION_COUNT = 80000; 

      // Find all bright pixels to use as potential spawn points
      const brightPixels: { x: number, y: number }[] = [];
      for (let y = 0; y < CANVAS_SIZE; y++) {
        for (let x = 0; x < CANVAS_SIZE; x++) {
          const dx = x - DISH_CENTER;
          const dy = y - DISH_CENTER;
          if (Math.sqrt(dx * dx + dy * dy) <= DISH_RADIUS) {
            const pixelIndex = (y * CANVAS_SIZE + x) * 4;
            const brightness = trailData.data[pixelIndex];
            if (brightness > 50) {
              brightPixels.push({ x, y });
            }
          }
        }
      }

      if (brightPixels.length > 0) {
        for (let i = 0; i < INJECTION_COUNT; i++) {
          const randomPixel = brightPixels[Math.floor(Math.random() * brightPixels.length)];
          // Add a tiny bit of random sub-pixel scatter for natural look
          const rx = randomPixel.x + (Math.random() - 0.5);
          const ry = randomPixel.y + (Math.random() - 0.5);
          newAgents.push({ x: rx, y: ry, angle: Math.random() * Math.PI * 2 });
        }
      }

      agentsRef.current = newAgents;
    };
  }, [latestImageSrc]);

  useEffect(() => {
    const displayCanvas = canvasRef.current;
    if (!displayCanvas) return;
    const displayCtx = displayCanvas.getContext('2d', { willReadFrequently: true });
    if (!displayCtx) return;

    displayCanvas.width = CANVAS_SIZE;
    displayCanvas.height = CANVAS_SIZE;

    let animationFrameId: number;

    const render = () => {
      const offCanvas = trailCanvasRef.current;
      if (!offCanvas) return;
      const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
      if (!offCtx) return;

      const params = paramsRef.current;

      // 1. DIFFUSION on Trail Map
      offCtx.filter = 'blur(1px)';
      offCtx.drawImage(offCanvas, 0, 0);
      offCtx.filter = 'none';

      // 2. DECAY
      offCtx.globalCompositeOperation = 'source-over';
      offCtx.fillStyle = `rgba(0, 0, 0, ${params.decay})`; 
      offCtx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // 3. Draw Attractants (Food) onto Trail Map as intense white spots
      offCtx.fillStyle = '#FFFFFF';
      attractantsRef.current.forEach(oat => {
        offCtx.beginPath();
        offCtx.arc(oat.x, oat.y, 4, 0, Math.PI * 2);
        offCtx.fill();
      });

      const imgData = offCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const data = imgData.data;

      const getIntensity = (x: number, y: number) => {
        if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return 0;
        return data[((Math.floor(y) * CANVAS_SIZE) + Math.floor(x)) * 4]; 
      };

      const sa = params.sensorAngle * (Math.PI / 180);
      const sd = params.sensorDistance;

      // 4. Update Agents and Draw onto Trail Map
      offCtx.fillStyle = 'rgba(255, 255, 255, 0.4)'; 

      agentsRef.current.forEach(agent => {
          const fVal = getIntensity(agent.x + Math.cos(agent.angle) * sd, agent.y + Math.sin(agent.angle) * sd);
          const lVal = getIntensity(agent.x + Math.cos(agent.angle - sa) * sd, agent.y + Math.sin(agent.angle - sa) * sd);
          const rVal = getIntensity(agent.x + Math.cos(agent.angle + sa) * sd, agent.y + Math.sin(agent.angle + sa) * sd);

          if (fVal > lVal && fVal > rVal) {
            // Keep going forward
          } else if (fVal < lVal && fVal < rVal) {
             agent.angle += (Math.random() > 0.5 ? 1 : -1) * sa; 
          } else if (lVal < rVal) {
             agent.angle += sa; 
          } else if (rVal < lVal) {
             agent.angle -= sa; 
          }

          agent.x += Math.cos(agent.angle) * params.stepSize;
          agent.y += Math.sin(agent.angle) * params.stepSize;

          const dx = agent.x - DISH_CENTER;
          const dy = agent.y - DISH_CENTER;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Wall Collision
          if (dist >= DISH_RADIUS) {
            agent.x = DISH_CENTER + (dx / dist) * (DISH_RADIUS - 1);
            agent.y = DISH_CENTER + (dy / dist) * (DISH_RADIUS - 1);
            agent.angle = Math.atan2(-dy, -dx) + (Math.random() - 0.5); 
          }

          offCtx.beginPath();
          offCtx.arc(agent.x, agent.y, 1.2, 0, Math.PI * 2);
          offCtx.fill();
      });

      // 5. COLOR MAP RENDER TO DISPLAY CANVAS
      const finalOffData = offCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const oData = finalOffData.data;
      
      const dispData = displayCtx.createImageData(CANVAS_SIZE, CANVAS_SIZE);
      const dData = dispData.data;

      for (let i = 0; i < oData.length; i += 4) {
        const v = oData[i]; 
        
        const [r, g, b, a] = BLOB_COLORMAP[v];

        dData[i] = r;
        dData[i+1] = g;
        dData[i+2] = b;
        dData[i+3] = a;
      }

      displayCtx.putImageData(dispData, 0, 0);

      // 6. Draw Active Searching Agents on top
      displayCtx.fillStyle = SIMULATION_COLORS.agents; 
      agentsRef.current.forEach(agent => {
          displayCtx.beginPath();
          displayCtx.arc(agent.x, agent.y, 1.2, 0, Math.PI * 2);
          displayCtx.fill();
      });

      // Draw Dish Boundary
      displayCtx.strokeStyle = SIMULATION_COLORS.dishBoundary;
      displayCtx.lineWidth = 1;
      displayCtx.beginPath();
      displayCtx.arc(DISH_CENTER, DISH_CENTER, DISH_RADIUS, 0, Math.PI * 2);
      displayCtx.stroke();

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [canvasRef]);

  return (
    <>
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        className="panel-image"
        style={{ cursor: 'crosshair', mixBlendMode: 'screen', width: '100%', height: '100%' }} 
      />

      <div className="sim-params-menu">
        <button onClick={() => setMenuOpen(!menuOpen)} className="sim-params-toggle">
          {menuOpen ? '▼ HIDE PARAMS' : '▶ TWEAK BIOLOGY'}
        </button>
        
        {menuOpen && (
          <div className="sim-params-content">
            <label>
              Sensor Distance: {uiParams.sensorDistance}<br/>
              <input type="range" min="3" max="30" value={uiParams.sensorDistance} onChange={(e) => handleParamChange('sensorDistance', parseFloat(e.target.value))} />
            </label>
            <label>
              Sensor Angle (°): {uiParams.sensorAngle}<br/>
              <input type="range" min="10" max="90" value={uiParams.sensorAngle} onChange={(e) => handleParamChange('sensorAngle', parseFloat(e.target.value))} />
            </label>
            <label>
              Growth Speed: {uiParams.stepSize.toFixed(1)}<br/>
              <input type="range" min="0.05" max="3" step="0.1" value={uiParams.stepSize} onChange={(e) => handleParamChange('stepSize', parseFloat(e.target.value))} />
            </label>
            <label>
              Evaporation: {uiParams.decay.toFixed(3)}<br/>
              <input type="range" min="0.01" max="0.15" step="0.01" value={uiParams.decay} onChange={(e) => handleParamChange('decay', parseFloat(e.target.value))} />
            </label>
            <hr style={{ borderColor: 'var(--border-color)', margin: '10px 0' }}/>
            <button onClick={() => attractantsRef.current = []} className="sim-params-clear">
              Clear Attractants
            </button>
          </div>
        )}
      </div>
    </>
  );
}
