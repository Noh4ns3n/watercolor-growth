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

  // --- 1. Procedural Synths
  private droneSynth: Tone.FMSynth;
  private generativeSynth: Tone.PolySynth;

  // private scale = ["C3", "Eb3", "F3", "G3", "Bb3", "C4", "Eb4", "G4"];
  private scale = [
    "Bb2",
    "C3",
    "D3",
    "F3",
    "G3",
    "Bb3",
    "C4",
    "D4",
    "F4",
    "G4",
  ];

  // --- 2. Vocals
  private vocalPlayer: Tone.Player;
  private vocalDelay: Tone.FeedbackDelay;
  private isVocalPlaying = false;

  // --- 3. TEMPORARY PLACEHOLDERS (For future .wav files) ---
  private tensionPlaceholder: Tone.NoiseSynth;
  private chimePlaceholder: Tone.MetalSynth;
  private drumPlaceholder: Tone.MembraneSynth;
  private altoPlaceholder: Tone.Synth;
  private sonarFilter: Tone.Filter;
  private bubblePlaceholder: Tone.MembraneSynth;
  // private samplers!: Tone.Players; // <-- MUSICIAN: Uncomment this later

  // --- 4. EFFECTS ---
  private masterFilter: Tone.Filter;
  private masterReverb: Tone.Reverb;
  private delay: Tone.PingPongDelay;

  private loop: Tone.Loop | null = null;

  private constructor() {
    // Synths
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

    // Vocals
    this.vocalDelay = new Tone.FeedbackDelay({
      delayTime: "4n.", // Dotted quarter note delay
      feedback: 0.7, // High feedback for a long, trailing echo
      wet: 0.6, // 60% effect, 40% dry signal
    }).toDestination(); // Connect this to your master output or master reverb

    this.vocalPlayer = new Tone.Player({
      url: "/sounds/vocals.mp3", // Fetched from the React public folder
      loop: false,
      fadeIn: 3, // 3-second fade-in prevents sudden starts
      fadeOut: 5, // 5-second fade-out into the delay tail
    }).connect(this.vocalDelay);

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
      volume: -24,
    });

    this.drumPlaceholder = new Tone.MembraneSynth({
      pitchDecay: 0.1, // Slower pitch drop
      octaves: 1.5, // Less extreme sweep (removes the "pew" sound)
      oscillator: { type: "sine" },
      envelope: {
        attack: 0.02, // 20ms attack removes the sharp transient click
        decay: 0.6, // Smooth organic fade
        sustain: 0,
        release: 1,
      },
    });

    this.altoPlaceholder = new Tone.Synth({
      oscillator: { type: "sine" },
      envelope: { attack: 0.2, decay: 0.2, sustain: 0.8, release: 3 },
      volume: -8,
    });

    // Steep bandpass filter to give it that "underwater/radio" sonar quality
    this.sonarFilter = new Tone.Filter({
      type: "bandpass",
      frequency: 600, // Centers around the Bb4 frequency
      rolloff: -48, // Very steep cut of high/low frequencies
      Q: 2, // Slight resonance
    });

    this.bubblePlaceholder = new Tone.MembraneSynth({
      pitchDecay: 0.02,
      octaves: 2,
      oscillator: { type: "sine" },
      envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 },
      volume: -30, // Keep this very quiet so it sits under the mix as a texture
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
    this.altoPlaceholder.chain(this.sonarFilter, this.vocalDelay);

    // Route the bubbles directly to the reverb for immediate spatial presence
    this.bubblePlaceholder.chain(this.masterReverb, Tone.Destination);
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async start() {
    if (this.isInitialized) return;

    // ? --- MUSICIAN INSTRUCTIONS ---
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

    /***************************************
     **               DRONE                *
     ***************************************/
    const targetFreq = 400 + divergence * 3600;
    this.masterFilter.frequency.rampTo(targetFreq, 0.5);
    this.droneSynth.modulationIndex.rampTo(1.2 + divergence * 5, 0.5);

    const droneVol = -15 + divergence * 10;
    this.droneSynth.volume.rampTo(droneVol, 0.5);

    /***************************************
     **              VOCALS                *
     ***************************************/
    if (divergence > 0.2) {
      if (Math.random() < 0.1) {
        this.triggerVocal();
      }
    }

    /***************************************
     **           DRUMS VOLUME             *
     ***************************************/
    const targetDrumDb = -6 + divergence * 6;
    this.drumPlaceholder.volume.rampTo(targetDrumDb, 0.5);

    /***************************************
     **          ALTO SONAR                *
     ***************************************/
    const targetSonarFreq = 800 - radialReach * 500;
    this.sonarFilter.frequency.rampTo(targetSonarFreq, 0.5);

    const targetAltoDb = -12 + divergence * 6;
    this.altoPlaceholder.volume.rampTo(targetAltoDb, 0.5);

    /***************************************
     **              BUBBLES               *
     ***************************************/
    const targetBubbleDb = -36 + divergence * 24;
    this.bubblePlaceholder.volume.rampTo(targetBubbleDb, 0.5);
  }

  private generativeSequencer(time: number) {
    const { divergence, radialReach } = this.currentMetrics;

    const noteProbability = divergence * 0.8;
    if (Math.random() < noteProbability) {
      const velocity = 0.3 + divergence * 0.5;
      this.triggerGenerativeNote(velocity);
    }

    if (radialReach > 0.2) {
      if (Math.random() < (divergence - 0.1) * 0.4) {
        const drumVelocity = 0.3 + divergence * 0.3;
        // ! MUSICIAN: Change to -> this.samplers.player("deepDrum").start(time);
        this.triggerDrum(drumVelocity);
      }
    }

    if (radialReach > 0.4) {
      if (divergence > 0.2 && Math.random() < divergence * 0.1) {
        this.triggerBubbleBurst();
      }
    }

    if (radialReach > 0.6) {
      if (divergence > 0.3 && Math.random() < 0.01) {
        const chimeVelocity = 0.2 + divergence * 0.1;
        // ! MUSICIAN: Change to -> this.samplers.player("glitchChime").start(time);
        this.triggerChime(chimeVelocity);
      }
    }

    if (radialReach > 0.8) {
      if (divergence > 0.3 && Math.random() < divergence * 0.5) {
        this.triggerAltoPing();
      }
    }
  }

  // =========================================================================

  public triggerVocal() {
    console.log("triggering vocals");
    if (!this.vocalPlayer.loaded || this.isVocalPlaying) return;
    const playDuration = Math.random() * 7 + 8;
    const maxDuration = this.vocalPlayer.buffer.duration;
    const startTime = Math.random() * (maxDuration - playDuration);

    this.isVocalPlaying = true;
    this.vocalPlayer.start(Tone.now(), startTime, playDuration);

    setTimeout(
      () => {
        this.isVocalPlaying = false;
      },
      (playDuration + this.vocalPlayer.fadeOut) * 1000,
    );
  }

  public triggerDrum(velocity?: number) {
    const time = Tone.now();
    const triggerVelocity = velocity ?? 0.6;

    // Lub
    this.drumPlaceholder.triggerAttackRelease(
      "C1",
      "8n",
      time,
      triggerVelocity * 0.7,
    );
    // Dub
    this.drumPlaceholder.triggerAttackRelease(
      "G0",
      "8n",
      time + 0.15,
      triggerVelocity,
    );
  }

  public triggerChime(velocity?: number) {
    const triggerVelocity = velocity ?? 0.5;

    this.chimePlaceholder.triggerAttackRelease(
      "G4",
      "8n",
      Tone.now(),
      triggerVelocity,
    );
  }

  public triggerGenerativeNote(velocity?: number) {
    const triggerVelocity = velocity ?? 0.6;

    const randomNote =
      this.scale[Math.floor(Math.random() * this.scale.length)];

    this.generativeSynth.triggerAttackRelease(
      randomNote,
      "8n",
      Tone.now(),
      triggerVelocity,
    );
  }

  public triggerAltoPing() {
    // Bb4 sits nicely above your current sequence scale
    this.altoPlaceholder.triggerAttackRelease("Bb4", "2n", Tone.now(), 0.8);
  }

  public triggerBubbleBurst() {
    const time = Tone.now();
    // Simulate a rapid cluster of 3-4 bubbles popping at random high frequencies
    for (let i = 0; i < 4; i++) {
      if (Math.random() > 0.3) {
        const randomPitch = 100 + Math.random() * 800;
        const randomTimeOffset = Math.random() * 0.15;
        this.bubblePlaceholder.triggerAttackRelease(
          randomPitch,
          "32n",
          time + randomTimeOffset,
          0.3 + Math.random() * 0.4,
        );
      }
    }
  }

  // ! =========================================================================

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
