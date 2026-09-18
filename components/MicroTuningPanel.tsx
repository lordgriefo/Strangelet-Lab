import React, { useState } from 'react';
import { Scale, Upload, Play, RefreshCw, CheckCircle2, Music, Hash, FileCode } from 'lucide-react';
import { BUILT_IN_SCALES, ScaleDefinition, parseScalaFile, calculateScaleFrequency } from '../lib/hybridSynthEngine';
import { playLaserBeamSound } from '../lib/laserSound';

export interface MicroTuningPanelProps {
  currentScale: ScaleDefinition;
  onSelectScale: (scale: ScaleDefinition) => void;
  baseA4Hz: number;
  onChangeBaseA4Hz: (hz: number) => void;
  microTuneCents: number;
  onChangeMicroTuneCents: (cents: number) => void;
  onAuditionScaleDegree?: (degreeIndex: number, freqHz: number) => void;
}

export const MicroTuningPanel: React.FC<MicroTuningPanelProps> = ({
  currentScale,
  onSelectScale,
  baseA4Hz,
  onChangeBaseA4Hz,
  microTuneCents,
  onChangeMicroTuneCents,
  onAuditionScaleDegree
}) => {
  const [sclInputText, setSclInputText] = useState('');
  const [parseError, setParseError] = useState<string | null>(null);
  const [showSclUpload, setShowSclUpload] = useState(false);

  const handleCustomSclParse = () => {
    if (!sclInputText.trim()) {
      setParseError('Please paste valid Scala (.scl) file content');
      return;
    }
    const parsed = parseScalaFile(sclInputText);
    if (parsed) {
      setParseError(null);
      onSelectScale(parsed);
      setShowSclUpload(false);
      playLaserBeamSound('laser_select');
    } else {
      setParseError('Invalid Scala file format. Ensure degree count and cents/ratios are present.');
    }
  };

  const handleAuditionScaleArpeggio = () => {
    if (!onAuditionScaleDegree) return;
    playLaserBeamSound('laser_midi');

    const count = Math.min(12, currentScale.divisionCount);
    for (let i = 0; i <= count; i++) {
      setTimeout(() => {
        const midi = 60 + i;
        const freq = calculateScaleFrequency(midi, currentScale, baseA4Hz, microTuneCents);
        onAuditionScaleDegree(i, freq);
      }, i * 160);
    }
  };

  return (
    <div className="bg-[#0A0D16] border border-[#1E293B] rounded-xl p-5 flex flex-col gap-5 font-mono text-[#E2E8F0]">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1E293B]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#38BDF8]/10 border border-[#38BDF8]/40 flex items-center justify-center text-[#38BDF8]">
            <Scale size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              ALGORITHMIC MICRO-TUNING & SCALA (.SCL) ENGINE
              <span className="text-[9px] px-2 py-0.5 rounded bg-sky-950/80 text-sky-400 border border-sky-500/40">
                SFZ OPCODES: scale_file & micro_tune
              </span>
            </h4>
            <p className="text-[11px] text-[#94A3B8]">
              Override 12-TET with pure acoustic Just Intonation, 19-EDO, Bohlen-Pierce 3:1 divisions, or import custom .scl files.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* SCL Upload Toggle */}
          <button
            onClick={() => setShowSclUpload(!showSclUpload)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center gap-1.5 ${
              showSclUpload
                ? 'bg-[#38BDF8]/20 border-[#38BDF8] text-[#38BDF8]'
                : 'bg-[#07090F] border-[#1E293B] text-[#94A3B8] hover:text-white'
            }`}
          >
            <FileCode size={13} />
            {showSclUpload ? 'CLOSE SCALA IMPORT' : 'IMPORT .SCL'}
          </button>

          {/* Arpeggiator Audition Button */}
          <button
            onClick={handleAuditionScaleArpeggio}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-[#38BDF8]/20 hover:bg-[#38BDF8]/30 border border-[#38BDF8]/50 text-[#38BDF8] transition-all flex items-center gap-1.5"
          >
            <Play size={13} />
            AUDITION SCALE
          </button>
        </div>
      </div>

      {/* SCL Upload Box */}
      {showSclUpload && (
        <div className="p-4 bg-[#060810] border border-[#38BDF8]/40 rounded-xl flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[#38BDF8]">PASTE SCALA (.SCL) SPECIFICATION</span>
            <span className="text-[10px] text-[#64748B]">Supports ratio (3/2) and cents (701.95)</span>
          </div>
          <textarea
            value={sclInputText}
            onChange={(e) => setSclInputText(e.target.value)}
            placeholder={`! custom_scale.scl\nMy 7-tone acoustic scale\n7\n!\n111.7\n203.9\n386.3\n498.0\n701.9\n884.4\n2/1`}
            rows={5}
            className="w-full bg-[#0A0D16] border border-[#1E293B] rounded-lg p-2.5 text-xs text-white font-mono focus:outline-none focus:border-[#38BDF8]"
          />
          {parseError && (
            <div className="text-xs text-rose-400 bg-rose-950/40 p-2 rounded border border-rose-500/30">
              {parseError}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setSclInputText(`! slendro.scl\nJavanese Slendro Equidistant\n5\n!\n240.0\n480.0\n720.0\n960.0\n2/1`);
              }}
              className="px-3 py-1 bg-[#1E293B] hover:bg-[#334155] rounded text-xs text-[#94A3B8]"
            >
              LOAD SAMPLE SCL
            </button>
            <button
              onClick={handleCustomSclParse}
              className="px-4 py-1 bg-[#38BDF8] hover:bg-[#0284C7] text-[#07090F] font-bold rounded text-xs"
            >
              APPLY SCALA FILE
            </button>
          </div>
        </div>
      )}

      {/* Scale Selection Grid & Tuning Parameters */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Scale Presets List (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-2">
          <span className="text-xs font-bold text-white tracking-wider">
            HISTORICAL & EXPERIMENTAL TUNING SYSTEMS
          </span>

          <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
            {BUILT_IN_SCALES.map((sc) => {
              const isSelected = sc.id === currentScale.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => {
                    onSelectScale(sc);
                    playLaserBeamSound('laser_select');
                  }}
                  className={`w-full text-left p-2.5 rounded-lg border transition-all flex items-start justify-between gap-3 ${
                    isSelected
                      ? 'bg-[#38BDF8]/15 border-[#38BDF8] text-white shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                      : 'bg-[#07090F] border-[#1E293B] text-[#94A3B8] hover:border-[#334155] hover:text-white'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold flex items-center gap-1.5">
                      {isSelected && <CheckCircle2 size={13} className="text-[#38BDF8]" />}
                      {sc.name}
                    </div>
                    <div className="text-[10px] text-[#64748B] mt-0.5 line-clamp-1">
                      {sc.description}
                    </div>
                  </div>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0A0D16] border border-[#1E293B] text-[#38BDF8] shrink-0">
                    {sc.divisionCount} DIV
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Pitch Reference & Interval Cent Matrix (6 cols) */}
        <div className="lg:col-span-6 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Reference Concert Pitch */}
            <div className="bg-[#07090F] border border-[#1E293B] rounded-xl p-3 flex flex-col gap-1.5">
              <span className="text-[10px] text-[#64748B] font-bold">CONCERT PITCH (A4)</span>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="400"
                  max="460"
                  step="0.5"
                  value={baseA4Hz}
                  onChange={(e) => onChangeBaseA4Hz(parseFloat(e.target.value) || 440)}
                  className="w-20 bg-[#0A0D16] border border-[#1E293B] rounded px-2 py-1 text-xs text-white font-mono"
                />
                <span className="text-xs text-white font-bold">Hz</span>
              </div>
              <div className="flex gap-1 mt-1">
                <button
                  onClick={() => onChangeBaseA4Hz(440)}
                  className="px-2 py-0.5 bg-[#0A0D16] hover:bg-[#1E293B] border border-[#1E293B] rounded text-[9px] text-[#94A3B8]"
                >
                  440 (Std)
                </button>
                <button
                  onClick={() => onChangeBaseA4Hz(432)}
                  className="px-2 py-0.5 bg-[#0A0D16] hover:bg-[#1E293B] border border-[#1E293B] rounded text-[9px] text-[#94A3B8]"
                >
                  432 (Verdi)
                </button>
                <button
                  onClick={() => onChangeBaseA4Hz(415)}
                  className="px-2 py-0.5 bg-[#0A0D16] hover:bg-[#1E293B] border border-[#1E293B] rounded text-[9px] text-[#94A3B8]"
                >
                  415 (Baroque)
                </button>
              </div>
            </div>

            {/* Global Micro-Tune Cents Offset */}
            <div className="bg-[#07090F] border border-[#1E293B] rounded-xl p-3 flex flex-col gap-1.5">
              <span className="text-[10px] text-[#64748B] font-bold">GLOBAL MICRO-TUNE</span>
              <div className="flex items-center justify-between text-xs text-white font-mono">
                <span>{microTuneCents > 0 ? `+${microTuneCents}` : microTuneCents} Cents</span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={microTuneCents}
                onChange={(e) => onChangeMicroTuneCents(parseInt(e.target.value, 10))}
                className="w-full accent-[#38BDF8] cursor-pointer mt-1"
              />
              <button
                onClick={() => onChangeMicroTuneCents(0)}
                className="text-[9px] text-[#64748B] hover:text-white self-end"
              >
                Reset to 0
              </button>
            </div>
          </div>

          {/* Active Scale Degree Cents & Frequencies Table */}
          <div className="bg-[#060810] border border-[#1E293B] rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-white flex items-center gap-1.5">
                <Music size={13} className="text-[#38BDF8]" />
                SCALE INTERVAL CENTS (CYCLE: {currentScale.periodRatio === 3 ? '3:1 TRITAVE' : '2:1 OCTAVE'})
              </span>
              <span className="text-[10px] text-[#38BDF8]">
                {currentScale.divisionCount} Degrees
              </span>
            </div>

            <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 max-h-36 overflow-y-auto pr-1">
              {currentScale.cents.map((c, idx) => {
                const midi = 60 + idx;
                const freq = calculateScaleFrequency(midi, currentScale, baseA4Hz, microTuneCents);
                return (
                  <button
                    key={idx}
                    onClick={() => onAuditionScaleDegree && onAuditionScaleDegree(idx, freq)}
                    className="p-1.5 rounded bg-[#0A0D16] border border-[#1E293B] hover:border-[#38BDF8] flex flex-col items-center justify-center transition-all group"
                  >
                    <span className="text-[9px] text-[#64748B] group-hover:text-[#38BDF8]">
                      Deg {idx}
                    </span>
                    <span className="text-[10px] font-bold text-white">
                      {Math.round(c)}¢
                    </span>
                    <span className="text-[8px] text-[#38BDF8]">
                      {freq.toFixed(1)}Hz
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MicroTuningPanel;
