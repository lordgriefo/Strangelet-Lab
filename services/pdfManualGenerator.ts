// Strangelet Lab - Offline PDF User Guide & Field Manual Generator
// Generates a clean, properly paginated multi-page PDF document using jsPDF
// 100% client-side, zero network dependencies, air-gapped offline certified

import { jsPDF } from 'jspdf';

export interface PdfGenerationOptions {
  includeAllSections?: boolean;
  version?: string;
  onProgress?: (progressPercent: number, status: string) => void;
}

export async function generateOfflineManualPdf(options: PdfGenerationOptions = {}): Promise<Blob> {
  const {
    version = 'v2.5.0',
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
  const topY = 22;
  const bottomLimit = pageHeight - 19;
  const contentWidth = pageWidth - margin * 2;
  let cursorY = margin;

  // Color Palette
  const darkBg: [number, number, number] = [10, 14, 28];
  const goldAccent: [number, number, number] = [217, 119, 6];
  const goldBright: [number, number, number] = [245, 158, 11];
  const cyanAccent: [number, number, number] = [8, 145, 178];
  const textDark: [number, number, number] = [15, 23, 42];
  const textMuted: [number, number, number] = [100, 116, 139];
  const textBody: [number, number, number] = [51, 65, 85];
  const codeBg: [number, number, number] = [241, 245, 249];
  const cardBorder: [number, number, number] = [203, 213, 225];

  // Sanitize any non-Latin1 characters so jsPDF Helvetica width/glyph rendering never overlaps
  const safeText = (input: string): string =>
    input
      .replace(/[\u2018\u2019]/g, "'")
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-')
      .replace(/\u2026/g, '...')
      .replace(/[\u2192\u2794]/g, '->')
      .replace(/\u2194/g, '<->')
      .replace(/\u00B1/g, '+/-')
      .replace(/\u00D7/g, 'x')
      .replace(/[^\x20-\x7E\u00A0-\xFF]/g, '');

  // Ensure vertical space on current page; add a clean new page if needed
  const ensureSpace = (neededHeight: number): boolean => {
    if (cursorY + neededHeight > bottomLimit) {
      doc.addPage();
      cursorY = topY;
      return true;
    }
    return false;
  };

  // Start a new page explicitly
  const startNewPage = () => {
    doc.addPage();
    cursorY = topY;
  };

  // Helper: Section title
  const addSectionTitle = (number: string, title: string, category: string) => {
    ensureSpace(24);
    cursorY += 3;

    const catText = safeText(category.toUpperCase());
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    const pillWidth = Math.max(24, doc.getTextWidth(catText) + 8);

    doc.setFillColor(goldBright[0], goldBright[1], goldBright[2]);
    doc.roundedRect(margin, cursorY, pillWidth, 4.8, 1, 1, 'F');
    doc.setTextColor(0, 0, 0);
    doc.text(catText, margin + pillWidth / 2, cursorY + 3.4, { align: 'center' });

    cursorY += 8.5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13.5);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    const titleLines = doc.splitTextToSize(safeText(`${number}. ${title}`), contentWidth);
    doc.text(titleLines, margin, cursorY);
    cursorY += titleLines.length * 5.2 + 0.5;

    doc.setDrawColor(goldBright[0], goldBright[1], goldBright[2]);
    doc.setLineWidth(0.6);
    doc.line(margin, cursorY, margin + contentWidth, cursorY);
    cursorY += 5.5;
  };

  // Helper: Subheading
  const addSubheading = (title: string) => {
    ensureSpace(12);
    cursorY += 2.5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(cyanAccent[0], cyanAccent[1], cyanAccent[2]);
    doc.text(safeText(title), margin, cursorY);
    cursorY += 5;
  };

  // Helper: Paragraph
  const addParagraph = (text: string) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(textBody[0], textBody[1], textBody[2]);
    const lineHeight = 4.3;
    const lines: string[] = doc.splitTextToSize(safeText(text), contentWidth);
    const height = lines.length * lineHeight;
    ensureSpace(height + 2);
    lines.forEach((line, idx) => {
      doc.text(line, margin, cursorY + idx * lineHeight);
    });
    cursorY += height + 2.8;
  };

  // Helper: Bullet point with clean bold prefix and zero-overlap multi-line wrapping
  const addBulletPoint = (boldLabel: string, text: string) => {
    const cleanLabel = safeText(boldLabel).trim();
    const cleanBody = safeText(text).trim();
    const indentX = margin + 5.5;
    const maxWidth = contentWidth - 6.5;
    const lineHeight = 4.2;

    doc.setFontSize(8.8);
    doc.setFont('helvetica', 'bold');
    const labelWidth = doc.getTextWidth(cleanLabel);

    doc.setFont('helvetica', 'normal');
    const spaceWidth = doc.getTextWidth(' ');
    const firstLineAvail = maxWidth - labelWidth - spaceWidth;

    // Split body into first-line segment (beside bold label) and subsequent wrapped lines
    let firstLineBody = '';
    let restLines: string[] = [];

    if (firstLineAvail >= 28) {
      const words = cleanBody.split(/\s+/).filter(Boolean);
      let current = '';
      let breakIdx = words.length;
      for (let i = 0; i < words.length; i++) {
        const candidate = current ? `${current} ${words[i]}` : words[i];
        if (doc.getTextWidth(candidate) <= firstLineAvail) {
          current = candidate;
        } else {
          breakIdx = i;
          break;
        }
      }
      firstLineBody = current;
      const remainingText = words.slice(breakIdx).join(' ');
      if (remainingText) {
        restLines = doc.splitTextToSize(remainingText, maxWidth);
      }
    } else {
      restLines = doc.splitTextToSize(cleanBody, maxWidth);
    }

    const totalLines = 1 + restLines.length;
    const totalHeight = totalLines * lineHeight + 1.6;
    ensureSpace(totalHeight);

    // Vector bullet dot
    doc.setFillColor(goldAccent[0], goldAccent[1], goldAccent[2]);
    doc.circle(margin + 2, cursorY - 1.1, 0.9, 'F');

    // Line 1: Bold label + optional first-line body continuation
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.text(cleanLabel, indentX, cursorY);

    if (firstLineBody) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textBody[0], textBody[1], textBody[2]);
      doc.text(firstLineBody, indentX + labelWidth + spaceWidth, cursorY);
    }

    // Remaining wrapped lines cleanly below line 1
    if (restLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(textBody[0], textBody[1], textBody[2]);
      restLines.forEach((line, idx) => {
        doc.text(line, indentX, cursorY + (idx + 1) * lineHeight);
      });
    }

    cursorY += totalHeight;
  };

  // Helper: Info Card / Callout Box with wrapped lines
  const addCalloutCard = (
    title: string,
    lines: string[],
    accentColor: [number, number, number] = goldBright
  ) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    const innerWidth = contentWidth - 10;
    const wrappedLines: string[] = [];
    lines.forEach((raw) => {
      const parts = doc.splitTextToSize(safeText(raw), innerWidth);
      wrappedLines.push(...parts);
    });

    const lineHeight = 4.1;
    const boxHeight = wrappedLines.length * lineHeight + 10.5;
    ensureSpace(boxHeight + 4);

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.35);
    doc.roundedRect(margin, cursorY, contentWidth, boxHeight, 2, 2, 'FD');

    doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.roundedRect(margin, cursorY, 2.5, boxHeight, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(accentColor[0], accentColor[1], accentColor[2]);
    doc.text(safeText(title.toUpperCase()), margin + 5.5, cursorY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.2);
    doc.setTextColor(textBody[0], textBody[1], textBody[2]);
    let cardY = cursorY + 9.5;
    wrappedLines.forEach((line) => {
      doc.text(line, margin + 5.5, cardY);
      cardY += lineHeight;
    });

    cursorY += boxHeight + 4;
  };

  // Helper: Code snippet block with wrapped lines
  const addCodeBlock = (codeLines: string[]) => {
    doc.setFont('courier', 'normal');
    doc.setFontSize(8);
    const innerWidth = contentWidth - 8;
    const wrappedLines: string[] = [];
    codeLines.forEach((raw) => {
      if (!raw) {
        wrappedLines.push('');
      } else {
        const parts = doc.splitTextToSize(safeText(raw), innerWidth);
        wrappedLines.push(...parts);
      }
    });

    const lineHeight = 4.0;
    const blockHeight = wrappedLines.length * lineHeight + 6.5;
    ensureSpace(blockHeight + 3);

    doc.setFillColor(codeBg[0], codeBg[1], codeBg[2]);
    doc.setDrawColor(cardBorder[0], cardBorder[1], cardBorder[2]);
    doc.setLineWidth(0.3);
    doc.roundedRect(margin, cursorY, contentWidth, blockHeight, 1.5, 1.5, 'FD');

    doc.setFont('courier', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);

    let codeY = cursorY + 4.8;
    wrappedLines.forEach((line) => {
      if (line) {
        doc.text(line, margin + 4, codeY);
      }
      codeY += lineHeight;
    });

    cursorY += blockHeight + 3.5;
  };

  // Helper: Two-column data table with automatic page-break header repetition
  const addTable = (headers: [string, string], rows: [string, string][], col1Width = 46) => {
    const col2Width = contentWidth - col1Width - 6;
    const headerHeight = 6.2;

    const drawHeader = () => {
      doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
      doc.rect(margin, cursorY, contentWidth, headerHeight, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(goldBright[0], goldBright[1], goldBright[2]);
      doc.text(safeText(headers[0]), margin + 3, cursorY + 4.2);
      doc.text(safeText(headers[1]), margin + col1Width + 3, cursorY + 4.2);
      cursorY += headerHeight;
    };

    ensureSpace(headerHeight + 10);
    drawHeader();

    rows.forEach((row, idx) => {
      doc.setFont('courier', 'bold');
      doc.setFontSize(7.8);
      const col1Lines: string[] = doc.splitTextToSize(safeText(row[0]), col1Width - 4);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      const col2Lines: string[] = doc.splitTextToSize(safeText(row[1]), col2Width);

      const lineCount = Math.max(col1Lines.length, col2Lines.length);
      const rowHeight = lineCount * 4.0 + 2.4;

      if (ensureSpace(rowHeight)) {
        drawHeader();
      }

      const isEven = idx % 2 === 0;
      doc.setFillColor(isEven ? 248 : 255, isEven ? 250 : 255, isEven ? 252 : 255);
      doc.rect(margin, cursorY, contentWidth, rowHeight, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.line(margin, cursorY + rowHeight, margin + contentWidth, cursorY + rowHeight);

      doc.setFont('courier', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      col1Lines.forEach((l, i) => {
        doc.text(l, margin + 3, cursorY + 4.0 + i * 4.0);
      });

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(textBody[0], textBody[1], textBody[2]);
      col2Lines.forEach((l, i) => {
        doc.text(l, margin + col1Width + 3, cursorY + 4.0 + i * 4.0);
      });

      cursorY += rowHeight;
    });

    cursorY += 4;
  };

  // =========================================================================
  // COVER / FRONT TITLE PAGE
  // =========================================================================
  onProgress?.(15, 'Generating Title Cover Page...');

  doc.setFillColor(darkBg[0], darkBg[1], darkBg[2]);
  doc.rect(0, 0, pageWidth, 82, 'F');

  doc.setFillColor(goldBright[0], goldBright[1], goldBright[2]);
  doc.rect(margin, 18, 4, 34, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(255, 255, 255);
  doc.text('STRANGELET LAB', margin + 8, 28);

  doc.setFontSize(13.5);
  doc.setTextColor(goldBright[0], goldBright[1], goldBright[2]);
  doc.text('QUANTUM-ACOUSTIC FIELD MANUAL & OPERATING SYSTEM GUIDE', margin + 8, 37);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(148, 163, 184);
  doc.text(
    safeText(`Official Air-Gapped Documentation | Version ${version} | Offline-Certified Architecture`),
    margin + 8,
    46
  );

  // Status Badges on Dark Banner (drawn cleanly without overlapping symbols)
  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin + 8, 53, 50, 6, 1, 1, 'F');
  doc.setFillColor(52, 211, 153);
  doc.circle(margin + 12, 56, 1.1, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(52, 211, 153);
  doc.text('100% OFFLINE CAPABLE', margin + 15, 57.1);

  doc.setFillColor(30, 41, 59);
  doc.roundedRect(margin + 61, 53, 58, 6, 1, 1, 'F');
  doc.setFillColor(56, 189, 248);
  doc.circle(margin + 65, 56, 1.1, 'F');
  doc.setTextColor(56, 189, 248);
  doc.text('ZERO TELEMETRY / AIR-GAPPED', margin + 68, 57.1);

  cursorY = 92;

  addCalloutCard(
    'Executive Abstract',
    [
      'Strangelet Lab is a browser-native quantum-acoustic Digital Audio Workstation (DAW) and DSP laboratory.',
      'It unites Web Audio DSP, relativistic hadron collisions, multi-track arrangement & Pure Timeline editing, Faust WebAssembly synthesis, Reference Matchering, and GHOST (The Ghost in the Machine), your studio companion.',
      'This manual covers every workspace view, automation workflow, local AI integration, and keyboard shortcut.'
    ],
    cyanAccent
  );

  addSubheading('Table of Contents');
  const tocEntries: [string, string][] = [
    ['01', 'System Architecture & Global Signal Flow'],
    ['02', 'Workspace Views: Pure Timeline, Timeline, Mixer Only, Split & Snapshots Menu'],
    ['03', 'Global VST Browser, Parameter Automation Lanes & Macro Engine'],
    ['04', 'Global MIDI Quantize, Swing Humanization & Native Hardware Cursor'],
    ['05', 'The Large Sonic Collider (Hadron Synthesis & Laser Steering)'],
    ['06', 'Gold Path 6-Stage Mastering Suite & FFT Reference Matchering'],
    ['07', 'Batch Multi-Core Auto-Mastering Engine'],
    ['08', 'GHOST (The Ghost in the Machine) & Software Dojo'],
    ['09', 'Local AI Hub Air-Gapped Connection Guide (Kobold.cpp / Ollama / LM Studio)'],
    ['10', 'Faust DSP Workbench (12 Boutique Models, Idea Board & Prompt-to-Toy)'],
    ['11', 'Beam Splitter, Suno De-Sheen & Spotify Basic Pitch'],
    ['12', 'Guided Workflows, SFZ Open Library, LoRAs & VRAM Scaling'],
    ['13', 'Master Keyboard Shortcuts Reference']
  ];
  addTable(['CHAPTER', 'TOPIC'], tocEntries, 22);

  // =========================================================================
  // CHAPTER 1: SYSTEM ARCHITECTURE
  // =========================================================================
  onProgress?.(25, 'Writing Chapter 1: Architecture & Signal Flow...');
  startNewPage();

  addSectionTitle('1', 'System Architecture & Global Signal Flow', 'Core');
  addParagraph(
    'Strangelet Lab executes inside modern browser Web Audio graphs and WebAssembly threads. All audio synthesis, filtering, mastering, and offline WAV rendering happen locally on your hardware with zero cloud audio uploads.'
  );

  addSubheading('Core Architectural Principles');
  addBulletPoint('Zero-Latency Audio Bus:', 'Sub-millisecond buffer dispatch with dedicated gain staging, 3-band surgical channel EQ, stereo panning, and aux FX slots.');
  addBulletPoint('Multi-Core Parallelism:', 'Batch rendering dispatches concurrent OfflineAudioContext instances across available CPU hardware threads.');
  addBulletPoint('Strict Local Air-Gapping:', 'Local AI tools connect directly to localhost endpoints (Kobold.cpp, Ollama, LM Studio) without internet requirements.');
  addBulletPoint('Native 60fps Hardware Cursor:', 'Uses the OS hardware pointer with zero software cursor lag for instant timeline scrubbing and fader precision.');

  addCalloutCard(
    'Signal Flow Topology',
    [
      '[Audio / MIDI / Faust] -> [Track Pre-EQ & VST Inserts] -> [Stereo Bus Routing]',
      '-> [Master Gain & Aux FX] -> [Gold Path Mastering / Matchering EQ] -> [DAC / WAV Bounce]'
    ],
    goldBright
  );

  // =========================================================================
  // CHAPTER 2: WORKSPACE VIEWS & SNAPSHOTS MENU
  // =========================================================================
  onProgress?.(35, 'Writing Chapter 2: Mixer Views & Snapshots Menu...');

  addSectionTitle('2', 'Workspace Views & Auto-Mix Snapshots Menu', 'Workspace');
  addParagraph(
    'The Mixer Console header includes a 4-way layout switcher so you can dedicate the entire screen to arrangement, faders, or both without clutter.'
  );

  addSubheading('4-Way Layout Switcher');
  addBulletPoint('Pure Timeline:', 'Distraction-free, edge-to-edge full-height timeline. Hides the full console header, Vegas Motif deck, VST Browser, Macro sidebar, channel strips, and bottom transport deck, leaving a single slim micro-transport bar (Rewind, Stop, Play, Rec, Loop, BPM, +Audio/+MIDI, and Snapshots).');
  addBulletPoint('Timeline (Arrange):', 'Full-height timeline paired with the main Mixer header, Global VST Browser automation panel, and full analog transport bar.');
  addBulletPoint('Mixer Only (Console):', 'Hides the timeline to give tall studio height to all channel strips and the sticky Master Out fader.');
  addBulletPoint('Split View:', 'Classic dual layout with the arrangement timeline above and mixer channel strips below. Press [Tab] anywhere to cycle between your active timeline view and Mixer Only.');

  addSubheading('Auto-Mix Snapshots Dropdown Menu');
  addParagraph(
    'To maximize vertical room for timeline tracks, Auto-Mix Snapshots are housed inside a compact SNAPSHOTS button in the Mixer header rather than a permanent bar above the lanes.'
  );
  addBulletPoint('8 Capture Slots (1-8):', 'Click SNAPSHOTS to open the menu. Click any empty slot to capture track volumes, pans, mutes, solos, and FX states. Click a saved slot to recall it immediately.');
  addBulletPoint('Save Mode & Renaming:', 'Toggle Save Mode to overwrite an occupied slot. Double-click any slot (or click its pencil icon) to give it a custom mix name.');
  addBulletPoint('Instant A/B Mix Comparison:', 'Assign two slots to A and B inside the menu to reveal a 1-click A/B toggle chip right next to the SNAPSHOTS button for instant comparison during playback.');

  // =========================================================================
  // CHAPTER 3: VST BROWSER, AUTOMATION & MACRO ENGINE
  // =========================================================================
  onProgress?.(45, 'Writing Chapter 3: VST Browser & Macro Engine...');
  startNewPage();

  addSectionTitle('3', 'Global VST Browser, Automation & Macro Engine', 'Automation');
  addParagraph(
    'Automate any track volume, pan, or Faust/VST plugin parameter directly on the timeline, or record live performance moves into triggerable macros.'
  );

  addSubheading('Global VST Browser & Parameter Automation');
  addBulletPoint('Project Plugin Scanner:', 'Click VST BROWSER in the Mixer header to scan every track for active Faust DSP toys and VST3/CLAP/AU wrappers.');
  addBulletPoint('Unified Automation Lanes:', 'Select any discovered plugin parameter to reveal its automation envelope lane directly on the track timeline and activate the curve drawing tool.');
  addBulletPoint('Show All Envelopes:', 'Toggle the Envelopes button in the Timeline toolbar to inspect or hide all volume, pan, and plugin lanes across tracks at once.');

  addSubheading('Performance Macro Engine');
  addBulletPoint('Live Gesture Recording:', 'Open MACROS to record real-time sequences of fader volume moves, panning sweeps, and VST parameter tweaks.');
  addBulletPoint('MIDI Triggering & Timeline Baking:', 'Trigger saved Performance Macros via mapped hardware MIDI controller buttons, or bake a macro directly onto track automation lanes at the current playhead.');

  // =========================================================================
  // CHAPTER 4: GLOBAL MIDI QUANTIZE & SWING
  // =========================================================================
  onProgress?.(55, 'Writing Chapter 4: MIDI Quantize & Swing...');

  addSectionTitle('4', 'Global MIDI Quantize & Swing Humanization', 'MIDI');
  addParagraph(
    'Tighten loose MIDI performances or inject classic pocket groove across selected MIDI clips and individual notes.'
  );

  addBulletPoint('Subdivision Grids:', 'Open MIDI QUANTIZE in the Mixer header to snap timing to 1/4, 1/8, 1/16, or 1/32 note grids.');
  addBulletPoint('Adjustable Swing %:', 'Dial in Swing percentage (0-100%) to delay off-beat subdivisions for natural MPC/LinnDrum human feel.');
  addBulletPoint('Quantize Strength & Scope:', 'Blend between raw timing and 100% grid lock, target selected clips or specific notes, toggle live preview, and restore original timing non-destructively at any time.');

  // =========================================================================
  // CHAPTER 5: LARGE SONIC COLLIDER
  // =========================================================================
  onProgress?.(60, 'Writing Chapter 5: Large Sonic Collider...');

  addSectionTitle('5', 'The Large Sonic Collider (Hadron Synthesis)', 'Physics');
  addParagraph(
    'The Large Sonic Collider (LSC) models audio stems as charged relativistic particles orbiting inside a magnetic containment ring. Micro-collisions trigger granular fission, Doppler pitch modulation, and rhythmic drone cascades.'
  );

  addBulletPoint('Beam Energy (GeV):', 'Accelerates orbital velocity, increasing Doppler modulation and collision frequency.');
  addBulletPoint('Magnetic B-Field (Tesla):', 'Tightens containment radius, forcing dense comb-filtering near-misses.');
  addBulletPoint('Laser Steering Tools:', 'Use Inspect (frequency centroid), Gravity Well (force collisions), Repulsor Beam (pitch dive-bombs), and Exciter/Ionizer (harmonic saturation).');

  // =========================================================================
  // CHAPTER 6 & 7: GOLD PATH MASTERING & MATCHERING
  // =========================================================================
  onProgress?.(68, 'Writing Chapters 6 & 7: Mastering & Matchering...');
  startNewPage();

  addSectionTitle('6', 'Gold Path Mastering & FFT Reference Matchering', 'Mastering');
  addParagraph(
    'The Gold Path mastering deck combines a 6-stage analog/digital chain with real-time Web Audio FFT Reference Matchering so you can match the tonal contour and loudness balance of commercial reference tracks.'
  );

  addSubheading('The 6 Processing Stages');
  addBulletPoint('1. Sub-Sonic & Parametric EQ:', '6-band precision EQ removes DC rumble (<30Hz), boxy 400Hz mud, and harsh digital resonances.');
  addBulletPoint('2. Mid/Side Stereo Imager:', 'Mono-locks sub-bass below 120Hz while widening upper stereo air above 8kHz.');
  addBulletPoint('3. Multiband Dynamics Glue:', 'Three-band compression for punchy, cohesive dynamic control.');
  addBulletPoint('4. Analog Tape Saturation:', 'Hyperbolic tangent magnetic hysteresis adding warm odd/even harmonics.');
  addBulletPoint('5. D3 Spectral Analyzer:', 'Real-time dual-curve FFT comparing raw input against the processed master bus.');
  addBulletPoint('6. True-Peak Brickwall Limiter:', 'Lookahead ceiling (-0.3 dBFS default) preventing inter-sample clipping.');

  addSubheading('Real-Time Reference Matchering Dropzone');
  addBulletPoint('Drop Reference Audio:', 'Drag any .wav or .mp3 song onto the permanent Drop Reference Audio Track (Matchering) deck.');
  addBulletPoint('5-Band FFT Calibration:', 'Decodes the reference buffer in Web Audio, computes its average spectrum across Sub, Low-Mid, Mid, Presence, and Air, compares it to your current master bus, and automatically calibrates the 6-band Parametric EQ in masterBus.');
  addBulletPoint('Level-Matched Auditioning:', 'Click Audition Reference Track to flip instantaneously between your master and the reference song at matched loudness.');

  addSectionTitle('7', 'Batch Multi-Core Auto-Mastering Engine', 'Batch DSP');
  addParagraph(
    'Drop a folder of stems or album tracks into Batch Auto-Mastering to process all files in parallel across concurrent CPU threads using your active Gold Path settings, with an optional -4.5 dB Stem Submix headroom mode and one-click ZIP WAV export.'
  );

  // =========================================================================
  // CHAPTER 8 & 9: GHOST AI COMPANION & LOCAL HUB
  // =========================================================================
  onProgress?.(78, 'Writing Chapters 8 & 9: GHOST & Local AI Hub...');
  startNewPage();

  addSectionTitle('8', 'GHOST (The Ghost in the Machine) & Software Dojo', 'AI Studio');
  addParagraph(
    'GHOST is your sole resident audio mentor, DSP architect, and studio partner inside Strangelet Lab. GHOST maintains continuous awareness of your active session before answering.'
  );

  addSubheading('Live Studio Session Awareness');
  addBulletPoint('Session Telemetry Inspection:', 'GHOST automatically reads your current BPM, time signature, active track count, audio vs. MIDI breakdown, active Gold Path mastering preset, and whether Reference Matchering is enabled.');
  addBulletPoint('Hyper-Practical Engineering:', 'Gives concise 2-4 sentence answers referencing exact Hz/kHz frequencies and specific Strangelet Lab knobs, plus persistent XP/level evolution via buddyEvolutionCore.');
  addBulletPoint('Software Dojo Scrolls:', 'Inject curated domain scrolls (Gold Path Mastering, Large Sonic Collider, Faust DSP, Ace-Step, and custom studio rules) into your local LLM context.');

  addSectionTitle('9', 'Local AI Hub Connection Guide (Offline GGUFs)', 'Local AI');
  addParagraph(
    'Connect Kobold.cpp, Ollama, or LM Studio for 100% offline inference with GHOST:'
  );
  addCodeBlock([
    '# Kobold.cpp (Recommended GGUF runner, Port 5001)',
    './koboldcpp --model Qwen2.5-7B-Instruct.gguf --port 5001 --usecublas',
    '',
    '# Ollama (Port 11434)',
    'ollama run qwen2.5:7b',
    '',
    '# LM Studio: Enable Local Server on Port 1234 (OpenAI-compatible endpoint)'
  ]);

  // =========================================================================
  // CHAPTER 10 & 11: FAUST DSP WORKBENCH & AUDIO TOOLS
  // =========================================================================
  onProgress?.(88, 'Writing Chapters 10 & 11: Faust DSP & Audio Tools...');

  addSectionTitle('10', 'Faust DSP Workbench (12 Models & Idea Board)', 'WASM DSP');
  addParagraph(
    'Write functional Faust audio code compiled to real-time WebAudio nodes, browse boutique models visually, or let GHOST assemble custom DSP toys from natural-language prompts.'
  );

  addBulletPoint('12 Boutique Preset Toys:', 'Includes classics plus 5 expanded models: VHS 1985 Chorus & Pitch Drift, Deep Cavern Shimmer Reverb, Cassette Head Magnetic Saturator, Barberpole Infinite Phaser, and FM Glass Bell Synth.');
  addBulletPoint('Visual Idea Board / Cookbook Tab:', 'Toggle from the code editor to browse cards tagged by [Time & Warble], [Grit & Crunch], [Space & Dimension], [Physical Modeling], and [Sci-Fi Glitch] with plain-English explanations and 1-click Inspect & Tweak.');
  addBulletPoint('Prompt-to-Toy One-Click Recipes:', 'Click quick chips like Underwater Muffled Reverb, Broken AM Radio, Laser Gun Zap, or Dub Siren to populate the prompt and trigger GHOST to assemble and compile live Faust code.');

  addSectionTitle('11', 'Beam Splitter, Suno De-Sheen & Basic Pitch', 'Tools');
  addBulletPoint('Beam Splitter:', 'Phase-aligned Low/High, Mid/Side, and Transient/Tonal frequency demuxing plus Chrono-Pin tempo mapping.');
  addBulletPoint('Suno AI De-Glaze / De-Sheen:', 'Suppresses 8-16kHz brittle digital sheen, attenuates 400Hz mud, and reconstructs squashed transients.');
  addBulletPoint('Spotify Basic Pitch:', 'Polyphonic Audio-to-MIDI neural transcription with velocity and pitch-bend extraction.');

  // =========================================================================
  // CHAPTER 12 & 13: WORKFLOWS, LIBRARIES & SHORTCUTS
  // =========================================================================
  onProgress?.(95, 'Writing Chapters 12 & 13: Libraries & Shortcuts...');
  startNewPage();

  addSectionTitle('12', 'Workflows, SFZ Soundbanks, LoRAs & VRAM Tiers', 'Ecosystem');
  addBulletPoint('SFZ Open Library:', 'Audition and load open-format multi-velocity instruments (1973 Rhodes Mk I, Juno-106 Pad, Chamber Cello, Model D Bass, LinnDrum LM-1).');
  addBulletPoint('Ace-Step 1.5 LoRA Lending Library:', 'Stack up to 3 diffusion adapters (lofi-tape-decay, sp1200-crunch, prince-linn-groove, glacial-sub-drone) with adjustable weights.');
  addBulletPoint('VRAM Scalability (6GB to 24GB+):', 'Toggle Demucs, Ace-Step, Basic Pitch, and Faust engines between ACTIVE, STANDBY, and UNLOADED in Resource & VRAM Manager.');

  addSectionTitle('13', 'Master Keyboard Shortcuts Reference', 'Hotkeys');
  addTable(
    ['SHORTCUT', 'ACTION / WORKFLOW FUNCTION'],
    [
      ['Space', 'Play / Pause Master Transport'],
      ['Tab', 'Cycle between Active Timeline View (Pure Timeline / Timeline) and Mixer Only'],
      ['B / A', 'Instant A/B Audition Toggle (Slot A vs Slot B / Dry Reference)'],
      ['Alt + G', 'Toggle GHOST (The Ghost in the Machine) Companion Terminal'],
      ['Ctrl + B', 'Collapse / Expand Left Navigation Sidebar'],
      ['Ctrl + E', 'Open Batch Stem Export (.WAV ZIP)'],
      ['Ctrl + Z / Y', 'Undo / Redo Project Snapshot History'],
      ['Ctrl + S', 'Manual Project Save (Auto-save runs every 60 seconds)'],
      ['F1 or ?', 'Open Official User Manual & Field Guide'],
      ['R / M / S', 'Toggle Record / Mute Selected Track / Solo Selected Track'],
      ['Esc', 'Close active modal, popover menu, or deselect current tool']
    ],
    40
  );

  addCalloutCard(
    'Air-Gapped Studio Certification',
    [
      'This field manual is certified for offline studio use with zero external network dependencies.',
      `Strangelet Lab Acoustic Cybernetics Division | Document ID: SL-MANUAL-${version.replace(/[^0-9A-Za-z]/g, '')}-AIRGAP`
    ],
    goldBright
  );

  // =========================================================================
  // FINAL PASS: DRAW CLEAN HEADERS & FOOTERS ONCE PER PAGE
  // =========================================================================
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);

    // Skip top header on Page 1 (Cover dark banner occupies top 82mm)
    if (p > 1) {
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, 13, pageWidth - margin, 13);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.8);
      doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
      doc.text('STRANGELET LAB - OFFICIAL FIELD MANUAL & OS GUIDE', margin, 9.8);
      doc.text('AIR-GAPPED OFFLINE EDITION', pageWidth - margin, 9.8, { align: 'right' });
    }

    // Consistent bottom footer on every page
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.8);
    doc.setTextColor(textMuted[0], textMuted[1], textMuted[2]);
    doc.text(
      `Quantum-Acoustic Workstation | Client-Side DSP | Version ${version}`,
      margin,
      pageHeight - 8.5
    );
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8.5, { align: 'right' });
  }

  onProgress?.(100, 'Finalizing PDF Binary Output...');
  return doc.output('blob');
}
