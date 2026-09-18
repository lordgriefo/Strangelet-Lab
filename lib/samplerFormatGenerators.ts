// Universal Sampler Format Generators: SFZ v2, NI Kontakt, Ableton Live Sampler, Decent Sampler
// Expanded for Strangelet Lab Open SFZ v2 Engine:
// - Pure Web Synthesis Hybrids (sample=synth:karplus_strong, sample=synth:fm_sine, etc.)
// - Vector Morphing (4-Way X/Y Vector Grid macro script)
// - Dynamic SVG & Shader Canvas Themes (// <canvas theme="noir_velvet" ... />)
// - Algorithmic Micro-Tuning & Scala (.scl) scale opcodes (scale_file=..., micro_tune_cents=...)
// - Integrated Convolution IR & Tape Saturation opcodes (effect_type=tape_saturator, tape_drive=...)

export interface SamplerRegionSpec {
  id: string;
  name: string;
  sample: string;
  hybridSynth?: 'synth:karplus_strong' | 'synth:fm_sine' | 'synth:sub_bass' | 'synth:theremin' | 'synth:noise_burst';
  vectorCorner?: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  lokey: number;
  hikey: number;
  pitch_keycenter: number;
  lovel: number;
  hivel: number;
  offsetSamples?: number;
  endSamples?: number;
  tuneCents: number;
  volumeDb: number;
  panPercent: number;
  direction: 'forward' | 'reverse';
  loop_mode: 'no_loop' | 'loop_continuous' | 'loop_sustain';
  normalizedGainDb?: number;
}

export interface VectorMorphCorner {
  pos: 'top_left' | 'top_right' | 'bottom_left' | 'bottom_right';
  label: string;
  target: string;
}

export interface VectorMorphConfig {
  padId: string;
  x: number; // 0 to 1
  y: number; // 0 to 1
  thirdMindGenerative?: boolean;
  corners: VectorMorphCorner[];
}

export interface CanvasThemeConfig {
  theme: 'noir_velvet' | 'vacuum_tube_crt' | 'cyberpunk_amber' | 'bw_chevron';
  reactiveTubes: boolean;
  oscilloscopeBeam: boolean;
}

export interface SamplerGlobalSpec {
  instrumentName: string;
  defaultPath: string;
  attackSec: number;
  decaySec: number;
  sustainRatio: number;
  releaseSec: number;
  cutoffHz: number;
  resonanceQ: number;
  masterVolumeDb: number;
  // Enhanced Open SFZ Opcodes
  tapeDrive?: number;       // 0 to 1
  tapeWow?: number;         // 0 to 1
  tapeFlutter?: number;     // 0 to 1
  tapeAge?: number;         // 0 to 1
  irSample?: string;        // e.g. spring_reverb_tank.wav, dark_chamber.wav
  reverbMix?: number;       // 0 to 1
  scaleFile?: string;       // e.g. just_intonation.scl, bohlen_pierce.scl
  scaleName?: string;       // human readable scale name
  microTuneCents?: number;  // global microtonal offset
  vectorMorph?: VectorMorphConfig;
  canvasTheme?: CanvasThemeConfig;
}

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNote(midi: number): string {
  const note = NOTE_NAMES[midi % 12];
  const octave = Math.floor(midi / 12) - 1;
  return `${note}${octave}`;
}

/**
 * 1. Open-Source SFZ v2 Text Specification
 * Fully standards-compliant Open-Source SFZ 2.0 with web-native hybrid & macro extensions.
 */
