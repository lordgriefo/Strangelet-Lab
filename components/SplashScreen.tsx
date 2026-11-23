import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, FastForward, Play, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  isOpen,
  onClose,
  videoSrc = './strangelet_splash_screen.mp4'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isFadingOut, setIsFadingOut] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [needsUserInteraction, setNeedsUserInteraction] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [duration, setDuration] = useState<number>(10.03);

  // Trigger close with smooth CSS fade-out transition
  const handleDismiss = () => {
    if (isFadingOut) return;
    setIsFadingOut(true);
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      onClose();
    }, 600);
  };

  // Keyboard shortcut listener: ESC or Space skips splash screen
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.code === 'Space') {
        e.preventDefault();
        handleDismiss();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isFadingOut]);

  // Handle Autoplay & Audio Initiation
  useEffect(() => {
    if (!isOpen) {
      setIsFadingOut(false);
      setProgress(0);
      return;
    }

    const video = videoRef.current;
    if (!video) return;

    video.currentTime = 0;
    video.volume = 1.0;
    video.muted = false;

    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        console.warn('Autoplay with sound blocked by browser policy. Awaiting user interaction:', err);
        setNeedsUserInteraction(true);
      });
    }
  }, [isOpen]);

  const handleUserStart = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = false;
      video.volume = 1.0;
      video.play().then(() => {
        setNeedsUserInteraction(false);
      }).catch(err => {
        console.error('Play error after interaction:', err);
        setNeedsUserInteraction(false);
      });
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      const next = !videoRef.current.muted;
      videoRef.current.muted = next;
      setIsMuted(next);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className={`fixed inset-0 z-[99999] bg-black flex items-center justify-center overflow-hidden transition-opacity duration-700 ease-out select-none ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Background CRT phosphor glow and scanlines */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1a1708]/30 via-[#0a0a0f] to-black pointer-events-none z-10" />
      
      {/* Subtle CRT scanline effect */}
      <div 
        className="absolute inset-0 pointer-events-none z-20 opacity-20"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.45), rgba(0, 0, 0, 0.45) 1px, transparent 1px, transparent 2px)',
          backgroundSize: '100% 2px'
        }}
      />

      {/* Main Video Screen */}
      <div className="relative w-full h-full flex items-center justify-center">
        <video
          ref={videoRef}
          src={videoSrc}
          playsInline
          className="w-full h-full object-contain max-w-[1920px] max-h-[1080px] z-10"
          onTimeUpdate={(e) => {
            const v = e.currentTarget;
            if (v.duration) {
              setProgress((v.currentTime / v.duration) * 100);
              setDuration(v.duration);
            }
          }}
          onEnded={handleDismiss}
          onError={() => {
            console.warn('Splash screen video failed to load or play, bypassing directly to studio console.');
            handleDismiss();
          }}
        />

        {/* Autoplay Blocker Overlay Prompt (if browser blocked unmuted sound on cold launch) */}
        {needsUserInteraction && (
          <div className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center animate-fade-in">
            <div className="w-20 h-20 rounded-2xl bg-[#1C170A] border border-[#FFD700]/40 flex items-center justify-center text-[#FFD700] mb-6 shadow-[0_0_35px_rgba(255,215,0,0.3)] animate-pulse">
              <Sparkles size={40} />
            </div>
            
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#FFD700] font-['Cinzel'] tracking-wider mb-2">
              STRANGELET LAB
            </h2>
            <div className="text-xs uppercase tracking-widest text-[#B0A880] font-mono mb-6">
              ESTD 1902 • SYSTEM TR-02 INITIALIZATION
            </div>
            
            <button
              onClick={handleUserStart}
              className="group flex items-center gap-3 px-8 py-3.5 bg-gradient-to-r from-[#FFD700] to-[#E6B800] hover:from-[#FFE44D] hover:to-[#FFD700] text-black font-bold rounded-xl shadow-[0_0_25px_rgba(255,215,0,0.4)] transition-all transform hover:scale-105 active:scale-95 cursor-pointer font-mono"
            >
              <Play size={20} className="fill-black" />
              <span>INITIALIZE STRANGELET SYSTEM</span>
            </button>
            
            <p className="mt-4 text-[11px] text-[#777] font-mono">
              Click to engage quantum-acoustic DSP sound engine & startup animation
            </p>
          </div>
        )}

        {/* Top-Left Vintage System Status HUD */}
        <div className="absolute top-6 left-6 z-30 flex items-center gap-3 pointer-events-none">
          <div className="w-2.5 h-2.5 rounded-full bg-[#FFD700] shadow-[0_0_10px_#FFD700] animate-pulse" />
          <div className="flex flex-col text-[10px] font-mono uppercase tracking-widest text-[#B0A880]/80">
            <span className="font-bold text-[#FFD700]">STRANGELET LAB • ESTD 1902</span>
            <span className="text-[9px] text-[#888]">TR-02 SYSTEM CORE // BOOT SEQ</span>
          </div>
        </div>

        {/* Bottom Interactive HUD: Skip & Mute Controls */}
        <div className="absolute bottom-6 left-6 right-6 z-30 flex items-center justify-between">
          {/* Timeline progress indicator */}
          <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-[10px] font-mono text-[#AAA]">
            <span>BOOTING</span>
            <div className="w-32 h-1.5 bg-[#1F1F28] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-[#FFD700] to-amber-500 transition-all duration-100"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span>{videoRef.current ? `${videoRef.current.currentTime.toFixed(1)}s` : '0.0s'} / {duration.toFixed(1)}s</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Audio Mute/Unmute */}
            <button
              onClick={toggleMute}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 hover:border-[#FFD700]/50 text-white/80 hover:text-[#FFD700] backdrop-blur-md transition-all cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX size={15} /> : <Volume2 size={15} />}
            </button>

            {/* Skip Button */}
            <button
              onClick={handleDismiss}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/90 border border-white/10 hover:border-[#FFD700]/50 text-white/90 hover:text-[#FFD700] backdrop-blur-md transition-all text-xs font-mono font-medium tracking-wider cursor-pointer group"
            >
              <span>SKIP</span>
              <FastForward size={14} className="group-hover:translate-x-0.5 transition-transform" />
              <span className="text-[10px] text-[#777] hidden sm:inline">[ESC]</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
