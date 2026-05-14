import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ThumbsUp, ThumbsDown, Share2, Download, 
  Scissors, MoreHorizontal, MoreVertical, Bell, Info,
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
  Maximize, Minimize, Settings, MessageSquare, SkipBack, SkipForward
} from 'lucide-react';
import { Video } from '../types';

interface VideoPlayerProps {
  video: Video | null;
  onClose: () => void;
  isTamilanPlanActive: boolean;
  onPlanActive: () => void;
}

const MOCK_ADS = [
  'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778679811/vidssave.com_MARLIA_ADS-_SATHYA_SAMY_ARUL___TVC___TAMIL___KAYADU_LOHAR_1080P_krg6mv.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-abstract-fast-moving-light-streaks-34757-large.mp4',
  'https://assets.mixkit.co/videos/preview/mixkit-stars-in-the-night-sky-121-large.mp4'
];

export default function VideoPlayer({ video, onClose, isTamilanPlanActive, onPlanActive }: VideoPlayerProps) {
  const [isAdPlaying, setIsAdPlaying] = useState(true);
  const [adQueue, setAdQueue] = useState<string[]>([MOCK_ADS[0]]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isSeekingAds, setIsSeekingAds] = useState(false);
  const [adRemainingTime, setAdRemainingTime] = useState(0);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [playedMidRolls, setPlayedMidRolls] = useState<number[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const lastTimeRef = useRef(0);
  const ignoreNextSeekRef = useRef(false);

  useEffect(() => {
    if (video) {
        setIsAdPlaying(!isTamilanPlanActive);
        setAdQueue([MOCK_ADS[0]]);
        setCurrentAdIndex(0);
        setIsSeekingAds(false);
        setPlayedMidRolls([]);
        lastTimeRef.current = 0;
        window.scrollTo(0, 0);
    }
  }, [video, isTamilanPlanActive]);

  if (!video) return null;

  const handleDownload = () => {
    if (!isTamilanPlanActive) {
      setShowSubscriptionModal(true);
    } else {
      alert("Downloading video... (Tamilan Plan Active)");
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: video.title,
      text: `Check out this video on VAAGAI: ${video.title}`,
      url: window.location.href,
    };

    if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          // Fallback if sharing failed for other reasons
          copyToClipboard();
        }
      }
    } else {
      copyToClipboard();
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copied to clipboard!');
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    if (isDisliked) setIsDisliked(false);
  };

  const handleDislike = () => {
    setIsDisliked(!isDisliked);
    if (isLiked) setIsLiked(false);
  };

  const handleAdEnded = () => {
    if (currentAdIndex < adQueue.length - 1) {
      setCurrentAdIndex(prev => prev + 1);
    } else {
      setIsAdPlaying(false);
      setIsSeekingAds(false);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.play();
        }
      }, 100);
    }
  };

  const handleAdTimeUpdate = () => {
    if (adVideoRef.current) {
      const remaining = Math.ceil(adVideoRef.current.duration - adVideoRef.current.currentTime);
      setAdRemainingTime(remaining || 0);
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = e.currentTarget;
    setCurrentTime(videoElement.currentTime);
    setDuration(videoElement.duration);
    
    if (isAdPlaying || isTamilanPlanActive) return;
    
    const currentTime = videoElement.currentTime;
    
    // Mid-roll logic: Try to play an ad every 45 seconds of playback
    const midRollInterval = 45;
    const currentInterval = Math.floor(currentTime / midRollInterval);
    
    if (currentInterval > 0 && !playedMidRolls.includes(currentInterval)) {
      videoElement.pause();
      setPlayedMidRolls(prev => [...prev, currentInterval]);
      
      setAdQueue([MOCK_ADS[Math.floor(Math.random() * MOCK_ADS.length)]]);
      setCurrentAdIndex(0);
      setIsAdPlaying(true);
      setIsSeekingAds(false);
      return;
    }

    // Seek detection: Trigger ads on any forward seek
    if (currentTime - lastTimeRef.current > 1.5 && !ignoreNextSeekRef.current) {
      videoElement.pause();
      const resumeTime = currentTime;
      
      setAdQueue(MOCK_ADS);
      setCurrentAdIndex(0);
      setIsAdPlaying(true);
      setIsSeekingAds(true);
      
      ignoreNextSeekRef.current = true;
      lastTimeRef.current = resumeTime;
    } else {
      lastTimeRef.current = currentTime;
      ignoreNextSeekRef.current = false;
    }
  };

  const togglePlay = () => {
    if (isAdPlaying) return;
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime += seconds;
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setIsMuted(v === 0);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(err => {
        console.error(`Error attempting to enable full-screen mode: ${err.message}`);
      });
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  return (
    <AnimatePresence>
      <motion.div
        id="video-player-root"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed inset-0 z-50 bg-bg-dark flex flex-col overflow-y-auto"
      >
        <div ref={containerRef} className="sticky top-0 z-50 bg-black w-full aspect-video group">
          <div className={`absolute top-4 left-4 z-20 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <button 
              onClick={onClose}
              className="p-2 bg-black/40 rounded-full hover:bg-black/60 transition-colors text-white"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>

          <div className="w-full h-full relative" onMouseMove={() => {
            setShowControls(true);
            const timeout = setTimeout(() => {
              if (isPlaying && !isAdPlaying) setShowControls(false);
            }, 3000);
            return () => clearTimeout(timeout);
          }}>
            {/* Background Thumbnail for continuity */}
            <div 
              className="absolute inset-0 z-0 opacity-40 blur-xl scale-110"
              style={{ 
                backgroundImage: `url(${video.thumbnail})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center'
              }}
            />

            {isAdPlaying ? (
              <div className="absolute inset-0 bg-black/40 z-10 flex items-center justify-center backdrop-blur-sm">
                <video
                  ref={adVideoRef}
                  key={`ad-${currentAdIndex}`}
                  autoPlay
                  className="w-full h-full object-contain relative z-20 shadow-2xl"
                  src={adQueue[currentAdIndex]}
                  onEnded={handleAdEnded}
                  onTimeUpdate={handleAdTimeUpdate}
                />
                
                {/* Dynamic Ad Timer Overlay - Pill style with blue theme */}
                <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="absolute top-4 right-4 z-30"
                >
                  <div className="bg-blue-900/40 backdrop-blur-2xl px-6 py-2 rounded-full border border-blue-400/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                    <span className="text-white font-black text-sm md:text-base tracking-tight whitespace-nowrap">
                      Ad {currentAdIndex + 1}/{adQueue.length} • Ends in {adRemainingTime}s
                    </span>
                  </div>
                </motion.div>
              </div>
            ) : null}

            <video
              ref={videoRef}
              autoPlay={false}
              controls={false}
              className={`w-full h-full object-contain ${isAdPlaying ? 'hidden' : ''}`}
              src={video.videoUrl}
              onTimeUpdate={handleTimeUpdate}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              poster={video.thumbnail}
              onClick={togglePlay}
            />

            {/* Custom Controls Overlay */}
            {!isAdPlaying && (
              <div className={`absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                {/* Center Play Button */}
                <div className="flex-1 flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={togglePlay}
                    className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-2xl transition-all hover:bg-white/30"
                  >
                    {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1" />}
                  </motion.button>
                </div>

                {/* Bottom Controls */}
                <div className="p-4 md:p-6 flex flex-col gap-2">
                  {/* Progress Bar */}
                  <div className="relative group/progress h-1 flex items-center mb-4">
                    <input
                      type="range"
                      min={0}
                      max={duration}
                      step={0.1}
                      value={currentTime}
                      onChange={handleProgressChange}
                      className="absolute inset-0 w-full opacity-0 z-20 cursor-pointer"
                    />
                    <div className="absolute inset-0 w-full h-1 bg-white/20 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-brand-primary" 
                        style={{ width: `${(currentTime / duration) * 100}%` }}
                      ></div>
                    </div>
                    {/* Thumb handle */}
                    <div 
                      className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-brand-primary z-10 transition-transform scale-0 group-hover/progress:scale-100 pointer-events-none"
                      style={{ left: `${(currentTime / duration) * 100}%`, transform: `translate(-50%, -50%) scale(${showControls ? 1 : 0})` }}
                    />
                    
                    {/* Time Tooltip */}
                    <div className="flex justify-between w-full text-[10px] sm:text-xs font-mono text-white/70 mt-4 absolute top-0">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                      {/* Volume */}
                      <div className="flex items-center gap-2 group/volume relative">
                        <button onClick={toggleMute} className="text-white hover:text-brand-primary transition-colors">
                          {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                        </button>
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.01}
                          value={isMuted ? 0 : volume}
                          onChange={handleVolumeChange}
                          className="w-0 group-hover/volume:w-24 transition-all overflow-hidden h-1 accent-brand-primary cursor-pointer"
                        />
                      </div>

                      {/* Playback Controls (Center/Left) */}
                      <div className="flex items-center gap-6">
                        <button onClick={() => skip(-10)} className="text-white hover:text-brand-primary transition-colors p-1">
                          <SkipBack className="w-6 h-6" />
                        </button>
                        <button onClick={togglePlay} className="text-white hover:text-brand-primary transition-colors p-1">
                          {isPlaying ? <Pause className="w-7 h-7" /> : <Play className="w-7 h-7 fill-white" />}
                        </button>
                        <button onClick={() => skip(10)} className="text-white hover:text-brand-primary transition-colors p-1">
                          <SkipForward className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      <button className="text-white hover:text-brand-primary transition-colors p-1">
                        <Settings className="w-5 h-5" />
                      </button>
                      <button className="text-white hover:text-brand-primary transition-colors p-1">
                        <MessageSquare className="w-5 h-5" /> {/* CC */}
                      </button>
                      <button onClick={toggleFullscreen} className="text-white hover:text-brand-primary transition-colors p-1">
                        {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 md:px-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
          <h1 className="text-xl md:text-2xl font-bold leading-tight">
            {video.title}
          </h1>
          
          <div className="flex flex-col gap-4 mt-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-4 scrollbar-hide">
              <div className="flex items-center bg-white/10 rounded-full shrink-0 overflow-hidden">
                <button 
                  onClick={handleLike}
                  className={`flex items-center gap-2 px-4 py-2 hover:bg-white/10 border-r border-white/5 font-medium text-sm transition-colors ${isLiked ? 'text-brand-primary' : 'text-white'}`}
                >
                  <ThumbsUp className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} /> {isLiked ? '1.3M' : '1.2M'}
                </button>
                <button 
                  onClick={handleDislike}
                  className={`px-4 py-2 hover:bg-white/10 transition-colors ${isDisliked ? 'text-red-500' : 'text-white'}`}
                >
                  <ThumbsDown className={`w-4 h-4 ${isDisliked ? 'fill-current' : ''}`} />
                </button>
              </div>
              
              <button 
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium text-sm transition-colors shrink-0"
              >
                <Share2 className="w-4 h-4" /> Share
              </button>
              
              <button className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-full font-medium text-sm transition-colors shrink-0">
                <Scissors className="w-4 h-4" /> Remix
              </button>

              <button 
                onClick={handleDownload}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shrink-0 ${isTamilanPlanActive ? 'bg-brand-primary text-white' : 'bg-white/10 hover:bg-white/20'}`}
              >
                <Download className="w-4 h-4" /> 
                {isTamilanPlanActive ? 'Download Ready' : 'Download'}
              </button>
              
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors shrink-0">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 flex flex-col gap-1 border border-white/5">
            <div className="flex gap-2 text-sm font-bold text-gray-300">
              <span>{video.views} views</span>
              <span>{video.uploadedAt}</span>
            </div>
            <p className="text-sm text-gray-200 leading-relaxed">
              {video.description}
            </p>
          </div>

          {/* User Comments Section Priority */}
          <div className="mt-6 flex flex-col gap-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <h3 className="text-xl font-black tracking-tight">Comments <span className="text-gray-500 font-bold ml-2">1.2K</span></h3>
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </div>
            
            <div className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center font-bold text-sm">D</div>
              <input 
                type="text" 
                placeholder="Add a comment..." 
                className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm focus:border-white focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-8">
              {[
                { user: 'Sathish Kumar', text: 'Amazing cinematography! The colors are just perfect.', time: '2 hours ago', likes: '1.2K' },
                { user: 'Priya Dev', text: 'Vaagai contents are always top notch. Keep it up!', time: '5 hours ago', likes: '850' },
                { user: 'Arun V', text: 'Tamil cinema is reaching new heights with these visuals.', time: '1 day ago', likes: '2.3K' }
              ].map((comment, i) => (
                <div key={i} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-800 shrink-0 uppercase flex items-center justify-center font-bold text-xs">
                    {comment.user.charAt(0)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-bold">{comment.user}</span>
                       <span className="text-[10px] text-gray-500">{comment.time}</span>
                    </div>
                    <p className="text-sm text-gray-200 leading-normal">{comment.text}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-gray-400" />
                        <span className="text-[10px] text-gray-400">{comment.likes}</span>
                      </div>
                      <ThumbsDown className="w-3 h-3 text-gray-400" />
                      <span className="text-[10px] font-bold text-gray-400">Reply</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Subscription Modal */}
        <AnimatePresence>
          {showSubscriptionModal && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-6"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-bg-dark rounded-[32px] border border-white/10 p-8 w-full max-w-sm flex flex-col items-center gap-6 shadow-2xl"
              >
                <div className="w-20 h-20 rounded-3xl bg-brand-primary flex items-center justify-center shadow-2xl shadow-brand-primary/20">
                  <span className="text-white font-black text-4xl italic">V</span>
                </div>
                
                <div className="text-center space-y-2">
                  <h2 className="text-3xl font-black tracking-tighter text-white">TAMILAN PLAN</h2>
                  <p className="text-gray-400 font-medium">Unlock Unlimited Downloads</p>
                </div>

                <div className="flex flex-col items-center gap-1">
                   <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-black text-brand-primary">₹99</span>
                    <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">/ Month</span>
                   </div>
                   <span className="text-[10px] text-brand-primary font-black animate-pulse">SPECIAL OFFER</span>
                </div>

                <ul className="w-full space-y-3 text-sm text-gray-300 font-medium">
                  <li className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    Ultra HD Downloads
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    Zero Buffer Streaming
                  </li>
                  <li className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                    Early Access to Premiers
                  </li>
                </ul>

                <div className="flex flex-col w-full gap-3 mt-4">
                  <button 
                    onClick={() => {
                      onPlanActive();
                      setShowSubscriptionModal(false);
                    }}
                    className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-xl uppercase tracking-widest"
                  >
                    Activate Now
                  </button>
                  <button 
                    onClick={() => setShowSubscriptionModal(false)}
                    className="w-full py-3 text-gray-500 font-bold text-sm hover:text-white transition-colors"
                  >
                    Maybe Later
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