export function generateSfzSpec(global: SamplerGlobalSpec, regions: SamplerRegionSpec[]): string {
  let out = `// ====================================================================\n`;
  out += `// STRANGELET LAB // OPEN-SOURCE SFZ v2 SPECIFICATION\n`;
  out += `// Instrument: ${global.instrumentName}\n`;
  out += `// Standard Open SFZ 2.0 + WebAssembly/Live Synthesis Hybrid Extensions\n`;
  out += `// Compatible with: sfizz, LinuxSampler, ARIA Engine, Carla, DecentSampler\n`;
  out += `// ====================================================================\n\n`;

  out += `<control>\n`;
  out += `default_path=${global.defaultPath.endsWith('/') ? global.defaultPath : global.defaultPath + '/'}\n`;
  out += `hint_ram_based=1\n`;

  // Micro-tuning opcode extension
  if (global.scaleFile || global.scaleName) {
    out += `\n// --- ALGORITHMIC MICRO-TUNING & SCALA MAP ---\n`;
    if (global.scaleFile) out += `scale_file=${global.scaleFile}\n`;
    if (global.scaleName) out += `// scale_name="${global.scaleName}"\n`;
    if (global.microTuneCents && global.microTuneCents !== 0) {
      out += `micro_tune_cents=${global.microTuneCents}\n`;
    }
  }

  // Vector morphing macro block
  if (global.vectorMorph) {
    const vm = global.vectorMorph;
    out += `\n// --- 4-WAY X/Y VECTOR MORPHING MACRO GRID ---\n`;
    out += `// <vector_morph pad="${vm.padId}" x="${vm.x.toFixed(2)}" y="${vm.y.toFixed(2)}" third_mind="${vm.thirdMindGenerative ? '1' : '0'}">\n`;
    vm.corners.forEach(c => {
      out += `//   <corner pos="${c.pos}" target="${c.target}" label="${c.label}" />\n`;
    });
    out += `//   <filter_mod min_hz="200" max_hz="${Math.round(global.cutoffHz)}" />\n`;
    out += `// </vector_morph>\n`;
  }

  // Dynamic canvas theme block
  if (global.canvasTheme) {
    const ct = global.canvasTheme;
    out += `\n// --- DYNAMIC SVG & SHADER CANVAS THEME ---\n`;
    out += `// <canvas theme="${ct.theme}" reactive_tubes="${ct.reactiveTubes ? '1' : '0'}" oscilloscope="${ct.oscilloscopeBeam ? '1' : '0'}">\n`;
    out += `//   <ui width="840" height="340" bg="chiaroscuro_noir.png" />\n`;
    out += `// </canvas>\n`;
  }

  out += `\n<global>\n`;
  out += `ampeg_attack=${global.attackSec.toFixed(3)}\n`;
  out += `ampeg_decay=${global.decaySec.toFixed(3)}\n`;
  out += `ampeg_sustain=${global.sustainRatio.toFixed(2)}\n`;
  out += `ampeg_release=${global.releaseSec.toFixed(3)}\n`;
  out += `cutoff=${Math.round(global.cutoffHz)}\n`;
  out += `resonance=${global.resonanceQ.toFixed(1)}\n`;
  if (global.masterVolumeDb !== 0) {
    out += `volume=${global.masterVolumeDb.toFixed(1)}\n`;
  }

  // Integrated Tape Saturation & Convolution Reverb opcodes
  if (global.tapeDrive !== undefined || global.irSample) {
    out += `\n// --- INTEGRATED TAPE SATURATION & CONVOLUTION REVERB ---\n`;
    out += `effect_type=tape_saturator\n`;
    if (global.tapeDrive !== undefined) out += `tape_drive=${global.tapeDrive.toFixed(2)}\n`;
    if (global.tapeWow !== undefined) out += `tape_wow=${global.tapeWow.toFixed(2)}\n`;
    if (global.tapeFlutter !== undefined) out += `tape_flutter=${global.tapeFlutter.toFixed(2)}\n`;
    if (global.tapeAge !== undefined) out += `tape_age=${global.tapeAge.toFixed(2)}\n`;
    if (global.irSample) out += `ir_sample=${global.irSample}\n`;
    if (global.reverbMix !== undefined) out += `reverb_mix=${global.reverbMix.toFixed(2)}\n`;
  }

  out += `\n<group>\n`;
  out += `group_name=${global.instrumentName.replace(/\s+/g, '_')}\n`;
  out += `polyphony=32\n\n`;

  regions.forEach((reg, i) => {
    out += `<region>\n`;
    out += `// --- Zone ${i + 1}: ${reg.name} ---\n`;
    
    // Sample or Pure Web Synthesis Hybrid
    const sampleTarget = reg.hybridSynth || reg.sample;
    out += `sample=${sampleTarget}\n`;

    if (reg.vectorCorner) {
      out += `// vector_corner=${reg.vectorCorner}\n`;
    }

    out += `lokey=${reg.lokey} // ${midiToNote(reg.lokey)}\n`;
    out += `hikey=${reg.hikey} // ${midiToNote(reg.hikey)}\n`;
    out += `pitch_keycenter=${reg.pitch_keycenter} // ${midiToNote(reg.pitch_keycenter)}\n`;

    if (reg.lovel !== 0 || reg.hivel !== 127) {
      out += `lovel=${reg.lovel}\n`;
      out += `hivel=${reg.hivel}\n`;
    }

    if (reg.offsetSamples && reg.offsetSamples > 0) {
      out += `offset=${reg.offsetSamples}\n`;
    }
    if (reg.endSamples && reg.endSamples > 0) {
      out += `end=${reg.endSamples}\n`;
    }

    if (reg.tuneCents !== 0) {
      out += `tune=${reg.tuneCents}\n`;
    }

    const effectiveVol = reg.volumeDb + (reg.normalizedGainDb || 0);
    if (effectiveVol !== 0) {
      out += `volume=${effectiveVol.toFixed(1)}\n`;
    }

    if (reg.panPercent !== 0) {
      out += `pan=${reg.panPercent}\n`;
    }

    if (reg.direction === 'reverse') {
      out += `direction=reverse\n`;
    }

    if (reg.loop_mode && reg.loop_mode !== 'no_loop') {
      out += `loop_mode=${reg.loop_mode}\n`;
    }

    out += `\n`;
  });

  return out;
}

