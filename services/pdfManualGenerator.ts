// Strangelet Lab - Offline PDF User Guide & Field Manual Generator
// Generates a complete, beautifully formatted multi-page PDF document using jsPDF
// 100% client-side, zero network dependencies, air-gapped offline certified

import { jsPDF } from 'jspdf';

export interface PdfGenerationOptions {
  includeAllSections?: boolean;
  version?: string;
  onProgress?: (progressPercent: number, status: string) => void;
}

export async function generateOfflineManualPdf(options: PdfGenerationOptions = {}): Promise<Blob> {
  const {
    version = 'v2.4.0',
    onProgress
  } = options;

  onProgress?.(10, 'Initializing PDF Document Engine...');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Color Palette
  const darkBg = [10, 14, 28];        // #0A0E1C
  const goldAccent = [245, 158, 11];  // #F59E0B
  const cyanAccent = [6, 182, 212];   // #06B6D4
  const textDark = [30, 41, 59];      // #1E293B
  const textMuted = [100, 116, 139];  // #64748B
  const textBody = [51, 65, 85];      // #334155
  const codeBg = [241, 245, 249];     // #F1F5F9
  const cardBorder = [203, 213, 225]; // #CBD5E1

  // Helper: check page break
  const ensureSpace = (neededHeight: number) => {
    if (cursorY + neededHeight > pageHeight - 18) {
      doc.addPage();
      drawPageHeaderFooter();
      cursorY = 22;
    }
  };

  // Helper: draw Header and Footer on every page
  const drawPageHeaderFooter = () => {
    const totalPages = (doc as any).internal.getNumberOfPages();
    
    // Top subtle bar
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, 12, pageWidth - margin, 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('STRANGELET LAB — OFFICIAL FIELD MANUAL & OS GUIDE', margin, 9.5);
    doc.text('AIR-GAPPED OFFLINE EDITION', pageWidth - margin, 9.5, { align: 'right' });

    // Bottom footer
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text('Quantum-Acoustic Production Workstation • Client-Side DSP • No Cloud Required', margin, pageHeight - 8);
    doc.text(`Page ${totalPages}`, pageWidth - margin, pageHeight - 8, { align: 'right' });
  };

  // Helper: Section title
  const addSectionTitle = (number: string, title: string, category: string) => {
    ensureSpace(24);
    cursorY += 4;

    // Category Pill
    doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.roundedRect(margin, cursorY, 26, 4.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text(category.toUpperCase(), margin + 13, cursorY + 3.2, { align: 'center' });

    cursorY += 7;

    // Title text
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(`${number}. ${title}`, margin, cursorY);
    cursorY += 2;

    // Underline
    doc.setDrawColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, margin + contentWidth, cursorY);
    cursorY += 5;
  };

  // Helper: Subheading
  const addSubheading = (title: string) => {
    ensureSpace(12);
    cursorY += 2;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
    doc.text(title, margin, cursorY);
    cursorY += 4.5;
  };

  // Helper: Paragraph
  const addParagraph = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textBody[0], textBody[1], textBody[2]);
    const lines = doc.splitTextToSize(text, contentWidth);
    const height = lines.length * 4.2;
    ensureSpace(height + 2);
    doc.text(lines, margin, cursorY);
    cursorY += height + 2.5;
  };

  // Helper: Bullet point
  const addBulletPoint = (boldLabel: string, text: string) => {
    doc.setFontSize(8.5);
    const fullText = `${boldLabel} ${text}`;
    const lines = doc.splitTextToSize(fullText, contentWidth - 6);
    const height = lines.length * 4;
    ensureSpace(height + 2);

    // Bullet dot
    doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.circle(margin + 2, cursorY - 1, 1, 'F');

    // Text with bold prefix
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(boldLabel, margin + 5, cursorY);

    const boldWidth = doc.getTextWidth(boldLabel);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(textBody[0], textBody[1], textBody[2]);
    
    // Split the remaining text properly
    const remainingLines = doc.splitTextToSize(` ${text}`, contentWidth - 6 - boldWidth);
    if (remainingLines.length === 1) {
      doc.text(` ${text}`, margin + 5 + boldWidth, cursorY);
      cursorY += 4.2;
    } else {
      // Re-split full text for clean multi-line wrapping
      doc.setFont('helvetica', 'normal');
      doc.text(lines, margin + 5, cursorY);
      cursorY += height + 1.5;
    }
  };

  // Helper: Info Card / Box
  const addCalloutCard = (title: string, lines: string[], accentColor = goldAccent) => {
    const textHeight = lines.length * 4.2 + 8;
    ensureSpace(textHeight + 4);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.4);
    doc.roundedRect(margin, cursorY, contentWidth, textHeight, 2, 2, 'FD');

    // Left accent strip
    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(margin, cursorY, 2.5, textHeight, 1, 1, 'F');

    // Card Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(title.toUpperCase(), margin + 5, cursorY + 4.5);

    // Card Body
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(textBody[0], textBody[1], textBody[2]);
    let cardY = cursorY + 8.5;
    lines.forEach(line => {
      doc.text(line, margin + 5, cardY);
      cardY += 4.2;
    });

    cursorY += textHeight + 4;
  };

  // Helper: Code snippet block
  const addCodeBlock = (codeLines: string[]) => {
    const blockHeight = codeLines.length * 4 + 6;
    ensureSpace(blockHeight + 3);

    doc.setFillColor(codeBg[0], codeBg[1], codeBg[2]);
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, cursorY, contentWidth, blockHeight, 1.5, 1.5, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    let codeY = cursorY + 4.5;
    codeLines.forEach(line => {
      doc.text(line, margin + 4, codeY);
      codeY += 4;
    });

    cursorY += blockHeight + 3;
  };

  // =========================================================================
  // COVER / FRONT TITLE PAGE
  // =========================================================================
  onProgress?.(20, 'Generating Title Cover Page...');

  // Top Dark Banner
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, 85, 'F');

  // Title Accent Glow Strip
  doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.rect(margin, 20, 4, 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('STRANGELET LAB', margin + 8, 30);

  doc.setFontSize(14);
  doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.text('QUANTUM-ACOUSTIC FIELD MANUAL & OPERATING SYSTEM GUIDE', margin + 8, 39);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(`Official Air-Gapped Documentation • Version ${version} • Offline-Certified Architecture`, margin + 8, 48);

  // Status Badges on Dark Banner
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin + 8, 54, 45, 6, 1, 1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(52, 211, 153);
  doc.text('● 100% OFFLINE CAPABLE', margin + 11, 58.2);

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin + 56, 54, 52, 6, 1, 1, 'F');
  doc.setTextColor(56, 189, 248);
  doc.text('● ZERO TELEMETRY / AIR-GAPPED', margin + 59, 58.2);

  cursorY = 96;

  // Executive Overview Box
  addCalloutCard('Executive Abstract', [
    'Strangelet Lab is a browser-native standalone quantum-acoustic Digital Audio Workstation (DAW) and sonic physics synthesizer.',
    'It merges Web Audio DSP, relativistic hadron audio collisions, multi-track timeline editing, Faust DSP compilation,',
    'and offline local AI intelligence (Kobold.cpp, Ollama, LM Studio, Ghost in the Machine, and Strangelet Guru).',
    'This document provides complete instructions for operating all systems in air-gapped studio environments.'
  ], cyanAccent);

  // Table of Contents
  addSubheading('Table of Contents');
  const tocEntries = [
    '1. Architecture & Global Signal Flow (Zero-latency Web Audio, WebAssembly, Multi-threading)',
    '2. Large Sonic Collider (LSC) Quantum Physics Engine & Laser Steering System',
    '3. Gold Path 6-Stage Mastering Suite & Instantaneous A/B Auditioning Console',
    '4. Batch Multi-Core Auto-Mastering Engine (Parallel Stem & Album Processing)',
    '5. Software Dojo AI Training Scrolls & The Strangelet Guru Knowledge System',
    '6. Offline AI Ghost Buddies: Ghost (Llama 3.1) & Quinn (Qwen 2.5) Co-Op Duo',
    '7. Local AI Hub Air-Gapped Connection Guide (Kobold.cpp / Ollama / LM Studio)',
    '8. Beam Splitter Multiband Crossovers & Frequency Demuxing',
    '9. Suno AI De-Sheen, Anti-Fizz & Un-Bake Audio Restoration Engine',
    '10. Faust WebAudio Real-Time DSP Compiler & Live Toy Generator',
    '11. Spotify Basic Pitch Neural Polyphonic Audio-to-MIDI Transcriber',
    '12. Guided Quantum Workflows & Production Templates (LSC -> Ace-Step -> Mixer)',
    '13. SFZ Open Library & Open Community Sample Exchange',
    '14. Ace-Step 1.5 LoRA Lending Library & Sound Diffusion Shapers',
    '15. Hardware Monitor & Dynamic VRAM Scalability Guide (6GB Laptop to 16GB Studio)',
    '16. Master Keyboard Shortcuts & Studio Command Cheatsheet'
  ];

  tocEntries.forEach(entry => {
    addParagraph(`• ${entry}`);
  });

  drawPageHeaderFooter();

  // =========================================================================
  // CHAPTER 1: ARCHITECTURE
  // =========================================================================
  onProgress?.(30, 'Writing Chapter 1: Architecture & Signal Flow...');
  doc.addPage();
  drawPageHeaderFooter();
  cursorY = 22;

  addSectionTitle('1', 'System Architecture & Global Signal Flow', 'Core');
  addParagraph(
    'Strangelet Lab is architected as an ultra-low latency, client-side workstation that executes entirely inside modern Chromium/WebKit Web Audio graphs and WebAssembly threads. At no point is audio compressed, uploaded, or processed on remote cloud servers.'
  );

  addSubheading('Core Architectural Principles');
  addBulletPoint('Zero-Latency Audio Bus:', 'Sub-millisecond buffer dispatch with dedicated gain staging, 3-band surgical channel EQ, and stereo aux sends.');
  addBulletPoint('Multi-Core Parallelism:', 'Audio rendering dispatches concurrent OfflineAudioContext instances across available CPU hardware threads (via navigator.hardwareConcurrency).');
  addBulletPoint('Strict Local Air-Gapping:', 'All AI and DSP tools connect to localhost endpoints (127.0.0.1) without internet access requirements.');
  addBulletPoint('Linear-Phase Precision:', 'Filter networks and mastering stages preserve transient phase alignment to ensure maximum punch and intelligibility.');

  addCalloutCard('Signal Flow Topology', [
    '[Input: Audio / MIDI / Faust] ➔ [Channel Strip Pre-EQ & VST Slots] ➔ [Stereo Bus Routing]',
    '➔ [Master Aux FX Rack] ➔ [Gold Path Mastering Chain / A-B Switcher] ➔ [Hardware Audio DAC / WAV Bounce]'
  ], goldAccent);

  // =========================================================================
  // CHAPTER 2: LARGE SONIC COLLIDER
  // =========================================================================
  onProgress?.(40, 'Writing Chapter 2: Large Sonic Collider...');
  addSectionTitle('2', 'The Large Sonic Collider (Quantum Hadron Synthesis)', 'Physics');
  addParagraph(
    'The Large Sonic Collider (LSC) treats recorded audio stems and synthesizer loops as charged relativistic hadrons inside a superconducting magnetic containment ring. By accelerating these sound particles to near-light speed, micro-collisions create granular fission, Doppler pitch warps, and micro-tonal textures.'
  );

  addSubheading('Physical Parameters & Steering Controls');
  addBulletPoint('Beam Energy (GeV):', 'Accelerates particle orbital velocity. Higher GeV increases Doppler modulation, grain overlap frequency, and collision likelihood.');
  addBulletPoint('Magnetic B-Field (Tesla):', 'Controls ring containment radius. High Tesla values force particles into compressed orbits, causing dense comb filtering and chaotic near-misses.');
  addBulletPoint('Laser Tool Suite:', 'Four interactive beam tools allow direct mouse manipulation of orbiting audio hadrons:');
  addParagraph('  • Inspect: Displays real-time spectral centroid, instantaneous frequency, and harmonic mass.');
  addParagraph('  • Gravity Well: Creates an intense localized gravitational vortex, pulling hadrons together to force fission bursts.');
  addParagraph('  • Repulsor Beam: Sweeps hadrons outward with Doppler pitch dive-bombs and flanging phase shifts.');
  addParagraph('  • Exciter / Ionizer: Injects high-frequency tape sheen and sub-harmonic sub-bass on contact.');

  // =========================================================================
  // CHAPTER 3: GOLD PATH MASTERING SUITE & A/B AUDITIONING
  // =========================================================================
  onProgress?.(50, 'Writing Chapter 3: Gold Path Mastering & A/B...');
  doc.addPage();
  drawPageHeaderFooter();
  cursorY = 22;

  addSectionTitle('3', 'Gold Path 6-Stage Mastering Suite & A/B Console', 'Mastering');
  addParagraph(
    'The Gold Path is Strangelet Lab\'s premier reference-grade output chain designed to achieve competitive commercial loudness (-14 to -9 LUFS) while preserving dynamic impact and transient clarity.'
  );

  addSubheading('The 6 Dedicated Processing Stages');
  addBulletPoint('1. Sub-Sonic Pre-EQ:', 'High-pass filter (25-35 Hz) removes inaudible DC offset and rumble; surgical notch removes boxy 400Hz mid mud.');
  addBulletPoint('2. Mid/Side Stereo Imager:', 'Mono-locks sub-bass below 120Hz while gently expanding high-frequency side air above 8kHz.');
  addBulletPoint('3. Multiband Dynamics Glue:', 'Precision crossover dynamics that compress frequency bands independently for cohesive glue.');
  addBulletPoint('4. Analog Tape / Tube Saturation:', 'Harmonic exciter using mathematical hyperbolic tangent curves to simulate vintage magnetic tape compression.');
  addBulletPoint('5. Real-Time D3 Spectral Visualizer:', 'Logarithmic dual-curve FFT analyzer displaying pre-master vs. post-master frequency envelopes.');
  addBulletPoint('6. True-Peak Brickwall Limiter:', 'Ultra-fast 1ms brickwall limiter with adjustable ceiling (-0.1 to -1.5 dBFS) for inter-sample safety.');

  addSubheading('The Hardware A/B Auditioning Console');
  addParagraph(
    'Mastering decisions are easily corrupted by "loudness bias" (louder always sounds deceptively better to human ears). The built-in A/B Console eliminates this pitfall:'
  );
  addBulletPoint('Slot [A] (Processed):', 'Auditions the active Gold Path DSP chain with all modules engaged.');
  addBulletPoint('Slot [B] (Dry / Reference):', 'Instantly switches to 100% bypass or a saved baseline preset with zero audible latency.');
  addBulletPoint('Hotkey Toggle:', 'Press [B] on your keyboard at any moment during playback to flip instantaneously between processed and dry signals.');

  // =========================================================================
  // CHAPTER 4: BATCH MULTI-CORE AUTO-MASTERING ENGINE
  // =========================================================================
  onProgress?.(60, 'Writing Chapter 4: Batch Multi-Core Engine...');
  addSectionTitle('4', 'Batch Multi-Core Auto-Mastering Engine', 'Batch DSP');
  addParagraph(
    'The Batch Auto-Mastering Engine processes entire session folders of multitrack stems or full album tracks in parallel, leveraging multi-core CPU architectures via concurrent OfflineAudioContext worker pools.'
  );

  addSubheading('Key Capabilities');
  addBulletPoint('Folder Drag & Drop:', 'Drop an entire session folder into the intake zone; the engine recursively unpacks all audio files (.wav, .mp3, .flac, .ogg, .m4a, .aif).');
  addBulletPoint('Automatic Stem Categorization:', 'Heuristic filename analysis tags files automatically as Drums, Kick, Snare, Bass, Vocal, Guitar, Keys, Synth, FX, or Full Mix.');
  addBulletPoint('Multi-Core Parallel Acceleration:', 'Engage up to 16 concurrent CPU threads to achieve up to 8x faster processing than traditional real-time bounces.');
  addBulletPoint('Stem Submix Mode (-4.5dB Headroom):', 'Crucial mode for stems destined for multitrack summing in DAWs; leaves clean headroom so stems do not clip when combined.');
  addBulletPoint('ZIP Batch Export:', 'Downloads all completed 16-bit PCM WAV masters in a single ZIP archive accompanied by a comprehensive Mastering_Log_Report.txt manifest.');

  // =========================================================================
  // CHAPTER 5 & 6: SOFTWARE DOJO & GHOST BUDDIES
  // =========================================================================
  onProgress?.(70, 'Writing Chapters 5 & 6: Software Dojo & AI Duo...');
  doc.addPage();
  drawPageHeaderFooter();
  cursorY = 22;

  addSectionTitle('5', 'Software Dojo & The Offline AI Ghost Buddies', 'AI Cybernetics');
  addParagraph(
    'Strangelet Lab features a native cybernetic AI assistant network running entirely on your local machine via local LLM runtimes (Kobold.cpp, Ollama, LM Studio).'
  );

  addSubheading('The Co-Op Persona Team');
  addBulletPoint('Ghost (Llama 3.1 8B):', 'The literal "ghost in the machine." Energetic co-producer focused on rhythm, groove, arrangement flow, and punchy mixing tricks.');
  addBulletPoint('Quinn (Qwen 2.5 7B):', 'Avant-garde sound designer with deep knowledge of micro-tonal harmonics, spectral de-sheen filters, and ambient textures.');
  addBulletPoint('Strangelet Guru:', 'Disciplined acoustic sensei specializing in Faust DSP equations, phase coherence, and mastering targets.');

  addSubheading('The Software Dojo Scrolls');
  addParagraph(
    'The Software Dojo contains curated training scrolls that prime your local model with the exact parameters and features of Strangelet Lab:'
  );
  addBulletPoint('Scroll of Gold Path Mastering:', 'Instructs the LLM on target LUFS, crossover slopes, and Mid/Side balancing.');
  addBulletPoint('Scroll of the Large Sonic Collider:', 'Teaches the model relativistic GeV equations and laser steering tactics.');
  addBulletPoint('Scroll of Faust DSP Synthesizer:', 'Provides syntax examples and functional filter code for the Faust WebAssembly compiler.');

  addSubheading('Air-Gapped Setup Commands');
  addCodeBlock([
    '# Option 1: Kobold.cpp (High performance GGUF runner)',
    './koboldcpp --model Qwen2.5-7B-Instruct.gguf --port 5001 --usecublas',
    '',
    '# Option 2: Ollama (Command line local runner)',
    'ollama run llama3.1:8b',
    '',
    '# In Strangelet Lab: Click "AI Hub Endpoints" -> Select Local Engine -> Test Connection'
  ]);

  // =========================================================================
  // CHAPTER 7 & 8: ADVANCED AUDIO TOOLS & SUNO DE-SHEEN
  // =========================================================================
  onProgress?.(80, 'Writing Chapters 7 & 8: De-Sheen & DSP Lab...');
  addSectionTitle('6', 'Suno AI De-Sheen & Faust DSP WebAudio Lab', 'Restoration');
  addParagraph(
    'Generative AI music models (like Suno and Udio) frequently suffer from characteristic high-frequency metallic "sheen" and muddy boxiness around 400Hz. The Suno De-Sheen Studio removes these artifacts using specialized DSP algorithms.'
  );

  addSubheading('De-Sheen DSP Architecture');
  addBulletPoint('Anti-Sheen High Shelf:', 'Smooth attenuation between 8kHz and 11kHz to tame synthetic digital comb-filtering.');
  addBulletPoint('De-Mud Peaking Notch:', 'Surgically attenuates congested 380Hz - 440Hz cardboard build-up.');
  addBulletPoint('Silky Air Restoration:', 'Injects clean analog high-frequency sheen above 14kHz to restore open spaciousness.');
  addBulletPoint('Dynamic Transient Reconstructor:', 'Re-sharpens drum transients softened by neural diffusion models.');

  addSubheading('Faust DSP WebAudio Lab');
  addParagraph(
    'Faust (Functional Audio Stream) is a high-level DSP programming language. Strangelet Lab includes an in-app Faust compiler that translates DSP code into WebAssembly in real-time, allowing you to build custom oscillators, reverbs, and wave-shapers on the fly.'
  );

  // =========================================================================
  // CHAPTER 9: KEYBOARD SHORTCUTS & TEMPLATES
  // =========================================================================
  onProgress?.(90, 'Writing Chapter 9: Shortcuts & Workflows...');
  doc.addPage();
  drawPageHeaderFooter();
  cursorY = 22;

  addSectionTitle('7', 'Guided Workflows, Production Templates & Hotkeys', 'Workflow');
  addParagraph(
    'Workflows and templates help you move from initial prompt generation directly to finished master:'
  );

  addSubheading('Featured Guided Workflow: The Full Quantum Cycle');
  addBulletPoint('Step 1 (Prompt Ideation):', 'Craft your sonic concept in the Large Sonic Collider with Ghost & Quinn.');
  addBulletPoint('Step 2 (Ace-Step Loop Bed):', 'Feed prompt into Ace-Step 1.5 to generate multi-stem synchronized loop beds (Drums, Bass, Leads).');
  addBulletPoint('Step 3 (Mixer Console Summing):', 'Route generated stems directly into Strangelet Mixer channel strips.');
  addBulletPoint('Step 4 (Humanizing & Overdub):', 'Plug in guitar/keyboard, apply humanize velocity drift, and loop slices with Beam Splitter.');
  addBulletPoint('Step 5 (Gold Path Master):', 'Send final arrangement through Gold Path or Batch Auto-Mastering for commercial release.');

  addSubheading('Master Keyboard Shortcuts Reference');
  const shortcuts = [
    ['Space', 'Play / Pause Master Audio Transport'],
    ['B', 'Instant A/B Audition Toggle (Mastered vs Dry Signal)'],
    ['A', 'Select Audition Slot A (Active Gold Path DSP)'],
    ['Alt + G', 'Toggle Ghost in the Machine / Quinn AI Co-Producer'],
    ['Ctrl + B', 'Toggle Left Navigation Sidebar (Collapse for Fullscreen)'],
    ['F1 or ?', 'Open Official User Guide & Manual'],
    ['R', 'Toggle Master WAV Audio Recording'],
    ['M', 'Mute Selected Mixer Channel Strip'],
    ['S', 'Solo Selected Mixer Channel Strip'],
    ['Tab', 'Quick Switch between Timeline and Mixer Views'],
    ['Esc', 'Close active modal / Deselect current tool']
  ];

  // Draw shortcut table
  ensureSpace(shortcuts.length * 5.5 + 8);
  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(margin, cursorY, contentWidth, 5.5, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(goldAccent[0], goldAccent[1], goldAccent[2]);
  doc.text('KEYBOARD SHORTCUT', margin + 3, cursorY + 3.8);
  doc.text('ACTION / WORKFLOW FUNCTION', margin + 50, cursorY + 3.8);
  cursorY += 5.5;

  shortcuts.forEach((sc, idx) => {
    const isEven = idx % 2 === 0;
    doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
    doc.rect(margin, cursorY, contentWidth, 5, 'F');

    doc.setFont('courier', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(sc[0], margin + 3, cursorY + 3.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(textBody[0], textBody[1], textBody[2]);
    doc.text(sc[1], margin + 50, cursorY + 3.5);

    cursorY += 5;
  });

  cursorY += 6;

  // Closing Hardware Certificate
  addCalloutCard('Air-Gapped Studio Certification', [
    'This field manual is certified for air-gapped studio use without internet connection requirements.',
    'For updates, project backups, and user preset exchange, visit Strangelet Lab offline export utilities.',
    'Strangelet Acoustic Cybernetics Division • Document ID: SL-MANUAL-240-AIRGAP'
  ], goldAccent);

  onProgress?.(100, 'Finalizing PDF Binary Output...');

  return doc.output('blob');
}
