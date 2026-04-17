import * as Tone from "tone";

export interface InstallationMetrics {
  divergence: number;
  frameCount: number;
  radialReach: number;
  totalFramesTimelapse: number;
}

export class AudioEngine {
  private static instance: AudioEngine;
  private isInitialized = false;

  private currentMetrics: InstallationMetrics = {
    divergence: 0,
    frameCount: 0,
    radialReach: 0,
    totalFramesTimelapse: 0,
  };

  // --- 1. CORE PROCEDURAL SYNTHS (Original Sound) ---
  private droneSynth: Tone.FMSynth;
  private generativeSynth: Tone.PolySynth;
  private scale = ["C3", "Eb3", "F3", "G3", "Bb3", "C4", "Eb4", "G4"];

  // --- 2. TEMPORARY PLACEHOLDERS (For future .wav files) ---
  private tensionPlaceholder: Tone.NoiseSynth;
  private chimePlaceholder: Tone.MetalSynth;
  private drumPlaceholder: Tone.MembraneSynth;
  // private samplers!: Tone.Players; // <-- MUSICIAN: Uncomment this later

  // --- 3. EFFECTS ---
  private masterFilter: Tone.Filter;
  private masterReverb: Tone.Reverb;
  private delay: Tone.PingPongDelay;

  private loop: Tone.Loop | null = null;

  private constructor() {
    // Original Synths
    this.droneSynth = new Tone.FMSynth({
      harmonicity: 0.5,
      modulationIndex: 1.2,
      oscillator: { type: "sine" },
      envelope: { attack: 2, decay: 2, sustain: 1, release: 5 },
    });
    this.generativeSynth = new Tone.PolySynth(Tone.AMSynth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.5, decay: 1, sustain: 0.5, release: 2 },
    });

    // Placeholders
    this.tensionPlaceholder = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 2, decay: 0.1, sustain: 1, release: 2 },
    });
    this.chimePlaceholder = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    });
    this.drumPlaceholder = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 },
    });

    // Effects
    this.masterFilter = new Tone.Filter(400, "lowpass", -24);
    this.delay = new Tone.PingPongDelay("8n", 0.6);
    this.masterReverb = new Tone.Reverb({ decay: 8, wet: 0.8 });

    // Routing
    this.droneSynth.chain(
      this.masterFilter,
      this.masterReverb,
      Tone.Destination,
    );
    this.generativeSynth.chain(
      this.masterFilter,
      this.delay,
      this.masterReverb,
      Tone.Destination,
    );

    // Route placeholders directly into the echo chamber for maximum space
    this.tensionPlaceholder.chain(
      this.masterFilter,
      this.masterReverb,
      Tone.Destination,
    );
    this.chimePlaceholder.chain(
      this.delay,
      this.masterReverb,
      Tone.Destination,
    );
    this.drumPlaceholder.chain(this.delay, this.masterReverb, Tone.Destination);
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async start() {
    if (this.isInitialized) return;

    // --- MUSICIAN INSTRUCTIONS ---
    // 1. Delete the placeholder synths above.
    // 2. Uncomment the Tone.Players block below.
    // 3. Chain this.samplers to the masterReverb.
    /*
    this.samplers = new Tone.Players({
      edgeTension: "/audio/high_tension.wav",
      glitchChime: "/audio/chime_01.wav",
      deepDrum: "/audio/drum_01.wav"
    }).chain(this.masterFilter, this.masterReverb, Tone.Destination);
    await Tone.loaded();
    */

    await Tone.start();
    await this.masterReverb.generate();

    // Start base sounds
    this.droneSynth.triggerAttack("C2");
    this.tensionPlaceholder.triggerAttack(); // Simulate a looping stem
    this.tensionPlaceholder.volume.value = -Infinity; // Start muted

    this.loop = new Tone.Loop((time) => {
      this.generativeSequencer(time);
    }, "16n").start(0);

    Tone.Transport.start();
    this.isInitialized = true;
  }

  // =========================================================================
  // THE MUSICIAN'S SANDBOX
  // =========================================================================

  public updateState(metrics: InstallationMetrics) {
    this.currentMetrics = metrics;
    const { divergence, radialReach, frameCount, totalFramesTimelapse } =
      metrics;

    console.log("metrics :>> ", JSON.stringify(metrics, null, 2));

    // 1. ORIGINAL DRONE MATH (Restored)
    const targetFreq = 400 + divergence * 3600;
    this.masterFilter.frequency.rampTo(targetFreq, 0.5);
    this.droneSynth.modulationIndex.rampTo(1.2 + divergence * 5, 0.5);

    const droneVol = -15 + divergence * 10;
    this.droneSynth.volume.rampTo(droneVol, 0.5);

    // 2. CONTINUOUS MAPPING (Placeholders for stems)
    const FRAME_THRESHOLD = 100; // Adjust this to whatever frame you want
    let edgeVolume = 0;

    // Only allow the tension volume to rise IF enough time has passed
    // AND the blob is reaching the edge.
    if (
      (frameCount > 500 || totalFramesTimelapse > FRAME_THRESHOLD) &&
      radialReach > 0.6
    ) {
      edgeVolume = (radialReach - 0.6) * 2.5;
    }
    const clampedVolume = Math.min(1, Math.max(0, edgeVolume)); // Clamp 0 to 1

    // Convert linear volume (0-1) to Decibels (-Infinity to 0dB)
    const decibels =
      clampedVolume === 0 ? -Infinity : Tone.gainToDb(clampedVolume) - 10;

    // MUSICIAN: Change 'this.tensionPlaceholder' to 'this.samplers.player("edgeTension")'
    this.tensionPlaceholder.volume.rampTo(decibels, 0.5);
  }

  private generativeSequencer(time: number) {
    const { divergence, frameCount, radialReach } = this.currentMetrics;

    // 1. ORIGINAL MELODY MATH (Restored)
    const noteProbability = divergence * 0.8;
    if (Math.random() < noteProbability) {
      const randomNote =
        this.scale[Math.floor(Math.random() * this.scale.length)];
      const velocity = 0.3 + divergence * 0.5;
      this.generativeSynth.triggerAttackRelease(
        randomNote,
        "8n",
        time,
        velocity,
      );
    }

    // 2. DISCRETE EVENTS (Placeholders for One-Shots)
    if (divergence > 0.4) {
      // Drum probability scales with time and divergence
      if (Math.random() < (divergence - 0.3) * 0.4) {
        const drumVelocity = 0.4 + divergence * 0.4;
        // MUSICIAN: Change to -> this.samplers.player("deepDrum").start(time);
        this.drumPlaceholder.triggerAttackRelease(
          "C1",
          "8n",
          time,
          drumVelocity,
        );
      }

      // Glitch chime triggers only at extreme edges and high divergence
      if (radialReach > 0.8 && divergence > 0.6 && Math.random() < 0.2) {
        const glitchVelocity = 0.2 + divergence * 0.3;
        // MUSICIAN: Change to -> this.samplers.player("glitchChime").start(time);
        this.chimePlaceholder.triggerAttackRelease("16n", time, glitchVelocity);
      }
    }
  }

  // =========================================================================

  public stop() {
    if (!this.isInitialized) return;
    this.droneSynth.triggerRelease();
    this.tensionPlaceholder.triggerRelease();
    this.generativeSynth.releaseAll();

    if (this.loop) {
      this.loop.stop();
      this.loop.dispose();
      this.loop = null;
    }
    Tone.Transport.stop();
    this.isInitialized = false;
  }
}
