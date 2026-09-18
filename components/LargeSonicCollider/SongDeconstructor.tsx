import React, { useState } from 'react';
import { 
  Binary, 
  Sparkles, 
  Copy, 
  Check, 
  Archive, 
  Zap, 
  Search, 
  Disc, 
  ArrowRight, 
  Cpu, 
  Music, 
  FileText,
  Sliders,
  Flame
} from 'lucide-react';
import { SongDeconstruction, ArchiveItem } from '../../types';
import { REFERENCE_SONGS_CATALOG, ReferenceSongExample } from '../../lib/sonicColliderData';
import { reverseEngineerAndReimagineGemini } from '../../services/geminiService';
import { playColliderInjectionSound, playLaserBeamSound } from '../../lib/laserSound';

interface SongDeconstructorProps {
  onSaveToArchive: (item: ArchiveItem) => void;
  onOpenArchive: () => void;
  onLoadIntoChamber?: (tags: string[]) => void;
}

export const SongDeconstructor: React.FC<SongDeconstructorProps> = ({ 
  onSaveToArchive, 
  onOpenArchive,
  onLoadIntoChamber 
}) => {
  const [referenceInput, setReferenceInput] = useState<string>('Radiohead - Weird Fishes / Arpeggi');
  const [targetTopic, setTargetTopic] = useState<string>('Deep ocean research crew discovering a glowing subatomic monolith at the Mariana Trench');
  const [selectedPreset, setSelectedPreset] = useState<ReferenceSongExample | null>(REFERENCE_SONGS_CATALOG[0]);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [result, setResult] = useState<SongDeconstruction | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedLyrics, setCopiedLyrics] = useState<boolean>(false);
  const [saved, setSaved] = useState<boolean>(false);

  const selectCatalogSong = (song: ReferenceSongExample) => {
    setSelectedPreset(song);
    setReferenceInput(`${song.artist} - ${song.title}`);
    playLaserBeamSound('laser_select');
  };

  const handleDeconstruct = async () => {
    if (!referenceInput.trim()) return;
    setIsProcessing(true);
    setSaved(false);

    playColliderInjectionSound();

    try {
      const output = await reverseEngineerAndReimagineGemini(referenceInput, targetTopic);
      setResult(output);
    } catch (err) {
      console.error('Reverse engineering error:', err);
    } finally {
      setTimeout(() => {
        setIsProcessing(false);
      }, 1300);
    }
  };

  const handleArchive = () => {
    if (!result) return;
    const item: ArchiveItem = {
      id: `decon-${Date.now()}`,
      title: `Reverse Eng: ${result.referenceSong}`,
      type: 'deconstructor',
      timestamp: Date.now(),
      summary: `Deconstructed "${result.referenceSong}" -> Re-imagined about "${result.targetTopic}".`,
      tags: result.styleTags || ['reverse-engineered', 'ai-music'],
      deconstructResult: result,
      starred: true
    };
    onSaveToArchive(item);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col h-full gap-4 overflow-y-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-[#141622] border border-[#23263B]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Binary className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold tracking-wide text-white uppercase">Song Deconstructor // Reverse Engineering AI</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/60 text-amber-400 border border-amber-800/50">DNA EXTRACTOR</span>
            </div>
            <p className="text-xs text-[#8E92B0]">Feed any song to the AI: deconstruct its production and lyrical DNA, then re-imagine it completely about your own concept.</p>
          </div>
        </div>

        <span className="text-xs font-mono text-[#8E92B0] bg-[#1B1E30] px-3 py-1 rounded-lg border border-[#282D46]">
          100% ORIGINAL SYNTHESIS // ZERO AUDIO CLONING
        </span>
      </div>

      {/* Main Input Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Step 1 & Step 2 Input Form (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-4">
          {/* Reference Song Selection */}
          <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-cyan-400 flex items-center gap-1.5 uppercase">
                <Disc className="w-3.5 h-3.5" />
                <span>1. Reference Song to Reverse Engineer</span>
              </label>
              <span className="text-[10px] font-mono text-[#6A7092]">DNA SOURCE</span>
            </div>

            <input
              type="text"
              value={referenceInput}
              onChange={e => {
                setReferenceInput(e.target.value);
                setSelectedPreset(null);
              }}
              placeholder="e.g. Radiohead - Weird Fishes, or Bowie - Space Oddity..."
              className="w-full px-3 py-2 bg-[#0D0F18] border border-[#252A42] rounded-lg text-xs text-white placeholder-[#535A7C] focus:outline-none focus:border-cyan-500/60 font-sans"
            />

            {/* Curated Catalog Buttons */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono text-[#62688A]">CURATED MASTER REFERENCES:</span>
              <div className="grid grid-cols-1 gap-1.5">
                {REFERENCE_SONGS_CATALOG.map(song => {
                  const isSelected = selectedPreset?.id === song.id;
                  return (
                    <button
                      key={song.id}
                      onClick={() => selectCatalogSong(song)}
                      className={`p-2 rounded-lg text-left border transition-all ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/40 text-cyan-200 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                          : 'bg-[#0E101A] hover:bg-[#161928] border-[#202438] text-[#8E92B0] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white">{song.artist} – {song.title}</span>
                        <span className="text-[9px] font-mono text-amber-400">{song.genre.split('/')[0]}</span>
                      </div>
                      <p className="text-[10px] text-[#6E7596] line-clamp-1 mt-0.5">{song.famousFor}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* User's Re-Imagining Subject */}
          <div className="p-4 rounded-xl bg-[#141724] border border-[#242840] space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-amber-400 flex items-center gap-1.5 uppercase">
                <Flame className="w-3.5 h-3.5" />
                <span>2. Make It Your Own // Your New Topic</span>
              </label>
              <span className="text-[10px] font-mono text-[#6A7092]">NEW CREATIVE VECTOR</span>
            </div>

            <textarea
              rows={3}
              value={targetTopic}
              onChange={e => setTargetTopic(e.target.value)}
              placeholder="What do you want your song to be about? (e.g. An AI waking up inside a modular synthesizer, or midnight drag racing on Mars...)"
              className="w-full p-2.5 bg-[#0D0F18] border border-[#252A42] rounded-lg text-xs text-white placeholder-[#535A7C] focus:outline-none focus:border-amber-500/60 resize-none font-sans leading-relaxed"
            />

            {/* Trigger Button */}
            <button
              onClick={handleDeconstruct}
              disabled={isProcessing || !referenceInput.trim()}
              className={`w-full py-3 px-4 rounded-xl font-semibold text-xs tracking-wider uppercase flex items-center justify-center gap-2.5 transition-all ${
                isProcessing
                  ? 'bg-gradient-to-r from-amber-600 via-pink-600 to-cyan-600 text-white animate-pulse shadow-[0_0_20px_rgba(245,158,11,0.4)]'
                  : 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.3)] hover:scale-[1.01] active:scale-[0.99]'
              }`}
            >
              <Binary className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
              <span>{isProcessing ? 'DECONSTRUCTING DNA & RE-IMAGINING...' : 'REVERSE ENGINEER & RE-IMAGINE'}</span>
            </button>
          </div>
        </div>

        {/* Output Console: Deconstructed DNA & Re-Imagined Song (7 cols) */}
        <div className="lg:col-span-7 flex flex-col p-4 rounded-xl bg-[#141724] border border-[#242840]">
          {result ? (
            <div className="flex-1 flex flex-col space-y-4">
              {/* Output Header */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#22273F] pb-3">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">
                    DNA Extracted: {result.referenceSong}
                  </h3>
                  <p className="text-xs text-amber-300 font-mono">
                    Re-imagined for: "{result.targetTopic.slice(0, 50)}..."
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleArchive}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
                      saved
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50'
                        : 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    <Archive className="w-3.5 h-3.5" />
                    <span>{saved ? 'SAVED TO VAULT' : 'ARCHIVE DNA'}</span>
                  </button>
                </div>
              </div>

              {/* Analyzed Musical DNA Matrix */}
              <div className="p-3 rounded-xl bg-[#0D0F18] border border-[#20253B] space-y-2">
                <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Cpu className="w-3 h-3" />
                  <span>Reverse Engineered Blueprint</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded bg-[#131624] border border-[#1E2338]">
                    <span className="text-[10px] text-[#7A80A2] font-mono block">GENRE & TEMPO</span>
                    <span className="text-white font-medium">{result.analyzedDNA.genre} // {result.analyzedDNA.tempo}</span>
                  </div>
                  <div className="p-2 rounded bg-[#131624] border border-[#1E2338]">
                    <span className="text-[10px] text-[#7A80A2] font-mono block">HARMONIC ATMOSPHERE</span>
                    <span className="text-white font-medium">{result.analyzedDNA.harmonicAtmosphere}</span>
                  </div>
                </div>

                <div className="text-xs space-y-1 pt-1">
                  <span className="text-[10px] text-[#7A80A2] font-mono block">SIGNATURE GEAR & PRODUCTION QUIRKS:</span>
                  <div className="flex flex-wrap gap-1">
                    {result.analyzedDNA.instrumentation.map((inst, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#171B2B] text-cyan-300 text-[10px] font-mono border border-cyan-500/20">
                        {inst}
                      </span>
                    ))}
                    {result.analyzedDNA.productionTechniques.map((tech, i) => (
                      <span key={i} className="px-2 py-0.5 rounded bg-[#171B2B] text-amber-300 text-[10px] font-mono border border-amber-500/20">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Re-Imagined Prompt String */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-amber-400 uppercase flex items-center gap-1.5">
                    <Zap className="w-3 h-3" />
                    <span>Re-Imagined Suno/Udio Prompt String</span>
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.reimaginedPrompt);
                      setCopiedPrompt(true);
                      setTimeout(() => setCopiedPrompt(false), 2000);
                    }}
                    className="text-[11px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                  >
                    {copiedPrompt ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedPrompt ? 'COPIED!' : 'COPY'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[#0A0C14] border border-[#242A42] text-xs font-mono text-amber-100 leading-relaxed select-all">
                  {result.reimaginedPrompt}
                </div>
              </div>

              {/* Re-Imagined Lyrics */}
              <div className="space-y-1.5 flex-1 flex flex-col min-h-0">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-purple-400 uppercase flex items-center gap-1.5">
                    <FileText className="w-3 h-3" />
                    <span>Re-Imagined Stanzas (In Reference Song's Cadence)</span>
                  </label>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(result.reimaginedLyrics);
                      setCopiedLyrics(true);
                      setTimeout(() => setCopiedLyrics(false), 2000);
                    }}
                    className="text-[11px] font-mono text-purple-400 hover:text-purple-300 flex items-center gap-1"
                  >
                    {copiedLyrics ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedLyrics ? 'COPIED!' : 'COPY LYRICS'}</span>
                  </button>
                </div>
                <div className="p-3 rounded-lg bg-[#0A0C14] border border-[#242A42] text-xs font-mono text-purple-100 leading-relaxed whitespace-pre-wrap select-all max-h-48 overflow-y-auto">
                  {result.reimaginedLyrics}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 min-h-[380px] flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#23273D] rounded-xl">
              <Binary className="w-12 h-12 text-[#464D70] mb-3" />
              <p className="text-sm font-semibold text-white">Reverse Engineering Engine Standby</p>
              <p className="text-xs text-[#7D84A6] max-w-sm mt-1">
                Select a master reference song or type your own on the left, declare what you want it to be about, and click Reverse Engineer.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SongDeconstructor;
