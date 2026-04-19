import React, { useState } from "react";
import { AudioEngine } from "./AudioEngine";
import "./AudioSandbox.css"; // We will create this next

export default function AudioSandbox() {
  const [isOpen, setIsOpen] = useState(false);

  // Define your sound triggers here to keep the UI modular
  const sounds = [
    {
      name: "Vocal Slice",
      action: () => AudioEngine.getInstance().triggerVocal(),
    },
    {
      name: "Heartbeat Drum",
      action: () => AudioEngine.getInstance().triggerDrum(),
    },
    {
      name: "Glitch Chime",
      action: () => AudioEngine.getInstance().triggerChime(),
    },
    {
      name: "Gen Note",
      action: () => AudioEngine.getInstance().triggerGenerativeNote(),
    },
    {
      name: "Bubbles",
      action: () => AudioEngine.getInstance().triggerBubbleBurst(),
    },
    { name: "Alto", action: () => AudioEngine.getInstance().triggerAltoPing() },
  ];

  return (
    <div className={`audio-sandbox ${isOpen ? "open" : "closed"}`}>
      <button className="sandbox-toggle" onClick={() => setIsOpen(!isOpen)}>
        {isOpen ? "Close Sandbox" : "Audio Sandbox"}
      </button>

      {isOpen && (
        <div className="sandbox-content">
          <h3 className="sandbox-title">Test Triggers</h3>
          <div className="button-grid">
            {sounds.map((sound) => (
              <button
                key={sound.name}
                className="trigger-btn"
                onClick={sound.action}
              >
                {sound.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
