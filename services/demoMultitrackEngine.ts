// services/demoMultitrackEngine.ts
// Procedural studio-grade multitrack stem synthesizer for Strangelet Lab demo session:
// 'The Breach (Quantum Lab Multitrack Mix)' — 124 BPM, Key of A Minor, 16 Bars.

export type StemRole = 'vocal' | 'drums' | 'bass' | 'pad' | 'guitar';

export function determineStemRole(trackName: string, trackId: string): StemRole {
  const n = (trackName || '').toLowerCase();
  if (n.includes('vox') || n.includes('vocal') || trackId === '1') return 'vocal';
  if (n.includes('drum') || n.includes('beat') || n.includes('percussion') || trackId === '2') return 'drums';
  if (n.includes('bass') || n.includes('303') || trackId === '3') return 'bass';
  if (n.includes('pad') || n.includes('synth') || n.includes('atmos') || trackId === '4') return 'pad';
  if (n.includes('guitar') || n.includes('lead') || trackId === '5') return 'guitar';
  return 'pad';
}

export function synthesizeDemoStemBuffer(
  ctx: AudioContext,
  role: StemRole,
  tempo: number = 124,
  totalBars: number = 16
): AudioBuffer {
  const sampleRate = ctx.sampleRate || 44100;
  const beatSec = 60.0 / Math.max(60, Math.min(220, tempo));
  const barSec = beatSec * 4.0;
  const totalDuration = totalBars * barSec;
  const totalSamples = Math.floor(totalDuration * sampleRate);

  const buffer = ctx.createBuffer(2, totalSamples, sampleRate);
  const left = buffer.getChannelData(0);
  const right = buffer.getChannelData(1);

  // Root progressions for 16 bars (4 bars each: Am, F, C, G/Em)
  const getChordRoot = (barIndex: number) => {
    const sec = Math.floor(barIndex / 4) % 4;
    switch (sec) {
      case 0: return { freq: 55.0, name: 'Am', triad: [220.0, 261.63, 329.63, 440.0] };     // A minor
      case 1: return { freq: 43.65, name: 'F', triad: [174.61, 220.0, 261.63, 349.23] };     // F major
      case 2: return { freq: 65.41, name: 'C', triad: [261.63, 329.63, 392.0, 523.25] };     // C major
      case 3: return { freq: 49.0, name: 'G', triad: [196.0, 246.94, 293.66, 392.0] };       // G major
      default: return { freq: 55.0, name: 'Am', triad: [220.0, 261.63, 329.63, 440.0] };
    }
  };

  for (let i = 0; i < totalSamples; i++) {
    const t = i / sampleRate;
    const currentBar = Math.floor(t / barSec) % totalBars;
    const timeInBar = t % barSec;
    const beatIndex = Math.floor(timeInBar / beatSec) % 4;
    const beatTime = timeInBar % beatSec;
    const sixteenth = Math.floor((timeInBar % beatSec) / (beatSec / 4)) % 4;
    const sixteenthTime = (timeInBar % (beatSec / 4));

    const chord = getChordRoot(currentBar);

    let sampleL = 0;
    let sampleR = 0;

    switch (role) {
      // ─────────────────────────────────────────────────────────────
      // 1. DRUMS & PERCUSSION
      // ─────────────────────────────────────────────────────────────
      case 'drums': {
        // Kick on beats 0 & 2 (plus syncopated 16th kick on beat 3.75 in bars 4, 8, 12, 16)
        const isKickBeat = (beatIndex === 0 || beatIndex === 2);
        const isSyncKick = (beatIndex === 3 && sixteenth === 2 && currentBar % 2 === 1);
        if (isKickBeat && beatTime < 0.22) {
          const env = Math.exp(-beatTime * 24);
          const f = 50 + 90 * Math.exp(-beatTime * 45);
          const k = Math.sin(2 * Math.PI * f * beatTime) * 0.75 * env;
          sampleL += k;
          sampleR += k;
        } else if (isSyncKick && sixteenthTime < 0.18) {
          const env = Math.exp(-sixteenthTime * 28);
          const f = 50 + 80 * Math.exp(-sixteenthTime * 45);
          const k = Math.sin(2 * Math.PI * f * sixteenthTime) * 0.6 * env;
          sampleL += k;
          sampleR += k;
        }

        // Snare on beats 1 & 3
        if ((beatIndex === 1 || beatIndex === 3) && beatTime < 0.28) {
          const env = Math.exp(-beatTime * 18);
          const tone = Math.sin(2 * Math.PI * 215 * beatTime) * 0.35 * env;
          const noise = (Math.random() - 0.5) * 0.45 * env;
          sampleL += (tone + noise * 1.05);
          sampleR += (tone + noise * 0.95);
        }

        // Closed Hi-Hat on 16th notes with subtle swing & velocity accents
        const hatEnv = Math.exp(-sixteenthTime * 65);
        if (hatEnv > 0.005) {
          const hatVel = (sixteenth === 0 || sixteenth === 2) ? 0.18 : 0.12;
          const hNoise = (Math.random() - 0.5) * hatVel * hatEnv;
          // Pan alternate 16ths slightly
          sampleL += hNoise * (sixteenth % 2 === 0 ? 0.7 : 1.1);
          sampleR += hNoise * (sixteenth % 2 === 0 ? 1.1 : 0.7);
        }

        // Open Hi-Hat on offbeat (beatTime around 0.5 of beat)
        if (sixteenth === 2 && sixteenthTime < 0.25) {
          const oEnv = Math.exp(-sixteenthTime * 16);
          const oNoise = (Math.random() - 0.5) * 0.22 * oEnv;
          sampleL += oNoise * 0.85;
          sampleR += oNoise * 1.15;
        }

        // Crash Cymbal at Bar 0 and Bar 8
        if ((currentBar === 0 || currentBar === 8) && timeInBar < 2.0) {
          const cEnv = Math.exp(-timeInBar * 2.8);
          const cNoise = (Math.random() - 0.5) * 0.25 * cEnv;
          sampleL += cNoise * 1.1;
          sampleR += cNoise * 0.9;
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 2. ACID 303 BASSLINE
      // ─────────────────────────────────────────────────────────────
      case 'bass': {
        const rootFreq = chord.freq;
        // 16th note acid step patterns with octave hops on 16ths #1 and #3
        const octaveMul = (sixteenth === 1 || sixteenth === 3) ? 2.0 : 1.0;
        const noteFreq = rootFreq * octaveMul;

        // Cutoff sweep modulated over 4 bars (simulating TB-303 diode resonance)
        const sweepPhase = (timeInBar / barSec);
        const filterCutoff = 450 + 2400 * (0.5 + 0.5 * Math.sin(2 * Math.PI * (sweepPhase + currentBar * 0.25)));

        const noteEnv = Math.exp(-sixteenthTime * 12);
        if (noteEnv > 0.01) {
          // Band-limited sawtooth proxy
          const phase = (t * noteFreq) % 1;
          const saw = (2 * phase - 1);
          const sub = Math.sin(2 * Math.PI * rootFreq * t) * 0.4;
          const resonance = Math.sin(2 * Math.PI * filterCutoff * sixteenthTime) * 0.25 * noteEnv;

          const saturated = Math.tanh((saw * 0.5 + sub + resonance) * 1.6) * 0.75 * noteEnv;
          sampleL += saturated;
          sampleR += saturated;
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 3. LEAD VOCALS & HARMONY (The Breach Vocal Chants)
      // ─────────────────────────────────────────────────────────────
      case 'vocal': {
        // Melodic line: A4 (440) -> C5 (523) -> D5 (587) -> E5 (659) -> C5 (523) -> A4 (440)
        const melodyNotes = [440.0, 523.25, 587.33, 659.25];
        const noteIdx = Math.floor(timeInBar / beatSec) % 4;
        const vPitch = melodyNotes[noteIdx];
        const vibrato = Math.sin(2 * Math.PI * 5.2 * t) * 4.5;
        const vFreq = vPitch + vibrato;

        // Note envelope (smooth attack and release over each beat)
        const vEnv = Math.sin(Math.PI * (beatTime / beatSec));
        if (vEnv > 0) {
          // Formant approximation (dual band resonances at ~800Hz and ~1300Hz)
          const f1 = Math.sin(2 * Math.PI * vFreq * t);
          const f2 = Math.sin(2 * Math.PI * (vFreq * 2.02) * t) * 0.35;
          const f3 = Math.sin(2 * Math.PI * (vFreq * 3.01) * t) * 0.15;
          const rawVox = (f1 + f2 + f3) * 0.45 * Math.pow(vEnv, 0.7);

          // In bars 8-15, add 3rd/5th harmony layer
          let harmonyVox = 0;
          if (currentBar >= 8) {
            const hFreq = (vPitch * 1.25) + vibrato; // Minor/Major third harmony
            harmonyVox = Math.sin(2 * Math.PI * hFreq * t) * 0.3 * Math.pow(vEnv, 0.7);
          }

          sampleL += (rawVox * 0.85 + harmonyVox * 0.4);
          sampleR += (rawVox * 0.85 + harmonyVox * 0.85);
        }
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 4. COSMIC SYNTH PAD (Atmospheric Shimmer)
      // ─────────────────────────────────────────────────────────────
      case 'pad': {
        // Polyphonic 4-voice triad chords with 1.2s smooth crossfade
        const triad = chord.triad;
        const chorusLfo = Math.sin(2 * Math.PI * 0.35 * t);

        triad.forEach((freq, idx) => {
          // Slight detune between L and R for wide lush stereo spread
          const detuneL = 1.0 - 0.003 * (idx + 1);
          const detuneR = 1.0 + 0.003 * (idx + 1);
          const voiceL = Math.sin(2 * Math.PI * (freq * detuneL) * t);
          const voiceR = Math.sin(2 * Math.PI * (freq * detuneR) * t);

          sampleL += voiceL * 0.11;
          sampleR += voiceR * 0.11;
        });

        // Add soft sub octave drone
        const subDrone = Math.sin(2 * Math.PI * (chord.freq * 2) * t) * 0.18;
        sampleL += subDrone;
        sampleR += subDrone;

        // Apply gentle chorus width
        sampleL *= (0.9 + 0.1 * chorusLfo);
        sampleR *= (0.9 - 0.1 * chorusLfo);
        break;
      }

      // ─────────────────────────────────────────────────────────────
      // 5. OCCULT LEAD GUITAR
      // ─────────────────────────────────────────────────────────────
      case 'guitar': {
        // Plucked fingerstyle arpeggio across the chord triad
        if (currentBar >= 2) {
          const arpNotes = [chord.triad[0], chord.triad[1], chord.triad[2], chord.triad[1]];
          const arpPitch = arpNotes[beatIndex];
          const gEnv = Math.exp(-beatTime * 7.5);
          if (gEnv > 0.005) {
            const gTone = Math.sin(2 * Math.PI * arpPitch * beatTime) * 0.28 * gEnv;
            const gHarm = Math.sin(2 * Math.PI * arpPitch * 2.0 * beatTime) * 0.14 * (gEnv * gEnv);
            sampleL += (gTone + gHarm) * 0.95;
            sampleR += (gTone + gHarm) * 0.65;
          }
        }
        break;
      }
    }

    // Gentle soft clip limiter to guarantee no digital overs
    left[i] = Math.max(-0.95, Math.min(0.95, sampleL));
    right[i] = Math.max(-0.95, Math.min(0.95, sampleR));
  }

  return buffer;
}
