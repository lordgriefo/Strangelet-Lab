// Web Audio synthesizer for Retro Sci-Fi Laser Beams & David Lynchian Surrealist Audio FX

let sharedAudioContext: AudioContext | null = null;
// Studio Recording Safety Standard:
// In professional DAW software, interface feedback sounds (clicks, beeps, laser chirps) MUST be muted by default.
// Unwanted UI sounds cause acoustic bleed into studio microphones, headphone monitor bleed during tracking,
// corrupt loopback recording streams, and interfere with critical mixing and mastering decisions.
let isUiSoundFxMuted: boolean = true;
let isRecordingSafetyLockActive: boolean = false;

// Initialize state from localStorage if available (default: MUTED for recording safety)
if (typeof window !== 'undefined') {
  try {
    const hasExplicitOptIn = localStorage.getItem('strangelet_ui_sound_fx_explicit_opt_in');
    const saved = localStorage.getItem('strangelet_ui_sound_fx_muted');
    if (hasExplicitOptIn === 'true' && saved !== null) {
      isUiSoundFxMuted = saved === 'true';
    } else {
      // Default to Studio Silent / Recording Safety Mode
      isUiSoundFxMuted = true;
      localStorage.setItem('strangelet_ui_sound_fx_muted', 'true');
    }
  } catch (e) {
    // Ignore localStorage access issues
  }
}

const uiSoundListeners = new Set<(muted: boolean) => void>();

export function isUiSoundMuted(): boolean {
  return isUiSoundFxMuted;
}

export function setUiSoundMuted(muted: boolean) {
  isUiSoundFxMuted = muted;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem('strangelet_ui_sound_fx_muted', String(muted));
      localStorage.setItem('strangelet_ui_sound_fx_explicit_opt_in', 'true');
    }
  } catch (e) {}
  uiSoundListeners.forEach(cb => {
    try {
      cb(muted);
    } catch (_) {}
  });
}

export function toggleUiSoundMuted(): boolean {
  const next = !isUiSoundFxMuted;
  setUiSoundMuted(next);
  return next;
}

export function subscribeUiSoundMute(cb: (muted: boolean) => void): () => void {
  uiSoundListeners.add(cb);
  cb(isUiSoundFxMuted);
  return () => {
    uiSoundListeners.delete(cb);
  };
}

/**
 * Recording Safety Guard:
 * When active (e.g. any audio track is armed for recording or live microphone session is open),
 * all UI clicks, laser sweeps, and navigation beeps are strictly suppressed with zero latency
 * to guarantee that no accidental UI sound bleeds into the take.
 */
export function setRecordingSafetyGuard(active: boolean) {
  isRecordingSafetyLockActive = active;
}

export function isRecordingSafetyActive(): boolean {
  return isRecordingSafetyLockActive;
}

export function getAudioContext(): AudioContext | null {
  try {
    if (!sharedAudioContext && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        sharedAudioContext = new AudioCtx();
      }
    }
    if (sharedAudioContext && sharedAudioContext.state === 'suspended') {
      sharedAudioContext.resume().catch(() => {});
    }
  } catch (err) {
    console.warn('LaserSound: AudioContext unavailable:', err);
  }
  return sharedAudioContext;
}

/**
 * Synthesizes retro-futuristic laser beam sound effects based on beam color/type
 */
export function playLaserBeamSound(beamType: 'laser_audio' | 'laser_midi' | 'laser_erase' | 'laser_curve' | 'laser_select') {
  if (isUiSoundFxMuted || isRecordingSafetyLockActive) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    switch (beamType) {
      case 'laser_audio': {
        // Blue Laser: High-tech resonant pulse (Sine/Saw chirp 880Hz -> 220Hz)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.Q.value = 4;

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        osc.connect(filter).connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
        break;
      }
      case 'laser_midi': {
        // Green Laser: Cybernetic arpeggio pip (Square wave 440 -> 660 -> 880)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.04);
        osc.frequency.setValueAtTime(783.99, now + 0.08);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.14);
        break;
      }
      case 'laser_erase': {
        // Red Laser: Vaporizing sizzle (Noise burst + fast downward saw)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);

        gain.gain.setValueAtTime(0.25, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.17);
        break;
      }
      case 'laser_curve': {
        // Amber Laser: Warm Neon tube hum strike (Sine 330Hz with subtle vibrato)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.linearRampToValueAtTime(330, now + 0.18);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
        break;
      }
      default: {
        // Subtle click/tick
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(1200, now);
        gain.gain.setValueAtTime(0.08, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
        osc.connect(gain).connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.04);
        break;
      }
    }
  } catch (e) {
    // AudioContext autoplay policy or error
  }
}

