import React, { useEffect, useRef, useState } from "react";
import { AudioEngine } from "./AudioEngine";

interface Props {
  latestImageSrc: string;
  simCanvasRef: React.RefObject<HTMLCanvasElement | null>;
  totalFrames: number;
}

export default function DiffPanel({
  latestImageSrc,
  simCanvasRef,
  totalFrames: totalFramesTimelapse,
}: Props) {
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
          // A. Get Reality Pixels
          oCtx.globalCompositeOperation = "source-over";
          oCtx.drawImage(img, 0, 0, analysisSize, analysisSize);
          const realityData = oCtx.getImageData(
            0,
            0,
            analysisSize,
            analysisSize,
          ).data;

          // B. Get Simulation Pixels
          // Clear offscreen canvas and draw sim
          oCtx.clearRect(0, 0, analysisSize, analysisSize);
          oCtx.drawImage(simCanvas, 0, 0, analysisSize, analysisSize);
          const simData = oCtx.getImageData(
            0,
            0,
            analysisSize,
            analysisSize,
          ).data;

          // C. Calculate Metrics
          let diffCount = 0;
          let maxRadiusFound = 0;
          const center = analysisSize / 2;
          const maxPossibleRadius = analysisSize / 2;

          for (let y = 0; y < analysisSize; y++) {
            for (let x = 0; x < analysisSize; x++) {
              const i = (y * analysisSize + x) * 4;

              const rLuma = realityData[i];
              const sLuma = simData[i];

              // 1. Divergence Check
              if (Math.abs(rLuma - sLuma) > 40) {
                diffCount++;
              }

              // 2. Radial Reach Check
              // If the simulation OR reality has a blob here (pixel is bright)
              if (rLuma > 50 || sLuma > 50) {
                const dx = x - center;
                const dy = y - center;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist > maxRadiusFound) {
                  maxRadiusFound = dist;
                }
              }
            }
          }

          // D. Normalize metrics to 0.0 -> 1.0 range
          const totalPixels = analysisSize * analysisSize;
          const rawDivergence = diffCount / totalPixels;

          const metrics = {
            divergence: Math.min(1.0, rawDivergence / 0.3),
            frameCount: frameCounter,
            radialReach: Math.min(1.0, maxRadiusFound / maxPossibleRadius),
            totalFramesTimelapse,
          };

          AudioEngine.getInstance().updateState(metrics);
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
