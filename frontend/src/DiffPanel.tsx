import React, { useEffect, useRef } from 'react';

interface Props {
  latestImageSrc: string;
  simCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function DiffPanel({ latestImageSrc, simCanvasRef }: Props) {
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    const diffCanvas = diffCanvasRef.current;
    if (!diffCanvas) return;
    const ctx = diffCanvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    let imgLoaded = false;
    img.onload = () => { imgLoaded = true; };
    img.src = latestImageSrc;

    const render = () => {
      const simCanvas = simCanvasRef.current;
      if (simCanvas && imgLoaded && simCanvas.width > 0) {
        diffCanvas.width = simCanvas.width;
        diffCanvas.height = simCanvas.height;

        // Draw reality
        ctx.globalCompositeOperation = 'source-over';
        ctx.drawImage(img, 0, 0, diffCanvas.width, diffCanvas.height);

        // Diff with simulation using 'difference' blend mode
        // This will highlight the areas where the simulation and reality diverge.
        ctx.globalCompositeOperation = 'difference';
        ctx.drawImage(simCanvas, 0, 0, diffCanvas.width, diffCanvas.height);
        
        // Optionally, we could add a sci-fi scanline effect here
        ctx.globalCompositeOperation = 'source-over';
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let i = 0; i < diffCanvas.height; i += 4) {
          ctx.fillRect(0, i, diffCanvas.width, 1);
        }
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [latestImageSrc, simCanvasRef]);

  return (
    <canvas 
      ref={diffCanvasRef} 
      className="panel-image"
      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
    />
  );
}