/**
 * David Lynch surrealist soundscapes:
 * - 'owl': Eerie reverse tape drone + deep desert night wind ("The Owls Are Not What They Seem")
 * - 'silencio': Mulholland Dr. dream reverb + subtle vinyl crackle
 * - 'tape_rewind': 1960s reel-to-reel motor whirr
 */
export function playLynchianFx(type: 'owl' | 'silencio' | 'tape_rewind' | 'desert_wind') {
  if (isUiSoundFxMuted || isRecordingSafetyLockActive) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'owl') {
      // Sub-bass drone + pitch oscillating spooky twin peaks style flute harmonic
      const bassOsc = ctx.createOscillator();
      const fltOsc = ctx.createOscillator();
      const gain = ctx.createGain();

      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(55, now);
      bassOsc.frequency.exponentialRampToValueAtTime(45, now + 1.2);

      fltOsc.type = 'sine';
      fltOsc.frequency.setValueAtTime(370, now);
      fltOsc.frequency.linearRampToValueAtTime(330, now + 0.5);
      fltOsc.frequency.linearRampToValueAtTime(360, now + 1.2);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      bassOsc.connect(gain);
      fltOsc.connect(gain);
      gain.connect(ctx.destination);

      bassOsc.start(now);
      fltOsc.start(now);
      bassOsc.stop(now + 1.5);
      fltOsc.stop(now + 1.5);
    } else if (type === 'silencio') {
      // Dream chord swelling and decaying with vinyl warmth
      const chordNotes = [220, 261.63, 311.13, 392]; // Am7 mysterious minor chord
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(0.01, now);
      masterGain.gain.linearRampToValueAtTime(0.18, now + 0.6);
      masterGain.gain.exponentialRampToValueAtTime(0.001, now + 2.4);

      chordNotes.forEach((freq) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.connect(masterGain);
        osc.start(now);
        osc.stop(now + 2.5);
      });

      masterGain.connect(ctx.destination);
    } else if (type === 'tape_rewind') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(1400, now + 0.25);
      osc.frequency.exponentialRampToValueAtTime(80, now + 0.45);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);

      osc.connect(gain).connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    }
  } catch (e) {
    // AudioContext ignored
  }
}

// Lynchian Mode Ambient Surrealist Soundscape Manager
// Isolated entirely from project mixer and recording stream to prevent take corruption
let lynchianDroneNodes: {
  subOsc: OscillatorNode;
  detuneOsc: OscillatorNode;
  filter: BiquadFilterNode;
  ambientGain: GainNode;
} | null = null;

export function startLynchianAmbientDrone(volume: number = 0.07): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (lynchianDroneNodes) return; // already active

    const now = ctx.currentTime;
    const ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(0.001, now);
    ambientGain.gain.exponentialRampToValueAtTime(Math.max(0.005, Math.min(0.2, volume)), now + 1.2);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(220, now);

    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(55, now); // Deep A1 sub

    const detuneOsc = ctx.createOscillator();
    detuneOsc.type = 'triangle';
    detuneOsc.frequency.setValueAtTime(110.5, now); // Slightly detuned A2 for mysterious beat frequency

    subOsc.connect(filter);
    detuneOsc.connect(filter);
    filter.connect(ambientGain);
    
    // Connected solely to physical monitor output, never to mix bus or recorder
    ambientGain.connect(ctx.destination);

    subOsc.start(now);
    detuneOsc.start(now);

    lynchianDroneNodes = { subOsc, detuneOsc, filter, ambientGain };
  } catch (err) {
    console.warn('Lynchian ambient drone initialization deferred:', err);
  }
}

export function stopLynchianAmbientDrone(): void {
  try {
    if (!lynchianDroneNodes) return;
    const ctx = getAudioContext();
    if (ctx && lynchianDroneNodes.ambientGain) {
      const now = ctx.currentTime;
      lynchianDroneNodes.ambientGain.gain.setValueAtTime(lynchianDroneNodes.ambientGain.gain.value, now);
      lynchianDroneNodes.ambientGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      setTimeout(() => {
        try {
          lynchianDroneNodes?.subOsc.stop();
          lynchianDroneNodes?.detuneOsc.stop();
          lynchianDroneNodes = null;
        } catch (_) {}
      }, 550);
    } else {
      lynchianDroneNodes = null;
    }
  } catch (err) {
    lynchianDroneNodes = null;
  }
}

