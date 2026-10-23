// Strangelet Lab - Project Statistics & Mix Telemetry Dashboard
// Visualizes track density, timeline distribution, mix balance, and CPU/VRAM usage estimates using Recharts

import React, { useState, useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, RadarChart, 
  Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis 
} from 'recharts';
import { 
  Activity, BarChart3, Cpu, Layers, HardDrive, Zap, 
  PieChart as PieIcon, Sliders, ArrowUpRight, ShieldCheck, 
  Sparkles, Download, RotateCcw, ChevronRight, Music, Waves, Volume2 
} from 'lucide-react';
import { Track, ProjectSession, View } from '../types';

interface ProjectStatisticsDashboardProps {
  tracks: Track[];
  tempo: number;
  session: ProjectSession;
  onNavigateToMixer?: () => void;
  onNavigateView?: (view: View) => void;
}

export const ProjectStatisticsDashboard: React.FC<ProjectStatisticsDashboardProps> = ({
  tracks,
  tempo,
  session,
  onNavigateToMixer,
  onNavigateView
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'density' | 'mix' | 'hardware'>('overview');
  const [barZoom, setBarZoom] = useState<'all' | 'first_half' | 'second_half'>('all');

  // Compute Timeline Density (Bars 1 to 16)
  const timelineData = useMemo(() => {
    const totalBars = 16;
    const barsData = Array.from({ length: totalBars }, (_, i) => {
      const barNum = i + 1;
      let audioClipsCount = 0;
      let midiClipsCount = 0;
      let activeVolumeSum = 0;
      let activeTrackCount = 0;

      tracks.forEach(track => {
        const isTrackActive = track.clips.some(c => {
          const clipStart = c.startBar;
          const clipEnd = c.startBar + c.durationBars;
          return i >= clipStart && i < clipEnd;
        });

        if (isTrackActive) {
          activeTrackCount++;
          activeVolumeSum += track.volume;
          if (track.type === 'audio') audioClipsCount++;
          else midiClipsCount++;
        }
      });

      const avgVolume = activeTrackCount > 0 ? Number((activeVolumeSum / activeTrackCount).toFixed(2)) : 0;
      const complexityScore = (audioClipsCount * 1.2) + (midiClipsCount * 1.5) + (activeTrackCount * 0.8);

      return {
        bar: `Bar ${barNum}`,
        barNum,
        audioClips: audioClipsCount,
        midiClips: midiClipsCount,
        totalActive: audioClipsCount + midiClipsCount,
        avgVolume,
        complexityScore: Number(complexityScore.toFixed(1))
      };
    });

    if (barZoom === 'first_half') return barsData.slice(0, 8);
    if (barZoom === 'second_half') return barsData.slice(8, 16);
    return barsData;
  }, [tracks, barZoom]);

  // Compute Stem & Instrument Category Distribution
  const stemData = useMemo(() => {
    const categories: Record<string, { count: number; volumeSum: number; color: string }> = {
      'Drums': { count: 0, volumeSum: 0, color: '#FF2E63' },
      'Bass': { count: 0, volumeSum: 0, color: '#A855F7' },
      'Vocals': { count: 0, volumeSum: 0, color: '#00F0FF' },
      'Synths & Keys': { count: 0, volumeSum: 0, color: '#FFD700' },
      'FX & Other': { count: 0, volumeSum: 0, color: '#10B981' }
    };

    tracks.forEach(track => {
      const name = track.name.toLowerCase();
      let cat = 'FX & Other';
      if (name.includes('drum') || name.includes('kick') || name.includes('snare') || name.includes('perc')) cat = 'Drums';
      else if (name.includes('bass') || name.includes('sub')) cat = 'Bass';
      else if (name.includes('vocal') || name.includes('vox') || name.includes('mic')) cat = 'Vocals';
      else if (name.includes('synth') || name.includes('lead') || name.includes('pad') || name.includes('keys') || name.includes('piano') || track.type === 'midi') cat = 'Synths & Keys';

      categories[cat].count += 1;
      categories[cat].volumeSum += track.volume;
    });

    return Object.entries(categories).map(([name, data]) => ({
      name,
      value: data.count,
      avgVolumeDb: data.count > 0 ? Number((20 * Math.log10(data.volumeSum / data.count)).toFixed(1)) : -60,
      color: data.color
    })).filter(item => item.value > 0);
  }, [tracks]);

  // Stereo Panning Field Distribution
  const panFieldData = useMemo(() => {
    let leftCount = 0;
    let centerCount = 0;
    let rightCount = 0;

    tracks.forEach(t => {
      if (t.pan < -0.15) leftCount++;
      else if (t.pan > 0.15) rightCount++;
      else centerCount++;
    });

    return [
      { field: 'Left Field (< -15%)', count: leftCount, color: '#38BDF8' },
      { field: 'Center Anchor (-15% to +15%)', count: centerCount, color: '#FFD700' },
      { field: 'Right Field (> +15%)', count: rightCount, color: '#EC4899' }
    ];
  }, [tracks]);

  // Hardware Estimates (CPU, VRAM, RAM)
  const hardwareMetrics = useMemo(() => {
    const totalClips = tracks.reduce((sum, t) => sum + (t.clips?.length || 0), 0);
    const totalVsts = tracks.reduce((sum, t) => sum + (t.vsts?.length || 0), 0);

    // DSP CPU Estimate: base 4% + 1.8% per track + 2.5% per VST insert
    const estimatedCpuPct = Math.min(88, Math.round(4 + (tracks.length * 1.8) + (totalVsts * 2.5)));

    // Neural VRAM Estimate (GB): Base UI 0.6GB + Models active (Ace-Step 2.4GB, Kobold 3.6GB, Basic Pitch 1.1GB)
    const estimatedVramGb = Number((0.8 + (tracks.length * 0.12) + (totalVsts > 0 ? 0.6 : 0)).toFixed(2));

    // Audio Buffer RAM allocation (MB): ~45MB per active audio track (48kHz/24bit stereo)
    const audioTrackCount = tracks.filter(t => t.type === 'audio').length;
    const estimatedRamMb = Math.round(180 + (audioTrackCount * 45) + (totalClips * 12));

    const cores = typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 8 : 8;

    return {
      estimatedCpuPct,
      estimatedVramGb,
      estimatedRamMb,
      cores,
      totalClips,
      totalVsts
    };
  }, [tracks]);

  // Hardware time-series simulation
  const hardwareTimeSeries = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const timeLabel = `-${(12 - i) * 5}s`;
      const jitter = (Math.sin(i * 1.2) * 4);
      return {
        time: timeLabel,
        cpu: Math.max(8, Math.round(hardwareMetrics.estimatedCpuPct + jitter)),
        vram: Number((hardwareMetrics.estimatedVramGb + (Math.sin(i * 0.8) * 0.08)).toFixed(2)),
        ram: Math.round(hardwareMetrics.estimatedRamMb + (Math.cos(i) * 15))
      };
    });
  }, [hardwareMetrics]);

  // Mix Balance Radar Metrics
  const radarData = useMemo(() => {
    const audioTracks = tracks.filter(t => t.type === 'audio').length;
    const midiTracks = tracks.filter(t => t.type === 'midi').length;
    const mutedTracks = tracks.filter(t => t.muted).length;
    const soloedTracks = tracks.filter(t => t.soloed).length;
    const automatedTracks = tracks.filter(t => t.automation?.volume?.visible || t.automation?.pan?.visible).length;

    return [
      { metric: 'Audio Density', score: Math.min(100, audioTracks * 20) },
      { metric: 'MIDI Harmony', score: Math.min(100, midiTracks * 25) },
      { metric: 'Stereo Spread', score: Math.min(100, tracks.filter(t => Math.abs(t.pan) > 0.2).length * 28) },
      { metric: 'Automation', score: Math.min(100, (automatedTracks + 1) * 30) },
      { metric: 'DSP Complexity', score: Math.min(100, hardwareMetrics.totalVsts * 25 + 20) },
      { metric: 'Gain Headroom', score: Math.min(100, Math.round((1 - (tracks.reduce((a, b) => a + b.volume, 0) / (tracks.length || 1))) * 120)) }
    ];
  }, [tracks, hardwareMetrics]);

  const handleDownloadReport = () => {
    const report = {
      project: session.name,
      bpm: tempo,
      sampleRate: session.sampleRate,
      bitDepth: session.bitDepth,
      generatedAt: new Date().toISOString(),
      metrics: {
        totalTracks: tracks.length,
        audioTracks: tracks.filter(t => t.type === 'audio').length,
        midiTracks: tracks.filter(t => t.type === 'midi').length,
        totalClips: hardwareMetrics.totalClips,
        estimatedCpuPercent: hardwareMetrics.estimatedCpuPct,
        estimatedVramGb: hardwareMetrics.estimatedVramGb,
        estimatedRamMb: hardwareMetrics.estimatedRamMb,
        stems: stemData
      }
    };

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${session.name.replace(/\.[^/.]+$/, '')}_Telemetry_Report.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full w-full bg-[#05070E] flex flex-col overflow-y-auto p-4 md:p-6 text-white font-mono select-none">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#1A2338]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00F0FF]/20 via-[#FFD700]/20 to-[#A855F7]/20 border border-[#00F0FF] flex items-center justify-center shadow-[0_0_20px_rgba(0,240,255,0.3)]">
            <BarChart3 size={22} className="text-[#00F0FF]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-black uppercase tracking-widest text-[#FFD700]">
                STRANGELET LAB
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 font-bold">
                RECHARTS TELEMETRY
              </span>
            </div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              PROJECT STATISTICS & MIX COMPLEXITY
            </h1>
          </div>
        </div>

        {/* Global Navigation and Report Export */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadReport}
            className="px-3 py-1.5 rounded-lg bg-[#0F172A] hover:bg-[#1E293B] border border-[#334155] text-xs font-bold text-[#94A3B8] hover:text-white transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Download full project analytics report as JSON"
          >
            <Download size={13} className="text-[#00F0FF]" />
            <span>EXPORT REPORT</span>
          </button>

          {onNavigateToMixer && (
            <button
              onClick={onNavigateToMixer}
              className="px-4 py-1.5 rounded-lg bg-gradient-to-r from-[#FF8C00] to-[#FFD700] text-black font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(255,140,0,0.4)] hover:brightness-110 active:scale-95 cursor-pointer"
            >
              <Sliders size={13} />
              <span>RETURN TO MIXER</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Metrics KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 my-4">
        <div className="p-3 rounded-xl bg-[#080C16] border border-[#18233C] shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase">
            <span>Arrangement</span>
            <Layers size={13} className="text-[#00F0FF]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-white">{tracks.length}</span>
            <span className="text-[11px] text-[#64748B]">Tracks</span>
          </div>
          <div className="text-[9px] text-[#94A3B8] mt-1">
            {tracks.filter(t => t.type === 'audio').length} Audio • {tracks.filter(t => t.type === 'midi').length} MIDI
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#080C16] border border-[#18233C] shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase">
            <span>Active Clips</span>
            <Music size={13} className="text-[#A855F7]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#A855F7]">{hardwareMetrics.totalClips}</span>
            <span className="text-[11px] text-[#64748B]">Clips</span>
          </div>
          <div className="text-[9px] text-[#94A3B8] mt-1">
            Across 16 arrangement bars
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#080C16] border border-[#18233C] shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase">
            <span>DSP CPU Est.</span>
            <Cpu size={13} className="text-[#FFD700]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#FFD700]">{hardwareMetrics.estimatedCpuPct}%</span>
            <span className="text-[11px] text-[#64748B]">Load</span>
          </div>
          <div className="text-[9px] text-[#94A3B8] mt-1">
            {hardwareMetrics.cores} CPU threads active
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#080C16] border border-[#18233C] shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase">
            <span>Neural VRAM</span>
            <Zap size={13} className="text-[#EC4899]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#EC4899]">{hardwareMetrics.estimatedVramGb}</span>
            <span className="text-[11px] text-[#64748B]">GB</span>
          </div>
          <div className="text-[9px] text-[#94A3B8] mt-1">
            GGUF & Audio diffusion
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#080C16] border border-[#18233C] shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase">
            <span>Audio RAM Pool</span>
            <HardDrive size={13} className="text-[#10B981]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#10B981]">{hardwareMetrics.estimatedRamMb}</span>
            <span className="text-[11px] text-[#64748B]">MB</span>
          </div>
          <div className="text-[9px] text-[#94A3B8] mt-1">
            {session.sampleRate / 1000}kHz / {session.bitDepth}-bit
          </div>
        </div>

        <div className="p-3 rounded-xl bg-[#080C16] border border-[#18233C] shadow-inner flex flex-col justify-between">
          <div className="flex items-center justify-between text-[10px] text-[#64748B] uppercase">
            <span>Session Tempo</span>
            <Activity size={13} className="text-[#FF8C00]" />
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-2xl font-black text-[#FF8C00]">{tempo}</span>
            <span className="text-[11px] text-[#64748B]">BPM</span>
          </div>
          <div className="text-[9px] text-[#94A3B8] mt-1 truncate" title={session.name}>
            {session.name}
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-[#1A2338] mb-4 pb-2">
        <div className="flex items-center gap-2">
          {(['overview', 'density', 'mix', 'hardware'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase transition-all cursor-pointer ${
                activeTab === tab
                  ? 'bg-[#00F0FF]/15 border border-[#00F0FF] text-[#00F0FF] shadow-[0_0_10px_rgba(0,240,255,0.25)]'
                  : 'text-[#64748B] hover:text-white hover:bg-[#101728]'
              }`}
            >
              {tab === 'overview' && '1. Overview Dashboard'}
              {tab === 'density' && '2. Track & Clip Density'}
              {tab === 'mix' && '3. Mix & Panning Balance'}
              {tab === 'hardware' && '4. CPU & VRAM Telemetry'}
            </button>
          ))}
        </div>

        {/* Timeline Zoom Toggle for Density View */}
        {(activeTab === 'overview' || activeTab === 'density') && (
          <div className="flex items-center gap-1 bg-[#090D18] border border-[#1E293B] rounded-lg p-0.5 text-[10px]">
            <span className="px-1 text-[#64748B]">TIMELINE:</span>
            {(['all', 'first_half', 'second_half'] as const).map(z => (
              <button
                key={z}
                onClick={() => setBarZoom(z)}
                className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                  barZoom === z ? 'bg-[#FFD700] text-black' : 'text-[#64748B] hover:text-white'
                }`}
              >
                {z === 'all' ? '16 BARS' : z === 'first_half' ? 'BARS 1-8' : 'BARS 9-16'}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Main Density Bar Chart */}
          <div className="lg:col-span-8 p-4 rounded-2xl bg-[#080C16] border border-[#18233C] flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#141C2E] mb-3">
              <div className="flex items-center gap-2">
                <BarChart3 size={15} className="text-[#00F0FF]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Arrangement Clip Density by Measure
                </h3>
              </div>
              <span className="text-[10px] text-[#64748B]">Active Regions across 16 Bars</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="bar" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090D18', borderColor: '#00F0FF', borderRadius: 8, fontSize: 11 }}
                    itemStyle={{ color: '#E2E8F0' }}
                  />
                  <Bar dataKey="audioClips" name="Audio Clips" fill="#00F0FF" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="midiClips" name="MIDI Clips" fill="#A855F7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Radar Radar Balance Chart */}
          <div className="lg:col-span-4 p-4 rounded-2xl bg-[#080C16] border border-[#18233C] flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#141C2E] mb-2">
              <div className="flex items-center gap-2">
                <Sparkles size={15} className="text-[#FFD700]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Mix Complexity Index
                </h3>
              </div>
              <span className="text-[10px] text-[#64748B]">Hexagonal Radar</span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="#1E293B" />
                  <PolarAngleAxis dataKey="metric" stroke="#94A3B8" fontSize={9} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="#334155" fontSize={8} />
                  <Radar name="Project Profile" dataKey="score" stroke="#FFD700" fill="#FFD700" fillOpacity={0.3} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090D18', borderColor: '#FFD700', borderRadius: 8, fontSize: 11 }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Stem Breakdown Pie Chart */}
          <div className="lg:col-span-6 p-4 rounded-2xl bg-[#080C16] border border-[#18233C] flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#141C2E] mb-2">
              <div className="flex items-center gap-2">
                <PieIcon size={15} className="text-[#FF2E63]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Stem Category Balance
                </h3>
              </div>
              <span className="text-[10px] text-[#64748B]">{stemData.length} active categories</span>
            </div>

            <div className="h-60 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stemData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stemData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090D18', borderColor: '#334155', borderRadius: 8, fontSize: 11 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span style={{ color: '#CBD5E1', fontSize: 11 }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Hardware Area Chart */}
          <div className="lg:col-span-6 p-4 rounded-2xl bg-[#080C16] border border-[#18233C] flex flex-col shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#141C2E] mb-2">
              <div className="flex items-center gap-2">
                <Cpu size={15} className="text-[#10B981]" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                  Real-time DSP Engine Load (Past 60s)
                </h3>
              </div>
              <span className="text-[10px] text-emerald-400 font-bold">~{hardwareMetrics.estimatedCpuPct}% CPU</span>
            </div>

            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hardwareTimeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={10} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090D18', borderColor: '#10B981', borderRadius: 8, fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="cpu" name="DSP CPU Load %" stroke="#10B981" fill="#10B981" fillOpacity={0.25} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DENSITY & TIMELINE */}
      {activeTab === 'density' && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl bg-[#080C16] border border-[#18233C] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#141C2E] mb-4">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Bar-by-Bar Multi-Track Arrangement Density
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Visualizes audio waveform chunks and MIDI sequences arranged across each measure.
                </p>
              </div>
            </div>

            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={timelineData} margin={{ top: 15, right: 15, left: -10, bottom: 0 }}>
                  <XAxis dataKey="bar" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090D18', borderColor: '#00F0FF', borderRadius: 8, fontSize: 12 }}
                  />
                  <Bar dataKey="audioClips" name="Audio Waveform Regions" fill="#00F0FF" stackId="a" />
                  <Bar dataKey="midiClips" name="MIDI Note Clips" fill="#A855F7" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#080C16] border border-[#18233C]">
              <span className="text-[10px] text-[#64748B] uppercase">Peak Complexity Measure</span>
              <div className="text-xl font-bold text-[#FFD700] mt-1">
                {timelineData.reduce((prev, curr) => curr.totalActive > prev.totalActive ? curr : prev, timelineData[0]).bar}
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                Highest arrangement concurrency with {timelineData.reduce((prev, curr) => Math.max(prev, curr.totalActive), 0)} layered clips.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#080C16] border border-[#18233C]">
              <span className="text-[10px] text-[#64748B] uppercase">Clip Ratio</span>
              <div className="text-xl font-bold text-[#00F0FF] mt-1">
                {tracks.filter(t => t.type === 'audio').length} Audio / {tracks.filter(t => t.type === 'midi').length} MIDI
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                Balanced multi-track arrangement composition.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-[#080C16] border border-[#18233C]">
              <span className="text-[10px] text-[#64748B] uppercase">Total Arranged Duration</span>
              <div className="text-xl font-bold text-[#10B981] mt-1">
                {((16 * 4 * 60) / tempo).toFixed(1)} Seconds
              </div>
              <p className="text-xs text-[#94A3B8] mt-1">
                16 measures at {tempo} BPM loop length.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MIX & PANNING BALANCE */}
      {activeTab === 'mix' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-6 p-5 rounded-2xl bg-[#080C16] border border-[#18233C] shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Stem Category Distribution
            </h3>
            <p className="text-xs text-[#64748B] mb-4">
              Breakdown of tracks categorized by frequency function.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stemData} layout="vertical" margin={{ top: 10, right: 20, left: 40, bottom: 0 }}>
                  <XAxis type="number" stroke="#475569" fontSize={10} tickLine={false} />
                  <YAxis type="category" dataKey="name" stroke="#94A3B8" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090D18', borderColor: '#00F0FF', borderRadius: 8, fontSize: 11 }}
                  />
                  <Bar dataKey="value" name="Track Count" fill="#00F0FF" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="lg:col-span-6 p-5 rounded-2xl bg-[#080C16] border border-[#18233C] shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-1">
              Stereo Panorama Field Distribution
            </h3>
            <p className="text-xs text-[#64748B] mb-4">
              Pan pot localization spread across Left, Center, and Right.
            </p>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={panFieldData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={4}
                    dataKey="count"
                  >
                    {panFieldData.map((entry, index) => (
                      <Cell key={`pan-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090D18', borderColor: '#334155', borderRadius: 8, fontSize: 11 }}
                  />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle"
                    formatter={(val) => <span style={{ color: '#CBD5E1', fontSize: 11 }}>{val}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: HARDWARE & VRAM TELEMETRY */}
      {activeTab === 'hardware' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-[#080C16] border border-[#18233C]">
              <span className="text-[10px] text-[#64748B] uppercase">CPU Core Allocation</span>
              <div className="text-2xl font-bold text-[#FFD700] mt-1">{hardwareMetrics.cores} Logical Cores</div>
              <p className="text-xs text-[#94A3B8] mt-1">Multi-core Web Audio rendering enabled</p>
            </div>

            <div className="p-4 rounded-xl bg-[#080C16] border border-[#18233C]">
              <span className="text-[10px] text-[#64748B] uppercase">Active VST & DSP Nodes</span>
              <div className="text-2xl font-bold text-[#00F0FF] mt-1">{hardwareMetrics.totalVsts} Active Effects</div>
              <p className="text-xs text-[#94A3B8] mt-1">Faust DSP & analog tape saturators</p>
            </div>

            <div className="p-4 rounded-xl bg-[#080C16] border border-[#18233C]">
              <span className="text-[10px] text-[#64748B] uppercase">Neural Models in VRAM</span>
              <div className="text-2xl font-bold text-[#EC4899] mt-1">~{hardwareMetrics.estimatedVramGb} GB VRAM</div>
              <p className="text-xs text-[#94A3B8] mt-1">Ace-Step, Kobold, Basic Pitch footprint</p>
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#080C16] border border-[#18233C] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#141C2E] mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                System Telemetry Timeline (DSP CPU & Buffer Footprint)
              </h3>
              <span className="text-xs text-emerald-400 font-bold">Stable Operational Envelope</span>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={hardwareTimeSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                  <XAxis dataKey="time" stroke="#475569" fontSize={11} tickLine={false} />
                  <YAxis stroke="#475569" fontSize={11} tickLine={false} domain={[0, 100]} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#090D18', borderColor: '#10B981', borderRadius: 8, fontSize: 11 }}
                  />
                  <Area type="monotone" dataKey="cpu" name="DSP CPU Load (%)" stroke="#FFD700" fill="#FFD700" fillOpacity={0.2} />
                  <Area type="monotone" dataKey="ram" name="Buffer Memory (MB)" stroke="#00F0FF" fill="#00F0FF" fillOpacity={0.15} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectStatisticsDashboard;
