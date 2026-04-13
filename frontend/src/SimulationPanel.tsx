import { useEffect, useRef, useState, MouseEvent } from 'react';

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
  simSpeed: number; 
}

interface Props {
  seedImageSrc: string;
}

const CANVAS_SIZE = 500;
const DISH_CENTER = CANVAS_SIZE / 2;
const DISH_RADIUS = (CANVAS_SIZE / 2) - 10; 

export default function SimulationPanel({ seedImageSrc }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const agentsRef = useRef<Agent[]>([]);
  const attractantsRef = useRef<Point[]>([]);
  const paramsRef = useRef<SimParams>({
    sensorDistance: 12,
    sensorAngle: 35, // Tighter angle creates more cohesive veins
    stepSize: 1.5,   // Smaller step size makes the growth look more fluid
    decay: 0.04,     // Slower decay keeps the blob persistent longer
    simSpeed: 1, 
  });

  const [isLoaded, setIsLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [uiParams, setUiParams] = useState<SimParams>(paramsRef.current);

  const handleParamChange = (key: keyof SimParams, value: number) => {
    setUiParams(prev => ({ ...prev, [key]: value }));
    paramsRef.current[key] = value; 
  };

  const handleCanvasClick = (e: MouseEvent<HTMLCanvasElement>) => {
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

  // --- Data Injection ---
  useEffect(() => {
    if (!seedImageSrc) return;
    const img = new Image();
    img.crossOrigin = "Anonymous";
    img.src = seedImageSrc;

    img.onload = () => {
      const offscreen = document.createElement('canvas');
      offscreen.width = CANVAS_SIZE;
      offscreen.height = CANVAS_SIZE;
      const oCtx = offscreen.getContext('2d', { willReadFrequently: true });
      if (!oCtx) return;

      oCtx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const data = oCtx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE).data;

      const newAgents: Agent[] = [];
      const INJECTION_COUNT = 8000; // Doubled the particle count for a denser blob

      for (let i = 0; i < INJECTION_COUNT; i++) {
        let spawned = false;
        let attempts = 0;
        while (!spawned && attempts < 1000) {
          const rx = Math.floor(Math.random() * CANVAS_SIZE);
          const ry = Math.floor(Math.random() * CANVAS_SIZE);
          
          const dx = rx - DISH_CENTER;
          const dy = ry - DISH_CENTER;
          if (Math.sqrt(dx * dx + dy * dy) <= DISH_RADIUS) {
            const pixelIndex = (ry * CANVAS_SIZE + rx) * 4;
            if (data[pixelIndex] > 50) { 
              newAgents.push({ x: rx, y: ry, angle: Math.random() * Math.PI * 2 });
              spawned = true;
            }
          }
          attempts++;
        }
      }

      agentsRef.current = newAgents;
      setIsLoaded(true);
    };
  }, [seedImageSrc]);

  // --- Render Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    canvas.width = CANVAS_SIZE;
    canvas.height = CANVAS_SIZE;
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    let animationFrameId: number;

    const render = () => {
      const params = paramsRef.current;

      // 1. DIFFUSION (The Blob Hack): Blur the existing canvas slightly to spread the chemical trail
      ctx.filter = 'blur(1px)';
      ctx.drawImage(canvas, 0, 0);
      ctx.filter = 'none';

      // 2. DECAY: Darken the blurred trails slowly
      ctx.fillStyle = `rgba(0, 0, 0, ${params.decay})`; 
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

      // 3. Draw Petri Dish Boundary
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(DISH_CENTER, DISH_CENTER, DISH_RADIUS, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Draw Oats (Attractants)
      ctx.fillStyle = '#FFFFFF';
      attractantsRef.current.forEach(oat => {
        ctx.beginPath();
        ctx.arc(oat.x, oat.y, 6, 0, Math.PI * 2);
        ctx.fill();
      });

      // 5. Read Canvas State (Must happen AFTER blur/decay, BEFORE drawing new agents)
      const imgData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      const data = imgData.data;

      const getPixelIntensity = (x: number, y: number) => {
        if (x < 0 || x >= CANVAS_SIZE || y < 0 || y >= CANVAS_SIZE) return 0;
        // Read the Red channel
        return data[(Math.floor(y) * CANVAS_SIZE + Math.floor(x)) * 4]; 
      };

      const sa = params.sensorAngle * (Math.PI / 180);
      const sd = params.sensorDistance;

      // 6. Agent Physics Loop
      for (let tick = 0; tick < params.simSpeed; tick++) {
        
        // Use a semi-transparent, bright color for the agents. 
        // When many agents overlap on a path, it creates a thick, solid vein.
        ctx.fillStyle = 'rgba(0, 255, 255, 0.15)'; 

        agentsRef.current.forEach(agent => {
            const fVal = getPixelIntensity(agent.x + Math.cos(agent.angle) * sd, agent.y + Math.sin(agent.angle) * sd);
            const lVal = getPixelIntensity(agent.x + Math.cos(agent.angle - sa) * sd, agent.y + Math.sin(agent.angle - sa) * sd);
            const rVal = getPixelIntensity(agent.x + Math.cos(agent.angle + sa) * sd, agent.y + Math.sin(agent.angle + sa) * sd);

            if (fVal > lVal && fVal > rVal) {
              // Stay the course
            } else if (fVal < lVal && fVal < rVal) {
               agent.angle += (Math.random() > 0.5 ? 1 : -1) * sa;
            } else if (lVal < rVal) {
               agent.angle += sa; 
            } else if (rVal < lVal) {
               agent.angle -= sa; 
            }

            agent.x += Math.cos(agent.angle) * params.stepSize;
            agent.y += Math.sin(agent.angle) * params.stepSize;

            // Petri Dish Boundary Collision
            const dx = agent.x - DISH_CENTER;
            const dy = agent.y - DISH_CENTER;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= DISH_RADIUS) {
              agent.x = DISH_CENTER + (dx / dist) * (DISH_RADIUS - 1);
              agent.y = DISH_CENTER + (dy / dist) * (DISH_RADIUS - 1);
              const normalAngle = Math.atan2(dy, dx);
              agent.angle = normalAngle + Math.PI + (normalAngle - agent.angle);
              agent.angle += (Math.random() - 0.5) * 0.5;
            }

            // Draw a slightly larger 2x2 dot to thicken the veins
            ctx.fillRect(agent.x, agent.y, 2, 2);
        });
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', border: '1px solid #333' }}>
      {!isLoaded && <div style={{ color: 'white', position: 'absolute', top: 10, left: 10 }}>Loading...</div>}
      
      <canvas 
        ref={canvasRef} 
        onClick={handleCanvasClick}
        style={{ width: '100%', objectFit: 'contain', cursor: 'crosshair', borderRadius: '50%' }} 
      />

      <div style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.8)', padding: '10px', color: 'white', fontFamily: 'monospace', fontSize: '12px', border: '1px solid #444', zIndex: 10 }}>
        <button onClick={() => setMenuOpen(!menuOpen)} style={{ background: 'none', color: 'white', border: 'none', cursor: 'pointer', width: '100%', textAlign: 'left' }}>
          {menuOpen ? '▼ Hide Params' : '▶ Show Params'}
        </button>
        
        {menuOpen && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
            <label>
              Sim Speed: {uiParams.simSpeed}x<br/>
              <input type="range" min="1" max="5" step="1" value={uiParams.simSpeed} onChange={(e) => handleParamChange('simSpeed', parseInt(e.target.value))} />
            </label>
            <label>
              Sensor Distance: {uiParams.sensorDistance}<br/>
              <input type="range" min="5" max="50" value={uiParams.sensorDistance} onChange={(e) => handleParamChange('sensorDistance', parseFloat(e.target.value))} />
            </label>
            <label>
              Sensor Angle (°): {uiParams.sensorAngle}<br/>
              <input type="range" min="10" max="120" value={uiParams.sensorAngle} onChange={(e) => handleParamChange('sensorAngle', parseFloat(e.target.value))} />
            </label>
            <label>
              Step Size: {uiParams.stepSize}<br/>
              <input type="range" min="0.5" max="5" step="0.1" value={uiParams.stepSize} onChange={(e) => handleParamChange('stepSize', parseFloat(e.target.value))} />
            </label>
            <label>
              Trail Decay: {uiParams.decay.toFixed(2)}<br/>
              <input type="range" min="0.01" max="0.2" step="0.01" value={uiParams.decay} onChange={(e) => handleParamChange('decay', parseFloat(e.target.value))} />
            </label>
            <hr style={{ borderColor: '#444' }}/>
            <button onClick={() => attractantsRef.current = []} style={{ background: '#333', color: 'white', border: '1px solid #555', padding: '5px', cursor: 'pointer' }}>
              Clear Oat Flakes
            </button>
          </div>
        )}
      </div>
    </div>
  );
}