export function isLynchianDroneActive(): boolean {
  return lynchianDroneNodes !== null;
}

/**
 * Synthesizes the Large Sonic Collider (LSC) Particle Beam Injection & Collision Event:
 * 1. Beam Acceleration: Rising frequency dual-oscillator siren sweep (120Hz -> 1800Hz)
 * 2. Quantum Compression: Resonant bandpass filter narrowing
 * 3. Collision Event: Sub-bass sonic boom (45Hz) + white noise spark burst + harmonic crystal chime
 */
export function playColliderInjectionSound(onCollisionImpact?: () => void) {
  if (isUiSoundFxMuted || isRecordingSafetyLockActive) {
    if (onCollisionImpact) onCollisionImpact();
    return;
  }
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    // --- ACCELERATOR BEAM 1 (Rising Sine/Saw) ---
    const beam1 = ctx.createOscillator();
    const beam1Gain = ctx.createGain();
    beam1.type = 'sawtooth';
    beam1.frequency.setValueAtTime(110, now);
    beam1.frequency.exponentialRampToValueAtTime(1600, now + 1.2);

    beam1Gain.gain.setValueAtTime(0.01, now);
    beam1Gain.gain.linearRampToValueAtTime(0.18, now + 1.1);
    beam1Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    // --- ACCELERATOR BEAM 2 (Counter-Oscillator Detuned Tri) ---
    const beam2 = ctx.createOscillator();
    const beam2Gain = ctx.createGain();
    beam2.type = 'triangle';
    beam2.frequency.setValueAtTime(130, now);
    beam2.frequency.exponentialRampToValueAtTime(1750, now + 1.2);

    beam2Gain.gain.setValueAtTime(0.01, now);
    beam2Gain.gain.linearRampToValueAtTime(0.15, now + 1.1);
    beam2Gain.gain.exponentialRampToValueAtTime(0.001, now + 1.25);

    // Dynamic Filter
    const beamFilter = ctx.createBiquadFilter();
    beamFilter.type = 'bandpass';
    beamFilter.frequency.setValueAtTime(400, now);
    beamFilter.frequency.exponentialRampToValueAtTime(3200, now + 1.2);
    beamFilter.Q.value = 6;

    beam1.connect(beam1Gain).connect(beamFilter);
    beam2.connect(beam2Gain).connect(beamFilter);
    beamFilter.connect(ctx.destination);

    beam1.start(now);
    beam1.stop(now + 1.3);
    beam2.start(now);
    beam2.stop(now + 1.3);

    // --- COLLISION IMPACT (At 1.2 seconds) ---
    const impactTime = now + 1.2;

    // Trigger visual callback at the exact impact moment
    if (onCollisionImpact) {
      setTimeout(() => {
        try {
          onCollisionImpact();
        } catch (_) {}
      }, 1200);
    }

    // Sub-bass collision thud
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(90, impactTime);
    subOsc.frequency.exponentialRampToValueAtTime(35, impactTime + 0.5);

    subGain.gain.setValueAtTime(0.4, impactTime);
    subGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.6);

    subOsc.connect(subGain).connect(ctx.destination);
    subOsc.start(impactTime);
    subOsc.stop(impactTime + 0.65);

    // Quantum Spark Burst (Noise buffer burst)
    const bufferSize = ctx.sampleRate * 0.4;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.08));
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = noiseBuffer;

    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.setValueAtTime(1800, impactTime);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.25, impactTime);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, impactTime + 0.35);

    noiseSource.connect(noiseFilter).connect(noiseGain).connect(ctx.destination);
    noiseSource.start(impactTime);

    // Harmonic crystalline bell shimmer
    [1046.5, 1318.5, 1567.98, 2093.0].forEach((freq, idx) => {
      const bellOsc = ctx.createOscillator();
      const bellGain = ctx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.setValueAtTime(freq, impactTime + idx * 0.03);

      bellGain.gain.setValueAtTime(0.08, impactTime + idx * 0.03);
      bellGain.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.8 + idx * 0.1);

      bellOsc.connect(bellGain).connect(ctx.destination);
      bellOsc.start(impactTime + idx * 0.03);
      bellOsc.stop(impactTime + 0.9 + idx * 0.1);
    });

  } catch (err) {
    console.warn('Collider sound synthesis failed:', err);
  }
}


