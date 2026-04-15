import React, { useEffect, useRef, useState } from "react";
import { AudioEngine } from "./AudioEngine";

interface Props {
  latestImageSrc: string;
  simCanvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function DiffPanel({ latestImageSrc, simCanvasRef }: Props) {
  const diffCanvasRef = useRef<HTMLCanvasElement>(null);
  const [audioStarted, setAudioStarted] = useState(false);

  const initAudio = async () => {
    await AudioEngine.getInstance().start();
    setAudioStarted(true);
  };

  useEffect(() => {
    let animationFrameId: number;
    const diffCanvas = diffCanvasRef.current;
    if (!diffCanvas) return;
    const ctx = diffCanvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = "Anonymous";
    let imgLoaded = false;
    img.onload = () => {
      imgLoaded = true;
    };
    img.src = latestImageSrc;

    // Create a tiny offscreen canvas for fast pixel diffing
    const analysisSize = 100;
    const offscreen = document.createElement("canvas");
    offscreen.width = analysisSize;
    offscreen.height = analysisSize;
    const oCtx = offscreen.getContext("2d", { willReadFrequently: true });

    let frameCounter = 0;

    const render = () => {
      const simCanvas = simCanvasRef.current;
      if (simCanvas && imgLoaded && simCanvas.width > 0 && oCtx) {
        diffCanvas.width = simCanvas.width;
        diffCanvas.height = simCanvas.height;

        // --- 1. Visual Rendering (False Color representation can be done via shaders
        // or by keeping your difference composite, but adding contrast) ---
        ctx.globalCompositeOperation = "source-over";
        ctx.drawImage(img, 0, 0, diffCanvas.width, diffCanvas.height);
        ctx.globalCompositeOperation = "difference";
        ctx.drawImage(simCanvas, 0, 0, diffCanvas.width, diffCanvas.height);

        // --- 2. Metric Extraction (Run every 10 frames to save CPU) ---
        if (frameCounter % 10 === 0 && audioStarted) {
          // Draw reality to offscreen
          oCtx.globalCompositeOperation = "source-over";
          oCtx.drawImage(img, 0, 0, analysisSize, analysisSize);
          const realityData = oCtx.getImageData(
            0,
            0,
            analysisSize,
            analysisSize,
          ).data;

          // Draw sim to offscreen
          oCtx.drawImage(simCanvas, 0, 0, analysisSize, analysisSize);
          const simData = oCtx.getImageData(
            0,
            0,
            analysisSize,
            analysisSize,
          ).data;

          let diffCount = 0;
          const totalPixels = analysisSize * analysisSize;

          for (let i = 0; i < realityData.length; i += 4) {
            // Compare luminance. If difference exceeds threshold, it's a divergence.
            const rLuma = realityData[i]; // Simplification: using Red channel as proxy
            const sLuma = simData[i];
            if (Math.abs(rLuma - sLuma) > 40) {
              diffCount++;
            }
          }

          // Calculate a normalized metric (0.0 to 1.0)
          // We cap it at 30% of pixels differing to represent "Maximum Divergence"
          // so the audio reaches peak richness earlier.
          const rawDivergence = diffCount / totalPixels;
          const normalizedDelta = Math.min(1.0, rawDivergence / 0.3);

          AudioEngine.getInstance().updateDivergence(normalizedDelta);
        }
        frameCounter++;
      }
      animationFrameId = requestAnimationFrame(render);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [latestImageSrc, simCanvasRef, audioStarted]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      {!audioStarted && (
        <button
          onClick={initAudio}
          style={{
            position: "absolute",
            top: 10,
            left: 10,
            zIndex: 10,
            padding: "10px",
          }}
          className="sim-params-toggle"
        >
          Initialize Audio
        </button>
      )}
      <canvas
        ref={diffCanvasRef}
        className="panel-image"
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
