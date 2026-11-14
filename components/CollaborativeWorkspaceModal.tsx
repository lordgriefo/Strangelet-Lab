import React, { useState, useEffect, useRef } from 'react';
import { 
  Users, 
  X, 
  Copy, 
  Check, 
  Radio, 
  MessageSquare, 
  Activity, 
  Sparkles, 
  Share2, 
  Wifi, 
  Sliders, 
  Volume2, 
  Send, 
  UserPlus, 
  LogOut, 
  Globe 
} from 'lucide-react';
import { collabService, CollabSessionState, CollabUser } from '../services/collabService';
import { Track } from '../types';
import { playLaserBeamSound, playColliderInjectionSound } from '../lib/laserSound';

interface CollaborativeWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  tracks: Track[];
  tempo: number;
}

export const CollaborativeWorkspaceModal: React.FC<CollaborativeWorkspaceModalProps> = ({
  isOpen,
  onClose,
  tracks,
  tempo
}) => {
  const [collabState, setCollabState] = useState<CollabSessionState>(collabService.getState());
  const [activeTab, setActiveTab] = useState<'session' | 'members' | 'chat'>('session');
  const [joinCodeInput, setJoinCodeInput] = useState<string>('');
  const [nameInput, setNameInput] = useState<string>(collabState.currentUser?.name || '');
  const [chatInput, setChatInput] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return collabService.subscribe(setCollabState);
  }, []);

  useEffect(() => {
    if (activeTab === 'chat') {
      chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [collabState.chatMessages, activeTab]);

  const handleCreateSession = () => {
    playColliderInjectionSound();
    collabService.createSession(tracks, tempo);
  };

  const handleJoinSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCodeInput.trim()) return;
    playColliderInjectionSound();
    collabService.joinSession(joinCodeInput, tracks, tempo);
    setJoinCodeInput('');
  };

  const handleLeaveSession = () => {
    playLaserBeamSound('laser_select');
    collabService.leaveSession();
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;
    collabService.updateCurrentUser({ name: nameInput.trim() });
    playLaserBeamSound('laser_select');
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    collabService.sendChatMessage(chatInput.trim());
    setChatInput('');
    playLaserBeamSound('laser_audio');
  };

  const handleCopyCode = () => {
    if (!collabState.sessionCode) return;
    navigator.clipboard.writeText(collabState.sessionCode);
    setCopiedCode(true);
    playLaserBeamSound('laser_select');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    if (!collabState.sessionCode) return;
    const url = new URL(window.location.href);
    url.searchParams.set('session', collabState.sessionCode);
    navigator.clipboard.writeText(url.toString());
    setCopiedLink(true);
    playLaserBeamSound('laser_select');
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9996] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-fade-in font-mono select-none">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-[#090C16] border border-[#232A44] shadow-[0_0_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#1E253D] bg-gradient-to-r from-[#0C1124] via-[#121934] to-[#0A0D1A] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/50 flex items-center justify-center text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-wider uppercase text-white">
                  REAL-TIME COLLABORATIVE WORKSPACE
                </h2>
                <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                  collabState.isConnected 
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50' 
                    : 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                }`}>
                  {collabState.isConnected ? 'ONLINE & SYNCED' : 'LOCAL ONLY'}
                </span>
              </div>
              <p className="text-xs text-[#8288AA]">
                Multiple producers in the same network or remote jam together via shared session code.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#7E85A8] hover:text-white hover:bg-[#1E233B] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-2 pb-0 bg-[#070A14] border-b border-[#181F33] flex items-center gap-2 text-xs">
          <button
            onClick={() => setActiveTab('session')}
            className={`px-3 py-2 border-b-2 font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'session'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-[#7680A2] hover:text-white'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Session &amp; Network</span>
          </button>

          <button
            onClick={() => setActiveTab('members')}
            className={`px-3 py-2 border-b-2 font-bold flex items-center gap-1.5 transition-colors ${
              activeTab === 'members'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-[#7680A2] hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Collaborators ({collabState.members.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('chat')}
            className={`px-3 py-2 border-b-2 font-bold flex items-center gap-1.5 transition-colors relative ${
              activeTab === 'chat'
                ? 'border-cyan-400 text-cyan-300 bg-cyan-950/20'
                : 'border-transparent text-[#7680A2] hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>Live Chat &amp; Activity</span>
            {collabState.chatMessages.length > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            )}
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs flex-1">
          {activeTab === 'session' && (
            <div className="space-y-4">
              {collabState.isConnected && collabState.sessionCode ? (
                /* Connected Session Overview */
                <div className="p-4 rounded-xl bg-gradient-to-r from-[#0E1528] via-[#101934] to-[#0A0E1C] border border-cyan-500/40 shadow-[0_0_25px_rgba(6,182,212,0.15)] space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-[#717EAA] uppercase font-bold">Active Session Code</div>
                      <div className="text-2xl font-black text-white tracking-widest flex items-center gap-2 mt-0.5 font-mono">
                        <span className="text-cyan-300">{collabState.sessionCode}</span>
                        <button
                          onClick={handleCopyCode}
                          className="p-1 rounded bg-[#17203A] hover:bg-[#1E2B50] text-cyan-300 border border-cyan-500/30 transition-all"
                          title="Copy Code to Clipboard"
                        >
                          {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleCopyLink}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/50 font-bold text-xs flex items-center gap-1.5 transition-all"
                      >
                        {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span>{copiedLink ? 'Copied Link!' : 'Share Link'}</span>
                      </button>

                      <button
                        onClick={handleLeaveSession}
                        className="px-3 py-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/80 text-red-300 border border-red-500/40 font-bold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Leave</span>
                      </button>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-[#8692B8]">
                    <div className="flex items-center gap-3">
                      <span>Producers Online: <strong className="text-white">{collabState.members.length}</strong></span>
                      <span>•</span>
                      <span>Latency: <strong className="text-emerald-400">{collabState.latencyMs !== null ? `${collabState.latencyMs}ms` : '<10ms'}</strong></span>
                      <span>•</span>
                      <span>Transport: <strong className="text-amber-300">{tempo} BPM</strong></span>
                    </div>

                    <span className="text-[10px] text-cyan-400 font-bold">
                      {collabState.connectionType === 'websocket' ? 'WebSocket Port 3000' : 'Local Mesh Sync'}
                    </span>
                  </div>
                </div>
              ) : (
                /* Join or Host Session Form */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Host New Session Card */}
                  <div className="p-4 rounded-xl bg-[#0E1324] border border-[#222B48] flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <h3 className="font-bold text-white text-xs uppercase tracking-wider">Host New Session</h3>
                      </div>
                      <p className="text-[10px] text-[#828BAE] mt-1 leading-relaxed">
                        Generate a shared session code and broadcast your mixer faders, tempo, and stems to collaborators on your network.
                      </p>
                    </div>

                    <button
                      onClick={handleCreateSession}
                      className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] border border-cyan-400/40 transition-all cursor-pointer active:scale-95"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Host Jam Session</span>
                    </button>
                  </div>

                  {/* Join Existing Session Card */}
                  <div className="p-4 rounded-xl bg-[#0E1324] border border-[#222B48] space-y-3">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-amber-400" />
                      <h3 className="font-bold text-white text-xs uppercase tracking-wider">Join via Code</h3>
                    </div>

                    <form onSubmit={handleJoinSession} className="space-y-2">
                      <input
                        type="text"
                        value={joinCodeInput}
                        onChange={e => setJoinCodeInput(e.target.value.toUpperCase())}
                        placeholder="ENTER SESSION CODE (e.g. NEON-7701)"
                        className="w-full px-3 py-2 rounded-lg bg-[#070A14] border border-[#232D4C] text-white font-mono text-xs uppercase focus:outline-none focus:border-cyan-400 placeholder:text-[#555E80]"
                      />
                      <button
                        type="submit"
                        disabled={!joinCodeInput.trim()}
                        className="w-full py-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold text-xs disabled:opacity-40 transition-all"
                      >
                        Join Room
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Your Producer Profile */}
              <div className="p-3.5 rounded-xl bg-[#0B0F20] border border-[#1C2442] space-y-2">
                <span className="text-[10px] text-[#717EAA] uppercase font-bold tracking-wider">
                  Your Collaborator Profile
                </span>
                <form onSubmit={handleSaveProfile} className="flex items-center gap-2">
                  <div 
                    className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-black flex-shrink-0"
                    style={{ backgroundColor: collabState.currentUser?.color || '#00F0FF' }}
                  >
                    {collabState.currentUser?.name.charAt(0) || 'P'}
                  </div>

                  <input
                    type="text"
                    value={nameInput}
                    onChange={e => setNameInput(e.target.value)}
                    placeholder="Your Display Name (e.g. Alex Guitar, Lead Mixer)"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-[#070A14] border border-[#232D4C] text-white text-xs focus:outline-none focus:border-cyan-400"
                  />

                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#161F36] hover:bg-[#202C4C] text-white font-bold text-xs border border-[#2B385C] transition-colors"
                  >
                    Save Name
                  </button>
                </form>
              </div>

              {/* Network Jam Guide */}
              <div className="p-3.5 rounded-xl bg-[#090C18] border border-[#181F33] space-y-1.5 text-[10px] text-[#8691B6] leading-relaxed">
                <div className="font-bold text-white flex items-center gap-1.5">
                  <Wifi className="w-3.5 h-3.5 text-cyan-400" />
                  <span>How Same-Network Collaboration Works:</span>
                </div>
                <p>
                  • <strong>On the same WiFi / Local Network:</strong> Any collaborator can open your host URL or enter the shared session code to join your jam session.
                </p>
                <p>
                  • <strong>Real-Time Sync:</strong> Volume faders, pan knobs, solo/mute buttons, and tempo update instantly across all connected laptops and workstations without latency.
                </p>
                <p>
                  • <strong>Infinite Loop Guard:</strong> Incoming updates are tagged so peer actions won't echo back and disrupt your local automation or listening.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'members' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] text-[#7E88AA]">
                <span>Connected Collaborators in Session ({collabState.members.length})</span>
                <span className="text-emerald-400 font-bold">Live Room Presence</span>
              </div>

              <div className="space-y-2">
                {collabState.members.map(member => {
                  const isYou = member.id === collabState.currentUser?.id;

                  return (
                    <div 
                      key={member.id}
                      className="p-3 rounded-xl bg-[#0E1324] border border-[#1E263E] flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2.5">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm text-black shadow-sm"
                          style={{ backgroundColor: member.color }}
                        >
                          {member.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-xs">{member.name}</span>
                            {isYou && (
                              <span className="text-[8px] px-1 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/50 font-bold">
                                YOU
                              </span>
                            )}
                            <span className="text-[8px] px-1 rounded bg-[#171E36] text-[#9CA5CA] font-mono uppercase">
                              {member.role}
                            </span>
                          </div>
                          <div className="text-[9px] text-[#636C8C]">
                            Connected {new Date(member.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span className="text-[10px] text-emerald-300 font-bold">Active</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'chat' && (
            <div className="flex flex-col h-[320px] bg-[#070A14] rounded-xl border border-[#1C243E] overflow-hidden">
              {/* Message History */}
              <div className="flex-1 p-3 overflow-y-auto space-y-2 custom-scrollbar">
                {collabState.chatMessages.map(msg => (
                  <div key={msg.id} className="text-[11px] leading-relaxed">
                    <span 
                      className="font-bold font-mono mr-1.5"
                      style={{ color: msg.senderColor }}
                    >
                      {msg.senderName}:
                    </span>
                    <span className="text-[#CAD2EA]">{msg.text}</span>
                    <span className="text-[8px] text-[#555E7C] ml-2 font-mono">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}

                {collabState.activityLog.map(act => (
                  <div key={act.id} className="text-[9px] text-[#697394] italic font-mono py-0.5">
                    ⚡ {act.text}
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendChat} className="p-2 bg-[#0A0E1C] border-t border-[#1C243E] flex items-center gap-2">
                <input
                  type="text"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Collaborator chat (e.g. check faders, take 2 is live)..."
                  className="flex-1 px-3 py-1.5 rounded-lg bg-[#0E1324] border border-[#232D4C] text-white text-xs focus:outline-none focus:border-cyan-400 placeholder:text-[#555E80]"
                />
                <button
                  type="submit"
                  disabled={!chatInput.trim()}
                  className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-white font-bold transition-all"
                  title="Send message"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
