import * as Tone from 'tone';

export class AudioEngine {
  private static instance: AudioEngine;
  private isInitialized = false;

  // Synthesizers
  private droneSynth: Tone.FMSynth;
  private generativeSynth: Tone.PolySynth;
  
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
      envelope: { attack: 2, decay: 2, sustain: 1, release: 5 }
    });

    // 2. Setup the Generative "Richer" Synth (The Unpredictability)
    this.generativeSynth = new Tone.PolySynth(Tone.AMSynth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.5, decay: 1, sustain: 0.5, release: 2 }
    });

    // 3. The "Spacey" Effects Chain
    this.filter = new Tone.Filter(400, "lowpass", -24);
    this.delay = new Tone.PingPongDelay("8n", 0.6);
    this.reverb = new Tone.Reverb({ decay: 8, wet: 0.8 }); // Massive 8-second decay

    // Route audio: Synths -> Filter -> Delay -> Reverb -> Master Output
    this.droneSynth.chain(this.filter, this.reverb, Tone.Destination);
    this.generativeSynth.chain(this.filter, this.delay, this.reverb, Tone.Destination);
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async start() {
    if (this.isInitialized) return;
    await Tone.start(); // Web Audio requires a user gesture to unlock
    await this.reverb.generate(); // Pre-calculate reverb impulse response
    
    // Start the underlying eerie drone
    this.droneSynth.triggerAttack("C2");

    // Start the generative loop (checks every 16th note)
    this.loop = new Tone.Loop((time) => {
      this.tickGenerative(time);
    }, "16n").start(0);

    Tone.Transport.start();
    this.isInitialized = true;
  }

  // --- The Generative Mapping ---
  private currentDivergence = 0;

  public updateDivergence(deltaMetric: number) {
    // Ensure value is between 0.0 and 1.0
    this.currentDivergence = Math.max(0, Math.min(1, deltaMetric));

    // Map Delta to Filter Cutoff (Higher divergence = brighter, harsher sound)
    // 400Hz (muffled) up to 4000Hz (bright)
    const targetFreq = 400 + (this.currentDivergence * 3600);
    this.filter.frequency.rampTo(targetFreq, 0.5); 

    // Map Delta to FM Modulation (Makes the drone sound more "metallic/unstable")
    this.droneSynth.modulationIndex.rampTo(1.2 + (this.currentDivergence * 5), 0.5);
  }

  private tickGenerative(time: number) {
    // The "Richness" logic: Higher divergence = higher probability of a note playing
    const noteProbability = this.currentDivergence * 0.8; // Max 80% chance per tick

    if (Math.random() < noteProbability) {
      // Pick a random note from our "correct" pentatonic scale
      const randomNote = this.scale[Math.floor(Math.random() * this.scale.length)];
      
      // Velocity (volume) also scales with divergence
      const velocity = 0.3 + (this.currentDivergence * 0.5);
      
      this.generativeSynth.triggerAttackRelease(randomNote, "8n", time, velocity);
    }
  }
}