/**
 * 2. Native Instruments Kontakt Instrument Mapping & KSP Script
 */
export function generateKontaktSpec(global: SamplerGlobalSpec, regions: SamplerRegionSpec[]): string {
  let out = `{ ==================================================================== }\n`;
  out += `{ NATIVE INSTRUMENTS KONTAKT 6 / 7 MULTISAMPLE SCRIPT & ZONE MAPPING  }\n`;
  out += `{ Instrument: ${global.instrumentName}                                  }\n`;
  out += `{ Generated by Strangelet Lab Universal Instrument Builder            }\n`;
  out += `{ Format: Kontakt KSP Script & Mapping Specification (.ksp / .txt)    }\n`;
  out += `{ ==================================================================== }\n\n`;

  out += `on init\n`;
  out += `  message("${global.instrumentName} Loaded Successfully")\n`;
  out += `  make_perfview\n`;
  out += `  set_ui_height_px(340)\n`;
  out += `  set_ui_width_px(640)\n\n`;

  out += `  { Performance UI Controls: Tape Deck & Filter }\n`;
  out += `  declare ui_knob $Cutoff (20, 20000, 1)\n`;
  out += `  $Cutoff := ${Math.round(global.cutoffHz)}\n`;
  out += `  set_text($Cutoff, "Filter Cutoff")\n`;
  out += `  set_knob_unit($Cutoff, $KNOB_UNIT_HZ)\n\n`;

  out += `  declare ui_knob $TapeDrive (0, 100, 1)\n`;
  out += `  $TapeDrive := ${Math.round((global.tapeDrive ?? 0.45) * 100)}\n`;
  out += `  set_text($TapeDrive, "Tape Drive")\n`;
  out += `  set_knob_unit($TapeDrive, $KNOB_UNIT_PERCENT)\n\n`;

  out += `  declare ui_knob $TapeFlutter (0, 100, 1)\n`;
  out += `  $TapeFlutter := ${Math.round((global.tapeFlutter ?? 0.25) * 100)}\n`;
  out += `  set_text($TapeFlutter, "Wow / Flutter")\n`;
  out += `  set_knob_unit($TapeFlutter, $KNOB_UNIT_PERCENT)\n\n`;

  out += `  declare ui_knob $SpringReverb (0, 100, 1)\n`;
  out += `  $SpringReverb := ${Math.round((global.reverbMix ?? 0.3) * 100)}\n`;
  out += `  set_text($SpringReverb, "Spring Tank")\n`;
  out += `  set_knob_unit($SpringReverb, $KNOB_UNIT_PERCENT)\n\n`;

  out += `  declare ui_knob $Attack (1, 5000, 1)\n`;
  out += `  $Attack := ${Math.round(global.attackSec * 1000)}\n`;
  out += `  set_text($Attack, "Attack")\n`;
  out += `  set_knob_unit($Attack, $KNOB_UNIT_MS)\n\n`;

  out += `  declare ui_knob $Release (10, 8000, 1)\n`;
  out += `  $Release := ${Math.round(global.releaseSec * 1000)}\n`;
  out += `  set_text($Release, "Release")\n`;
  out += `  set_knob_unit($Release, $KNOB_UNIT_MS)\n`;
  out += `end on\n\n`;

  out += `on note\n`;
  out += `  { Polyphonic zone trigger logic }\n`;
  out += `  ignore_event($EVENT_ID)\n`;
  out += `  play_note($EVENT_NOTE, $EVENT_VELOCITY, 0, -1)\n`;
  out += `end on\n\n`;

  out += `[KONTAKT MULTISAMPLE ZONE MAPPING MATRIX]\n`;
  out += `// Total Mapped Zones: ${regions.length}\n`;
  out += `// Default Sample Directory: ${global.defaultPath}\n`;
  if (global.scaleName) out += `// Scale Tuning Map: ${global.scaleName}\n`;
  out += `\n`;

  regions.forEach((reg, i) => {
    out += `Zone_${i + 1}:\n`;
    out += `  Name              = "${reg.name}"\n`;
    out += `  Sample_File       = "${global.defaultPath}${reg.hybridSynth || reg.sample}"\n`;
    out += `  Key_Range         = [${reg.lokey} .. ${reg.hikey}] (${midiToNote(reg.lokey)} to ${midiToNote(reg.hikey)})\n`;
    out += `  Root_Key          = ${reg.pitch_keycenter} (${midiToNote(reg.pitch_keycenter)})\n`;
    out += `  Velocity_Range    = [${reg.lovel} .. ${reg.hivel}]\n`;
    out += `  Tuning_Cents      = ${reg.tuneCents}\n`;
    out += `  Volume_dB         = ${(reg.volumeDb + (reg.normalizedGainDb || 0)).toFixed(1)}\n`;
    out += `  Pan_Percent       = ${reg.panPercent}\n`;
    out += `  Sample_Start_Trim = ${reg.offsetSamples || 0} samples\n`;
    out += `  Sample_End_Trim   = ${reg.endSamples || 'EOF'} samples\n`;
    out += `  Reverse_Playback  = ${reg.direction === 'reverse' ? 'ENABLED' : 'DISABLED'}\n`;
    out += `  Loop_Type         = ${reg.loop_mode}\n\n`;
  });

  return out;
}

