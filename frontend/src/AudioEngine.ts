import * as Tone from "tone";

export class AudioEngine {
  private static instance: AudioEngine;
  private isInitialized = false;

  // Synthesizers
  private droneSynth: Tone.FMSynth;
  private generativeSynth: Tone.PolySynth;
  private deepDrum: Tone.MembraneSynth;
  private alienGlitch: Tone.MetalSynth;

  // Effects
  private filter: Tone.Filter;
  private reverb: Tone.Reverb;
  private delay: Tone.PingPongDelay;

  // The "Foolproof" Spacey Scale (C Minor Pentatonic)
  private scale = ["C3", "Eb3", "F3", "G3", "Bb3", "C4", "Eb4", "G4"];
  private loop: Tone.Loop | null = null;

  private constructor() {
    // 1. Setup the Drone (The Predictable Base)
    this.droneSynth = new Tone.FMSynth({
      harmonicity: 0.5,
      modulationIndex: 1.2,
      oscillator: { type: "sine" },
      envelope: { attack: 2, decay: 2, sustain: 1, release: 5 },
    });

    // 2. Setup the Generative "Richer" Synth (The Unpredictability)
    this.generativeSynth = new Tone.PolySynth(Tone.AMSynth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.5, decay: 1, sustain: 0.5, release: 2 },
    });

    // 3. Setup Percussion (High Divergence Layers)
    // Deep, resonant, slow-decaying drum (like a distant heartbeat or spaceship hull strike)
    this.deepDrum = new Tone.MembraneSynth({
      pitchDecay: 0.05,
      octaves: 4,
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.001,
        decay: 0.4,
        sustain: 0.01,
        release: 1.4,
        attackCurve: "exponential",
      },
    });

    // Metallic, discordant scatter/glitch
    this.alienGlitch = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
      harmonicity: 5.1,
      modulationIndex: 32,
      resonance: 4000,
      octaves: 1.5,
    });

    // 4. The "Spacey" Effects Chain
    this.filter = new Tone.Filter(400, "lowpass", -24);
    this.delay = new Tone.PingPongDelay("8n", 0.6);
    this.reverb = new Tone.Reverb({ decay: 8, wet: 0.8 });

    // Route audio
    this.droneSynth.chain(this.filter, this.reverb, Tone.Destination);
    this.generativeSynth.chain(
      this.filter,
      this.delay,
      this.reverb,
      Tone.Destination,
    );

    // Route percussion directly into the echo chamber (bypassing the muffled lowpass filter)
    this.deepDrum.chain(this.delay, this.reverb, Tone.Destination);
    this.alienGlitch.chain(this.delay, this.reverb, Tone.Destination);
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async start() {
    if (this.isInitialized) return;
    await Tone.start();
    await this.reverb.generate();

    this.droneSynth.triggerAttack("C2");

    this.loop = new Tone.Loop((time) => {
      this.tickGenerative(time);
    }, "16n").start(0);

    Tone.Transport.start();
    this.isInitialized = true;
  }

  private currentDivergence = 0;

  public updateDivergence(deltaMetric: number) {
    this.currentDivergence = Math.max(0, Math.min(1, deltaMetric));

    const targetFreq = 400 + this.currentDivergence * 3600;
    this.filter.frequency.rampTo(targetFreq, 0.5);
    this.droneSynth.modulationIndex.rampTo(
      1.2 + this.currentDivergence * 5,
      0.5,
    );
  }

  private tickGenerative(time: number) {
    // 1. Existing Melody Logic
    const noteProbability = this.currentDivergence * 0.8;

    if (Math.random() < noteProbability) {
      const randomNote =
        this.scale[Math.floor(Math.random() * this.scale.length)];
      const velocity = 0.3 + this.currentDivergence * 0.5;
      this.generativeSynth.triggerAttackRelease(
        randomNote,
        "8n",
        time,
        velocity,
      );
    }

    // 2. High Divergence Percussion Logic
    // Only start attempting to play percussion if the simulation differs from reality by > 40%

    if (this.currentDivergence > 0.4) {
      // Deep Drum: Sparse probability, grows slightly as divergence peaks.
      // We trigger a very low note (C1) to make it sound massive.
      if (Math.random() < (this.currentDivergence - 0.3) * 0.4) {
        const drumVelocity = 0.4 + this.currentDivergence * 0.4;
        this.deepDrum.triggerAttackRelease("C1", "8n", time, drumVelocity);
      }

      // Alien Glitch: Needs to be higher divergence (> 60%) to trigger,
      // representing severe deviation. Sounds like chittering/static.
      if (
        this.currentDivergence > 0.6 &&
        Math.random() < this.currentDivergence - 0.5
      ) {
        const glitchVelocity = 0.2 + this.currentDivergence * 0.3;
        this.alienGlitch.triggerAttackRelease("16n", time, glitchVelocity);
      }
    }
  }
}