/**
 * 3. Ableton Live Sampler / Simpler Device Preset (.adv / .xml)
 */
export function generateAbletonSamplerSpec(global: SamplerGlobalSpec, regions: SamplerRegionSpec[]): string {
  let out = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  out += `<!-- Ableton Live Sampler / Simpler Device Preset (.adv XML specification) -->\n`;
  out += `<!-- Instrument: ${global.instrumentName} -->\n`;
  out += `<!-- Generated by Strangelet Lab Universal Instrument Builder -->\n`;
  out += `<Ableton MajorVersion="5" MinorVersion="11.0_11300" SchemaChangeCount="4" Creator="Strangelet Lab SFZ Engine">\n`;
  out += `  <MultiSampler PresetName="${global.instrumentName}">\n`;
  out += `    <Name Value="${global.instrumentName}" />\n`;
  out += `    <Player>\n`;
  out += `      <SampleParts>\n`;

  regions.forEach((reg, i) => {
    const isReverse = reg.direction === 'reverse' ? 'true' : 'false';
    const effVol = (reg.volumeDb + (reg.normalizedGainDb || 0)).toFixed(2);
    out += `        <MultiSamplePart Id="${i + 1}">\n`;
    out += `          <Name Value="${reg.name}" />\n`;
    out += `          <SampleRef>\n`;
    out += `            <FileRef>\n`;
    out += `              <Path Value="${global.defaultPath}${reg.hybridSynth || reg.sample}" />\n`;
    out += `              <Name Value="${reg.hybridSynth || reg.sample}" />\n`;
    out += `              <Type Value="Wave" />\n`;
    out += `            </FileRef>\n`;
    out += `          </SampleRef>\n`;
    out += `          <KeyMin Value="${reg.lokey}" /> <!-- ${midiToNote(reg.lokey)} -->\n`;
    out += `          <KeyMax Value="${reg.hikey}" /> <!-- ${midiToNote(reg.hikey)} -->\n`;
    out += `          <RootKey Value="${reg.pitch_keycenter}" /> <!-- ${midiToNote(reg.pitch_keycenter)} -->\n`;
    out += `          <VelocityMin Value="${reg.lovel}" />\n`;
    out += `          <VelocityMax Value="${reg.hivel}" />\n`;
    out += `          <SampleStart Value="${reg.offsetSamples || 0}" />\n`;
    out += `          <SampleEnd Value="${reg.endSamples || 0}" />\n`;
    out += `          <Detune Value="${reg.tuneCents}" />\n`;
    out += `          <Volume Value="${effVol}" />\n`;
    out += `          <Pan Value="${(reg.panPercent / 100).toFixed(2)}" />\n`;
    out += `          <Reverse Value="${isReverse}" />\n`;
    out += `          <LoopMode Value="${reg.loop_mode === 'no_loop' ? '0' : '1'}" />\n`;
    out += `        </MultiSamplePart>\n`;
  });

  out += `      </SampleParts>\n`;
  out += `    </Player>\n`;
  out += `    <Filter>\n`;
  out += `      <On Value="true" />\n`;
  out += `      <Type Value="LowPass24" />\n`;
  out += `      <Freq Value="${Math.round(global.cutoffHz)}" />\n`;
  out += `      <Res Value="${global.resonanceQ.toFixed(2)}" />\n`;
  out += `    </Filter>\n`;
  out += `    <VolumeEnvelope>\n`;
  out += `      <Attack Value="${global.attackSec.toFixed(3)}" />\n`;
  out += `      <Decay Value="${global.decaySec.toFixed(3)}" />\n`;
  out += `      <Sustain Value="${global.sustainRatio.toFixed(2)}" />\n`;
  out += `      <Release Value="${global.releaseSec.toFixed(3)}" />\n`;
  out += `    </VolumeEnvelope>\n`;
  out += `  </MultiSampler>\n`;
  out += `</Ableton>\n`;

  return out;
}

/**
 * 4. Decent Sampler Preset (.dspreset)
 */
export function generateDecentSamplerSpec(global: SamplerGlobalSpec, regions: SamplerRegionSpec[]): string {
  let out = `<?xml version="1.0" encoding="UTF-8"?>\n`;
  out += `<DecentSampler minVersion="1.0.0">\n`;
  out += `  <!-- ${global.instrumentName} Decent Sampler Preset -->\n`;
  out += `  <ui width="840" height="380" bgImage="skin_tape_noir.png">\n`;
  out += `    <waveform x="40" y="24" width="760" height="110" sampleRate="48000" color="#00F0FF" />\n`;
  out += `    <tab name="Main">\n`;
  out += `      <labeled-knob x="60" y="160" label="TAPE DRIVE" type="float" minValue="0" maxValue="1" value="${(global.tapeDrive ?? 0.5).toFixed(2)}" />\n`;
  out += `      <labeled-knob x="190" y="160" label="WOW / FLUTTER" type="float" minValue="0" maxValue="1" value="${(global.tapeFlutter ?? 0.25).toFixed(2)}" />\n`;
  out += `      <labeled-knob x="320" y="160" label="CUTOFF" type="float" minValue="20" maxValue="20000" value="${Math.round(global.cutoffHz)}" />\n`;
  out += `      <labeled-knob x="450" y="160" label="ATTACK" type="float" minValue="0.001" maxValue="2.0" value="${global.attackSec.toFixed(3)}" />\n`;
  out += `      <labeled-knob x="580" y="160" label="RELEASE" type="float" minValue="0.01" maxValue="4.0" value="${global.releaseSec.toFixed(3)}" />\n`;
  out += `      <labeled-knob x="710" y="160" label="SPRING REV" type="float" minValue="0" maxValue="1" value="${(global.reverbMix ?? 0.35).toFixed(2)}" />\n`;
  out += `    </tab>\n`;
  out += `  </ui>\n`;
  out += `  <groups>\n`;
  out += `    <group name="${global.instrumentName.replace(/\s+/g, '_')}" attack="${global.attackSec.toFixed(3)}" decay="${global.decaySec.toFixed(3)}" sustain="${global.sustainRatio.toFixed(2)}" release="${global.releaseSec.toFixed(3)}">\n`;

  regions.forEach((reg) => {
    const effVol = (reg.volumeDb + (reg.normalizedGainDb || 0)).toFixed(1);
    out += `      <sample path="${global.defaultPath}${reg.hybridSynth || reg.sample}" `;
    out += `loNote="${reg.lokey}" hiNote="${reg.hikey}" rootNote="${reg.pitch_keycenter}" `;
    out += `tuning="${reg.tuneCents}" volume="${effVol}" `;
    if (reg.offsetSamples) out += `start="${reg.offsetSamples}" `;
    if (reg.endSamples) out += `end="${reg.endSamples}" `;
    if (reg.loop_mode !== 'no_loop') out += `loopEnabled="true" `;
    out += `/>\n`;
  });

  out += `    </group>\n`;
  out += `  </groups>\n`;
  out += `  <effects>\n`;
  out += `    <effect type="lowpass" frequency="${Math.round(global.cutoffHz)}" />\n`;
  out += `    <effect type="tape_delay" delayTime="0.25" feedback="0.35" mix="0.2" />\n`;
  out += `    <effect type="reverb" roomSize="0.45" damping="0.4" wetLevel="${(global.reverbMix ?? 0.3).toFixed(2)}" />\n`;
  out += `  </effects>\n`;
  out += `</DecentSampler>\n`;

  return out;
}
