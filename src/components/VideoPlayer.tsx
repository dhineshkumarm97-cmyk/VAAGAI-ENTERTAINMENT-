import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, ChevronLeft, ThumbsUp, ThumbsDown, Share2, Download, 
  Scissors, MoreHorizontal, MoreVertical, Bell, Info, Lock,
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
  Maximize, Minimize, Settings, MessageSquare, SkipBack, SkipForward,
  Cast, Home
} from 'lucide-react';
import { Video } from '../types';
import { db, auth, signInWithGoogle } from '../lib/firebase';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  Timestamp,
  doc,
  updateDoc,
  deleteDoc
} from 'firebase/firestore';

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Comment {
  id: string;
  videoId: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: any;
  likes: number;
}

interface VideoPlayerProps {
  video: Video | null;
  onClose: () => void;
  isTamilanPlanActive: boolean;
  onPlanActive: () => void;
  onNextVideo: () => void;
}

const MOCK_ADS = [
  'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778810317/Blue_and_Pink_Modern_Business_Service_Promotion_Ads_Video_20260515_072619_0000_g2yko5.mp4',
  'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778810317/Blue_and_Pink_Modern_Business_Service_Promotion_Ads_Video_20260515_072619_0000_g2yko5.mp4',
  'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778810317/Blue_and_Pink_Modern_Business_Service_Promotion_Ads_Video_20260515_072619_0000_g2yko5.mp4'
];

/**
 * Shuffles an array of strings
 */
const shuffleArray = (array: string[]) => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export default function VideoPlayer({ video, onClose, isTamilanPlanActive, onPlanActive, onNextVideo }: VideoPlayerProps) {
  const [isAdPlaying, setIsAdPlaying] = useState(true);
  const [adQueue, setAdQueue] = useState<string[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isSeekingAds, setIsSeekingAds] = useState(false);
  const [adRemainingTime, setAdRemainingTime] = useState(0);
  const [isAdMuted, setIsAdMuted] = useState(true);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [adCurrentTime, setAdCurrentTime] = useState(0);
  const [adDuration, setAdDuration] = useState(0);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isPostingComment, setIsPostingComment] = useState(false);
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
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverX, setHoverX] = useState(0);
  
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCasting, setIsCasting] = useState(false);
  const [showCastModal, setShowCastModal] = useState(false);
  const [castingDevice, setCastingDevice] = useState<string | null>(null);
  
  const [selectedQuality, setSelectedQuality] = useState('1080p');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'main' | 'quality' | 'captions' | 'speed'>('main');
  
  const [selectedLanguage, setSelectedLanguage] = useState<'tamil' | 'english' | 'none'>('none');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isScreenCaptureBlocked, setIsScreenCaptureBlocked] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<{name: string, id: string, subtitle: string}[]>([]);
  const [isHotspotReady, setIsHotspotReady] = useState(false);
  const [discoveryStep, setDiscoveryStep] = useState<'prep' | 'scanning' | 'results'>('prep');
  
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef(0);
  const ignoreNextSeekRef = useRef(false);

  const [adPlayFailed, setAdPlayFailed] = useState(false);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  const toggleControls = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't toggle if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) return;
    
    // On mobile, touch usually means "show controls"
    if (e.type === 'touchstart') {
      setShowControls(true);
      return;
    }

    // On desktop or specific clicks, toggle
    setShowControls(prev => !prev);
  };

  useEffect(() => {
    if (video) {
        setIsAdPlaying(!isTamilanPlanActive);
        // Shuffle the ads and pick one for pre-roll
        const shuffled = shuffleArray(MOCK_ADS);
        setAdQueue([shuffled[0]]);
        setCurrentAdIndex(0);
        setIsSeekingAds(false);
        setPlayedMidRolls([]);
        lastTimeRef.current = 0;
        setAdPlayFailed(false);
        setIsCasting(false);
        setCastingDevice(null);
        setSelectedQuality('1080p');
        setPlaybackSpeed(1); // Reset speed on video change
        setSelectedLanguage('none'); // Reset captions on video change
        setShowSettingsMenu(false);
        window.scrollTo(0, 0);

        // Fetch comments for this video
        const q = query(
          collection(db, 'comments'),
          where('videoId', '==', video.id),
          orderBy('createdAt', 'desc')
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
          const commentsData = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          })) as Comment[];
          setComments(commentsData);
        }, (error) => {
          handleFirestoreError(error, OperationType.LIST, 'comments');
        });

        return () => unsubscribe();
    }
  }, [video, isTamilanPlanActive]);

  useEffect(() => {
    const blockCapture = () => {
      setIsScreenCaptureBlocked(true);
    };

    const unblockCapture = () => {
      // Use a shorter delay for better responsiveness
      setTimeout(() => {
        if (document.visibilityState === 'visible') {
          setIsScreenCaptureBlocked(false);
        }
      }, 800);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Precise list of screenshot-related keys
      const blockedKeys = ['PrintScreen', 'Snapshot'];
      if (blockedKeys.includes(e.key) || 
         (e.metaKey && e.shiftKey && (e.key === '4' || e.key === '3' || e.key === '5'))) {
        blockCapture();
        setTimeout(unblockCapture, 3000);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        blockCapture();
      } else {
        unblockCapture();
      }
    };

    window.addEventListener('blur', () => {
      // Only block on blur if it's likely a window switch (not just a click on browser UI)
      // We'll rely more on visibilitychange and keydown
    });

    window.addEventListener('focus', unblockCapture);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('focus', unblockCapture);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    if (isAdPlaying && adVideoRef.current && adQueue[currentAdIndex]) {
      adVideoRef.current.play().catch(err => {
        console.warn("Ad autoplay blocked:", err);
        setAdPlayFailed(true);
      });
    }
  }, [isAdPlaying, currentAdIndex, adQueue]);

  const parseDuration = (durationStr: string) => {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
  };

  useEffect(() => {
    if (video && !isDirectVideo(video.videoUrl)) {
      setDuration(parseDuration(video.duration));
    }
  }, [video]);

  if (!video) return null;

  const handleDownload = async () => {
    if (!video) return;
    
    if (!isTamilanPlanActive) {
      setShowSubscriptionModal(true);
    } else {
      if (isDownloading) return;
      
      setIsDownloading(true);
      try {
        // Try to fetch the video as a blob to force download
        const response = await fetch(video.videoUrl);
        if (!response.ok) throw new Error('Network response was not ok');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        // Clean up the title for filename
        const fileName = video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video';
        a.download = `${fileName}.mp4`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback: Try opening in a new tab if blob fetch fails (e.g. CORS)
        const a = document.createElement('a');
        a.href = video.videoUrl;
        a.target = '_blank';
        a.download = video.title;
        a.click();
      } finally {
        setIsDownloading(false);
      }
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

  const handleCast = () => {
    setShowCastModal(true);
    setDiscoveryStep('prep');
    setIsHotspotReady(false);
    setDiscoveredDevices([]);
  };

  const startDiscovery = () => {
    setDiscoveryStep('scanning');
    setIsScanning(true);
    setDiscoveredDevices([]);
    
    // Simulate a more realistic network scan
    setTimeout(() => {
      if (isHotspotReady) {
        setDiscoveredDevices([
          { name: 'Happy Cast TV', id: 'happy-cast', subtitle: 'Connected via Hotspot' },
          { name: 'Living Room TV', id: 'lr-tv', subtitle: 'Available on network' }
        ]);
      } else {
        // If hotspot wasn't configured as "ready" in UI, don't find it
        setDiscoveredDevices([
          { name: 'Living Room TV', id: 'lr-tv', subtitle: 'Available on network' }
        ]);
      }
      setIsScanning(false);
      setDiscoveryStep('results');
    }, 2500);
  };

  const selectCastDevice = (device: string) => {
    setIsCasting(true);
    setCastingDevice(device);
    setShowCastModal(false);
    
    // Auto-pause video locally when casting (simulating handoff)
    if (isPlaying) {
      togglePlay();
    }
  };

  const stopCasting = () => {
    setIsCasting(false);
    setCastingDevice(null);
  };

  const videoQualities = [
    { label: '4K', value: '4k', isPremium: true },
    { label: '2K', value: '2k', isPremium: true },
    { label: '1080p', value: '1080p', isPremium: true },
    { label: '720p', value: '720p', isPremium: false },
    { label: '480p', value: '480p', isPremium: false },
    { label: '360p', value: '360p', isPremium: false },
    { label: '144p', value: '144p', isPremium: false, hasDefects: true },
  ];

  const handleQualityChange = (quality: typeof videoQualities[0]) => {
    if (quality.isPremium && !isTamilanPlanActive) {
      setShowSubscriptionModal(true);
      setShowSettingsMenu(false);
    } else {
      setSelectedQuality(quality.value);
      setActiveSettingsTab('main');
      setShowSettingsMenu(false);
    }
  };

  const playbackSpeeds = [
    { label: '0.25x', value: 0.25 },
    { label: '0.5x', value: 0.5 },
    { label: '0.75x', value: 0.75 },
    { label: 'Normal', value: 1 },
    { label: '1.25x', value: 1.25 },
    { label: '1.5x', value: 1.5 },
    { label: '2x', value: 2 },
  ];

  const captionLanguages = [
    { label: 'Off', value: 'none' },
    { label: 'Tamil', value: 'tamil' },
    { label: 'English', value: 'english' },
  ];

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setActiveSettingsTab('main');
    setShowSettingsMenu(false);
  };

  const handleLanguageChange = (lang: 'none' | 'tamil' | 'english') => {
    setSelectedLanguage(lang);
    setActiveSettingsTab('main');
    setShowSettingsMenu(false);
  };

  const getQualityStyle = (): React.CSSProperties => {
    switch (selectedQuality) {
      case '4k': return { filter: 'contrast(1.02) saturate(1.05) brightness(1.02)' };
      case '2k': return { filter: 'contrast(1.01) saturate(1.02)' };
      case '1080p': return { filter: 'none' };
      case '720p': return { filter: 'none' };
      case '480p': return { filter: 'none' };
      case '360p': return { filter: 'blur(0.4px)' };
      case '144p': return { filter: 'blur(0.8px) contrast(0.95)' };
      default: return {};
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !video || isPostingComment) return;

    if (!auth.currentUser) {
      try {
        await signInWithGoogle();
      } catch (err) {
        return;
      }
    }

    if (!auth.currentUser) return;

    setIsPostingComment(true);
    const path = 'comments';
    try {
      await addDoc(collection(db, path), {
        videoId: video.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Anonymous User',
        text: newComment.trim(),
        createdAt: serverTimestamp(),
        likes: 0
      });
      setNewComment('');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    } finally {
      setIsPostingComment(false);
    }
  };

  const formatDistanceToNow = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const startAds = (resumeTime: number, isSeeking: boolean = false) => {
    if (isTamilanPlanActive || isAdPlaying) return;
    
    if (videoRef.current) {
      videoRef.current.pause();
      // Set the time we want to resume at after the ad
      videoRef.current.currentTime = resumeTime;
    }
    setCurrentTime(resumeTime);
    lastTimeRef.current = resumeTime;
    ignoreNextSeekRef.current = true;
    
    // Shuffle all 3 ads if seeking, otherwise pick one random ad
    const shuffled = shuffleArray(MOCK_ADS);
    setAdQueue(isSeeking ? shuffled : [shuffled[0]]);
    setCurrentAdIndex(0);
    setIsAdPlaying(true);
    setIsSeekingAds(isSeeking);
  };

  const handleAdEnded = () => {
    if (currentAdIndex < adQueue.length - 1) {
      setCurrentAdIndex(prev => prev + 1);
      setAdPlayFailed(false);
    } else {
      setIsAdPlaying(false);
      setIsSeekingAds(false);
      setAdPlayFailed(false);
      setTimeout(() => {
        if (!isDirectVideo(video.videoUrl)) {
          setIsPlaying(true);
        } else if (videoRef.current) {
          // Restore playback speed after ad
          videoRef.current.playbackRate = playbackSpeed;
          videoRef.current.play().catch(err => {
            console.warn("Autoplay after ad blocked:", err);
            setIsPlaying(false);
          });
        }
        
        // Reset the ignore flag after a short delay once playback has resumed
        setTimeout(() => {
          ignoreNextSeekRef.current = false;
        }, 1000);
      }, 100);
    }
  };

  const handleAdTimeUpdate = () => {
    if (adVideoRef.current) {
      const d = adVideoRef.current.duration;
      const ct = adVideoRef.current.currentTime;
      if (!isNaN(d) && !isNaN(ct)) {
        const remaining = Math.ceil(d - ct);
        setAdRemainingTime(remaining >= 0 ? remaining : 0);
        setAdCurrentTime(ct);
        setAdDuration(d);
      }
    }
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoElement = e.currentTarget;
    const vTime = videoElement.currentTime;
    
    setCurrentTime(vTime);
    setDuration(videoElement.duration);
    
    if (isAdPlaying || isTamilanPlanActive) return;
    
    // Skip detection: Trigger ads if we've jumped forward significantly
    // This catches jumps from external sources or if skip/progress somehow bypassed the explicit trigger
    if (vTime - lastTimeRef.current > 1.2 && !ignoreNextSeekRef.current) {
      startAds(vTime, true);
    } else if (!ignoreNextSeekRef.current) {
      // Normal playback or backward seek
      lastTimeRef.current = vTime;
    } else if (Math.abs(vTime - lastTimeRef.current) < 0.5) {
      // We've successfully resumed at the target time, stop ignoring now
      ignoreNextSeekRef.current = false;
    }

    // Mid-roll logic: Try to play an ad every 60 seconds of continuous playback
    const midRollInterval = 60;
    const currentInterval = Math.floor(vTime / midRollInterval);
    
    if (currentInterval > 0 && !playedMidRolls.includes(currentInterval) && !ignoreNextSeekRef.current) {
      setPlayedMidRolls(prev => [...prev, currentInterval]);
      startAds(vTime, false);
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

  const handleProgressBarMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressRef.current || !duration || isAdPlaying) return;
    
    const rect = progressRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
    const percentage = x / rect.width;
    const time = percentage * duration;
    
    setHoverTime(time);
    setHoverX(x);
  };

  const handleProgressBarMouseLeave = () => {
    setHoverTime(null);
  };

  const skip = (seconds: number) => {
    if (isAdPlaying) return;
    
    const isDirect = isDirectVideo(video.videoUrl);
    const targetTime = Math.max(0, Math.min((isDirect ? videoRef.current?.currentTime || 0 : currentTime) + seconds, duration || 9999));
    
    if (seconds > 0 && !isTamilanPlanActive) {
      // Forward skip -> Trigger Ad
      startAds(targetTime, true);
    } else {
      // Backward skip or Plan Active -> Just seek
      if (isDirect && videoRef.current) {
        videoRef.current.currentTime = targetTime;
      }
      setCurrentTime(targetTime);
      lastTimeRef.current = targetTime;
    }
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current || isAdPlaying) return;
    const targetTime = parseFloat(e.target.value);
    
    if (targetTime > videoRef.current.currentTime + 1.0 && !isTamilanPlanActive) {
      // Forward seek through slider -> Trigger Ad
      startAds(targetTime, true);
    } else {
      // Backward seek or Plan Active -> Just seek
      videoRef.current.currentTime = targetTime;
      setCurrentTime(targetTime);
      lastTimeRef.current = targetTime;
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

  const getEmbedUrl = (url: string) => {
    let embedUrl = url;
    if (url.includes('youtube.com/watch?v=')) {
      const id = url.split('v=')[1]?.split('&')[0];
      embedUrl = `https://www.youtube.com/embed/${id}`;
    } else if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split('?')[0];
      embedUrl = `https://www.youtube.com/embed/${id}`;
    } else if (url.includes('drive.google.com')) {
      let id = '';
      if (url.includes('/file/d/')) {
        id = url.split('/file/d/')[1]?.split('/')[0];
      } else if (url.includes('id=')) {
        id = url.split('id=')[1]?.split('&')[0];
      }
      
      if (id) {
        embedUrl = `https://drive.google.com/file/d/${id}/preview?autoplay=1`;
      }
    }
    
    // Add autoplay if not present and not Drive
    if (!embedUrl.includes('drive.google.com') && !embedUrl.includes('autoplay=')) {
      embedUrl += (embedUrl.includes('?') ? '&' : '?') + 'autoplay=1';
    }
    return embedUrl;
  };

  const isDirectVideo = (url: string) => {
    if (!url) return false;
    // Google Drive links should not be treated as direct videos to prevent download issues
    if (url.includes('drive.google.com')) return false;
    
    const extensionPattern = /\.(mp4|webm|ogg|mp3|m4a|m4v|f4v|f4p|f4a|f4b)(\?.*)?$/i;
    const isDirectByExt = url.match(extensionPattern) !== null;
    
    // Check for Cloudinary or other common direct video formats that might not have extension at the very end
    const isCloudinaryVideo = url.includes('cloudinary.com') && (url.includes('/video/') || url.includes('/upload/v'));
    
    return isDirectByExt || isCloudinaryVideo;
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
        <div 
          ref={containerRef} 
          className="sticky top-0 z-50 bg-black w-full aspect-video group select-none overflow-hidden shrink-0 min-h-[211px]" 
          onContextMenu={(e) => e.preventDefault()}
          onClick={toggleControls}
          onTouchStart={toggleControls}
        >
          {/* Top buttons removed as per user request for clean playback */}
          
          <div className="w-full h-full relative overflow-hidden">
              {/* Main Content (Always Mounted for Iframe Stability) */}
              <div className="w-full h-full min-h-[220px]" style={getQualityStyle()}>
                {/* Background Thumbnail for continuity */}
                <div 
                  className="absolute inset-0 z-0 opacity-40 blur-xl scale-110"
                  style={{ 
                    backgroundImage: `url(${video.thumbnail})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />

                {/* Captions Overlay (Universal) */}
                <AnimatePresence>
                  {isPlaying && !isAdPlaying && selectedLanguage !== 'none' && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="absolute bottom-24 left-1/2 -translate-x-1/2 z-40 w-full max-w-xl px-4 pointer-events-none"
                    >
                      <div className="bg-black/60 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 shadow-2xl">
                        <p className="text-white text-base md:text-xl font-bold text-center leading-relaxed drop-shadow-lg">
                          {selectedLanguage === 'tamil' 
                            ? "வணக்கம், இந்த வீடியோவைப் பார்த்ததற்கு நன்றி!" 
                            : "Hello, thank you for watching this video!"}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Main Video Play Overlay */}
                {!isPlaying && !isAdPlaying && (
                  <div className="absolute inset-0 z-40 bg-black/40 flex flex-col items-center justify-center backdrop-blur-sm">
                    <motion.button
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        setIsPlaying(true);
                        if (videoRef.current) {
                          videoRef.current.play();
                        }
                      }}
                      className="w-24 h-24 bg-brand-primary rounded-full flex items-center justify-center text-white shadow-[0_0_50px_rgba(30,215,96,0.5)] z-50 hover:bg-brand-primary/90 transition-all border-4 border-white/20"
                    >
                      <Play className="w-12 h-12 ml-1 fill-white" />
                    </motion.button>
                    <p className="text-white mt-6 font-black tracking-widest text-sm uppercase bg-black/40 px-6 py-2 rounded-full backdrop-blur-md border border-white/10">
                      Tap To Start Video
                    </p>
                  </div>
                )}

                {!isDirectVideo(video.videoUrl) ? (
                  isPlaying && (
                    <iframe
                      src={getEmbedUrl(video.videoUrl)}
                      className={`w-full h-full border-none relative z-30 transition-opacity duration-500 ${isAdPlaying ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
                      allowFullScreen
                      allow="autoplay; encrypted-media; picture-in-picture"
                    />
                  )
                ) : (
                  <video
                    ref={videoRef}
                    autoPlay={false}
                    controls={false}
                    playsInline
                    className={`w-full h-full object-contain relative z-10 transition-opacity duration-500 ${isAdPlaying ? 'opacity-0' : 'opacity-100'}`}
                    src={video.videoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                    poster={video.thumbnail}
                    onClick={togglePlay}
                  />
                )}
              </div>

              {/* Ad Overlay (Mounted on top) */}
              <AnimatePresence>
                {isAdPlaying && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black z-[45] flex items-center justify-center group/ad"
                  >
                    <video
                      ref={adVideoRef}
                      key={`ad-${currentAdIndex}`}
                      autoPlay
                      playsInline
                      muted={isAdMuted}
                      className="w-full h-full object-contain relative z-20 shadow-2xl"
                      src={adQueue[currentAdIndex]}
                      onEnded={handleAdEnded}
                      onTimeUpdate={handleAdTimeUpdate}
                      onError={(e) => {
                        console.error("Ad failed to load, skipping:", adQueue[currentAdIndex]);
                        handleAdEnded();
                      }}
                      onClick={(e) => {
                        const video = e.currentTarget;
                        if (video.paused) video.play();
                        setIsAdMuted(!isAdMuted);
                      }}
                    />
                    
                    {/* Ad Play/Unmute Overlay */}
                    <div className={`absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none transition-opacity ${adPlayFailed ? 'opacity-100' : 'opacity-0 group-hover/ad:opacity-100'}`}>
                      <div className="bg-black/60 p-6 rounded-full backdrop-blur-md border border-white/20 pointer-events-auto cursor-pointer" onClick={() => {
                        if (adVideoRef.current) {
                          adVideoRef.current.play();
                          setAdPlayFailed(false);
                        }
                        setIsAdMuted(false);
                      }}>
                        {isAdMuted ? <VolumeX className="w-12 h-12 text-white" /> : <Play className="w-12 h-12 text-white fill-white" />}
                      </div>
                      <p className="text-white mt-4 font-bold text-sm bg-black/40 px-4 py-1 rounded-full">
                        {adPlayFailed ? 'Autoplay Blocked - Tap to Play Ad' : (isAdMuted ? 'Tap to Unmute Ad' : 'Ad Playing')}
                      </p>
                    </div>
                    
                    {/* Dynamic Ad Timer Overlay */}
                    <motion.div 
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="absolute top-4 right-4 z-[48]"
                    >
                      <div className="bg-blue-900/40 backdrop-blur-2xl px-6 py-2 rounded-full border border-blue-400/20 shadow-[0_8px_32px_rgba(0,0,0,0.4)] flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
                        <span className="text-white font-black text-sm md:text-base tracking-tight whitespace-nowrap">
                          Ad {currentAdIndex + 1}/{adQueue.length} • Ends in {adRemainingTime}s
                        </span>
                      </div>
                    </motion.div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Custom Controls Overlay - Only show for direct video files */}
              {!isAdPlaying && isDirectVideo(video.videoUrl) && (
              <div className={`absolute inset-0 z-40 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-between transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                {/* Center Play Button */}
                <div className="flex-1 flex items-center justify-center">
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={togglePlay}
                    className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center text-white border border-white/20 shadow-2xl transition-all hover:bg-white/30"
                  >
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={isPlaying ? 'pause' : 'play'}
                        initial={{ opacity: 0, scale: 0.5, rotate: -45 }}
                        animate={{ opacity: 1, scale: 1, rotate: 0 }}
                        exit={{ opacity: 0, scale: 0.5, rotate: 45 }}
                        transition={{ duration: 0.2 }}
                      >
                        {isPlaying ? <Pause className="w-10 h-10" /> : <Play className="w-10 h-10 ml-1 fill-white" />}
                      </motion.div>
                    </AnimatePresence>
                  </motion.button>
                </div>

                {/* Bottom Controls */}
                <div className="p-3 md:p-6 flex flex-col gap-1 md:gap-2 bg-gradient-to-t from-black/90 to-transparent">
                  {/* Progress Bar Container */}
                  <div className="flex flex-col gap-1 mb-2">
                    <div 
                      ref={progressRef}
                      className="relative group/progress h-6 flex items-center"
                      onMouseMove={handleProgressBarMouseMove}
                      onMouseLeave={handleProgressBarMouseLeave}
                    >
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        step={0.1}
                        value={currentTime}
                        onChange={handleProgressChange}
                        className="absolute inset-x-0 w-full opacity-0 z-20 cursor-pointer h-full"
                      />
                      <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full overflow-hidden transition-all group-hover/progress:h-1.5 focus-within:h-1.5">
                        {/* Hover Preview Bar */}
                        {hoverTime !== null && (
                          <div 
                            className="absolute inset-y-0 bg-white/20 z-0"
                            style={{ width: `${(hoverTime / duration) * 100}%` }}
                          />
                        )}
                        <div 
                          className="h-full bg-brand-primary relative z-10" 
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        ></div>
                      </div>
                      {/* Thumb handle */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg border-2 border-brand-primary z-30 transition-transform scale-0 group-hover/progress:scale-100 group-focus-within/progress:scale-100 pointer-events-none"
                        style={{ left: `${(currentTime / duration) * 100}%` }}
                      />
                      
                      {/* Timestamp Tooltip */}
                      <AnimatePresence>
                        {hoverTime !== null && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-2 bg-black/80 backdrop-blur-md text-white text-xs font-mono px-2 py-1 rounded-md border border-white/10 z-40 whitespace-nowrap pointer-events-none shadow-xl"
                            style={{ left: hoverX, transform: 'translateX(-50%)' }}
                          >
                            {formatTime(hoverTime)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Time Display */}
                    <div className="flex justify-between w-full text-[10px] md:text-sm font-mono text-white font-medium px-0.5">
                      <span>{formatTime(currentTime)}</span>
                      <span>{formatTime(duration)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 md:gap-6">
                      {/* Volume */}
                      <div className="hidden md:flex items-center gap-2 group/volume relative">
                        <button onClick={toggleMute} className="text-white hover:text-brand-primary transition-colors p-2">
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
                      <div className="flex items-center gap-2 md:gap-6">
                        <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white hover:text-brand-primary transition-colors p-2 active:scale-90">
                          <SkipBack className="w-6 h-6" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="text-white hover:text-brand-primary transition-colors p-2 active:scale-90">
                          {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 fill-white" />}
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white hover:text-brand-primary transition-colors p-2 active:scale-90">
                          <SkipForward className="w-6 h-6" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); onNextVideo(); }} title="Next Video" className="text-white hover:text-brand-primary transition-colors p-2 ml-1 active:scale-90">
                          <SkipForward className="w-6 h-6 fill-white" />
                        </button>
                      </div>
                    </div>

                      <div className="flex items-center gap-2 md:gap-6">
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setShowSettingsMenu(!showSettingsMenu);
                              setActiveSettingsTab('main');
                            }}
                            onTouchStart={(e) => e.stopPropagation()}
                            className={`text-white hover:text-brand-primary transition-colors p-2 flex items-center gap-1 group active:scale-90 ${showSettingsMenu ? 'text-brand-primary' : ''}`}
                          >
                            <Settings className={`w-5 h-5 transition-transform duration-500 ${showSettingsMenu ? 'rotate-90 text-brand-primary' : ''}`} />
                            <span className="hidden sm:inline text-[10px] font-black group-hover:text-brand-primary">{selectedQuality.toUpperCase()}</span>
                          </button>

                          {/* In-place Settings Menu (Moved from top to be near the button) */}
                          <AnimatePresence>
                            {showSettingsMenu && (
                              <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 20 }}
                                onClick={(e) => e.stopPropagation()}
                                onTouchStart={(e) => e.stopPropagation()}
                                className="absolute bottom-full right-0 mb-4 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 min-w-[220px] shadow-2xl z-50 overflow-hidden"
                              >
                                {activeSettingsTab === 'main' && (
                                  <div className="flex flex-col gap-1.5 p-1.5">
                                    <div className="px-3 py-2 border-b border-white/5 mb-1 flex justify-between items-center">
                                      <span className="text-[10px] font-black tracking-widest text-gray-400">PLAYBACK SETTINGS</span>
                                      <button 
                                        onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(false); }} 
                                        onTouchStart={(e) => e.stopPropagation()}
                                        className="text-gray-500 hover:text-white p-1"
                                      >
                                        <X className="w-3 h-3" />
                                      </button>
                                    </div>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('quality'); }} 
                                      onTouchStart={(e) => e.stopPropagation()}
                                      className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all text-gray-300 hover:bg-white/5 hover:text-white active:bg-white/10"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><Settings className="w-4 h-4" /></div>
                                        <span className="text-sm font-bold">Quality</span>
                                      </div>
                                      <span className="text-xs text-brand-primary font-black uppercase text-right">{selectedQuality}</span>
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('captions'); }} 
                                      onTouchStart={(e) => e.stopPropagation()}
                                      className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all text-gray-300 hover:bg-white/5 hover:text-white active:bg-white/10"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><MessageSquare className="w-4 h-4" /></div>
                                        <span className="text-sm font-bold">Captions</span>
                                      </div>
                                      <span className="text-xs text-brand-primary font-black uppercase text-right">{selectedLanguage === 'none' ? 'Off' : selectedLanguage}</span>
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('speed'); }} 
                                      onTouchStart={(e) => e.stopPropagation()}
                                      className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all text-gray-300 hover:bg-white/5 hover:text-white active:bg-white/10"
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center"><RotateCw className="w-4 h-4" /></div>
                                        <span className="text-sm font-bold">Speed</span>
                                      </div>
                                      <span className="text-xs text-brand-primary font-black uppercase text-right">{playbackSpeed === 1 ? 'Normal' : `${playbackSpeed}x`}</span>
                                    </button>
                                  </div>
                                )}

                                {activeSettingsTab === 'quality' && (
                                  <div className="flex flex-col gap-1">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('main'); }} 
                                      onTouchStart={(e) => e.stopPropagation()}
                                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors border-b border-white/5 mb-1 text-left"
                                    >
                                      <ChevronLeft className="w-4 h-4" /> Back to menu
                                    </button>
                                    <div className="max-h-[200px] overflow-y-auto py-1 pr-1 custom-scrollbar">
                                      {videoQualities.map((q) => (
                                        <button
                                          key={q.value}
                                          onClick={(e) => { e.stopPropagation(); handleQualityChange(q); }}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all ${selectedQuality === q.value ? 'bg-brand-primary/20 text-brand-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white active:bg-white/10'}`}
                                        >
                                          <span className="text-sm font-bold">{q.label}</span>
                                          {q.isPremium && (
                                            <div className="text-[10px] px-2 py-0.5 rounded-md font-black italic bg-brand-primary text-white ml-2">PRO</div>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {activeSettingsTab === 'captions' && (
                                  <div className="flex flex-col gap-1">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('main'); }} 
                                      onTouchStart={(e) => e.stopPropagation()}
                                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors border-b border-white/5 mb-1 text-left"
                                    >
                                      <ChevronLeft className="w-4 h-4" /> Back to menu
                                    </button>
                                    <div className="py-1">
                                      {captionLanguages.map((lang) => (
                                        <button
                                          key={lang.value}
                                          onClick={(e) => { e.stopPropagation(); handleLanguageChange(lang.value as any); }}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all ${selectedLanguage === lang.value ? 'bg-brand-primary/20 text-brand-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white active:bg-white/10'}`}
                                        >
                                          <span className="text-sm font-bold">{lang.label}</span>
                                          {selectedLanguage === lang.value && <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(255,107,0,1)]" />}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}

                                {activeSettingsTab === 'speed' && (
                                  <div className="flex flex-col gap-1">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('main'); }} 
                                      onTouchStart={(e) => e.stopPropagation()}
                                      className="flex items-center gap-2 px-3 py-2 text-xs font-bold text-gray-400 hover:text-white transition-colors border-b border-white/5 mb-1 text-left"
                                    >
                                      <ChevronLeft className="w-4 h-4" /> Back to menu
                                    </button>
                                    <div className="max-h-[200px] overflow-y-auto py-1 pr-1 custom-scrollbar">
                                      {playbackSpeeds.map((s) => (
                                        <button
                                          key={s.value}
                                          onClick={(e) => { e.stopPropagation(); handleSpeedChange(s.value); }}
                                          onTouchStart={(e) => e.stopPropagation()}
                                          className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all ${playbackSpeed === s.value ? 'bg-brand-primary/20 text-brand-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white active:bg-white/10'}`}
                                        >
                                          <span className="text-sm font-bold">{s.label}</span>
                                          {playbackSpeed === s.value && <div className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_8px_rgba(255,107,0,1)]" />}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedLanguage(selectedLanguage === 'none' ? 'english' : 'none');
                          }}
                          onTouchStart={(e) => e.stopPropagation()}
                          className={`${selectedLanguage !== 'none' ? 'text-brand-primary' : 'text-white hover:text-brand-primary'} transition-colors p-2 active:scale-90`}
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>

                        <button 
                          onClick={(e) => { e.stopPropagation(); handleCast(); }}
                          onTouchStart={(e) => e.stopPropagation()}
                          className={`${isCasting ? 'text-brand-primary animate-pulse' : 'text-white hover:text-brand-primary'} transition-colors p-2 relative active:scale-90`}
                          title={isCasting ? `Casting to ${castingDevice}` : "Cast to TV"}
                        >
                          <Cast className="w-5 h-5" />
                          {isCasting && <div className="absolute top-1 right-1 w-1.5 h-1.5 bg-brand-primary rounded-full shadow-[0_0_8px_rgba(255,107,0,0.8)]" />}
                        </button>
                        
                        <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="text-white hover:text-brand-primary transition-colors p-2 active:scale-90">
                          {isFullscreen ? <Minimize className="w-6 h-6" /> : <Maximize className="w-6 h-6" />}
                        </button>
                      </div>
                  </div>
                </div>
              </div>
            )}

                {/* Casting UI Overlay */}
                <AnimatePresence>
                  {isCasting && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-50 bg-black flex flex-col items-center justify-center gap-6"
                    >
                      <div className="relative">
                        <Cast className="w-20 h-20 text-brand-primary animate-pulse" />
                        <div className="absolute inset-0 animate-ping bg-brand-primary/20 rounded-full scale-150" />
                      </div>
                      <div className="text-center">
                        <h3 className="text-2xl font-black tracking-tight text-white mb-2">Casting to {castingDevice}</h3>
                        <p className="text-gray-400 text-sm">Controlling via this device</p>
                      </div>
                      <button 
                        onClick={stopCasting}
                        className="mt-4 px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-bold text-sm transition-all shadow-xl"
                      >
                        Stop Casting
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Cast Device Picker */}
                <AnimatePresence>
                  {showCastModal && (
                    <div className="absolute inset-0 z-[60] flex items-center justify-center p-4">
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        className="bg-black/95 backdrop-blur-2xl border border-white/10 w-full max-w-sm rounded-3xl p-8 shadow-2xl relative overflow-hidden"
                      >
                         <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-primary to-transparent" />
                         
                         <button 
                           onClick={() => setShowCastModal(false)}
                           className="absolute top-4 right-4 text-gray-500 hover:text-white transition-colors"
                         >
                           <X className="w-6 h-6" />
                         </button>

                         <div className="flex flex-col items-center gap-4 mb-8">
                           <div className="p-4 bg-brand-primary/10 rounded-2xl">
                             <Cast className="w-10 h-10 text-brand-primary" />
                           </div>
                           <h3 className="text-xl font-black text-white">Cast to device</h3>
                         </div>
                         <div className="flex flex-col gap-3 min-h-[250px] justify-start">
                           {discoveryStep === 'prep' ? (
                             <div className="flex flex-col gap-6 py-4">
                               <div className="space-y-4">
                                 <div className="flex gap-4 items-start">
                                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">1</div>
                                   <p className="text-sm text-gray-300">Turn on your <b>Mobile Hotspot</b> in device settings.</p>
                                 </div>
                                 <div className="flex gap-4 items-start">
                                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">2</div>
                                   <p className="text-sm text-gray-300">Open the <b>Happy Cast</b> app on your TV.</p>
                                 </div>
                                 <div className="flex gap-4 items-start">
                                   <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center font-bold text-xs shrink-0">3</div>
                                   <p className="text-sm text-gray-300">Wait for TV to show "Connected to Hotspot".</p>
                                 </div>
                               </div>

                               <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-primary/10 border border-brand-primary/20">
                                 <input 
                                   type="checkbox" 
                                   id="hotspot-ready"
                                   checked={isHotspotReady}
                                   onChange={(e) => setIsHotspotReady(e.target.checked)}
                                   className="w-5 h-5 accent-brand-primary rounded"
                                 />
                                 <label htmlFor="hotspot-ready" className="text-xs font-bold text-white cursor-pointer select-none">
                                   My Hotspot is ON & TV is connected
                                 </label>
                               </div>

                               <button 
                                 onClick={startDiscovery}
                                 className="w-full py-4 bg-brand-primary text-white font-black rounded-2xl hover:bg-brand-primary/90 transition-all uppercase tracking-widest text-xs shadow-lg shadow-brand-primary/20"
                               >
                                 Scan for Devices
                               </button>
                             </div>
                           ) : discoveryStep === 'scanning' ? (
                             <div className="flex flex-col items-center justify-center py-10 gap-4">
                               <div className="relative">
                                 <div className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin" />
                                 <div className="absolute inset-0 flex items-center justify-center">
                                   <Cast className="w-6 h-6 text-brand-primary animate-pulse" />
                                 </div>
                               </div>
                               <div className="text-center">
                                 <p className="text-white font-bold text-sm">Searching for devices...</p>
                                 <p className="text-[10px] text-gray-500 mt-1">Listening for pings from Happy Cast...</p>
                               </div>
                             </div>
                           ) : discoveredDevices.length > 0 ? (
                             <div className="space-y-3">
                               <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mb-2 px-1">Nearby Devices</p>
                               {discoveredDevices.map((device) => (
                                 <motion.button
                                   key={device.id}
                                   initial={{ opacity: 0, x: -20 }}
                                   animate={{ opacity: 1, x: 0 }}
                                   onClick={() => selectCastDevice(device.name)}
                                   className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 transition-all group text-left w-full"
                                 >
                                   <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center group-hover:scale-110 transition-transform">
                                      <Cast className="w-5 h-5 text-gray-500 group-hover:text-brand-primary" />
                                   </div>
                                   <div>
                                     <p className="font-bold text-white text-sm">{device.name}</p>
                                     <p className="text-[10px] text-gray-400 font-mono">{device.subtitle}</p>
                                   </div>
                                 </motion.button>
                               ))}
                               <button 
                                 onClick={() => setDiscoveryStep('prep')}
                                 className="w-full py-3 mt-4 text-[10px] font-bold text-gray-500 hover:text-white transition-colors uppercase tracking-widest"
                               >
                                 Rescan Network
                               </button>
                             </div>
                           ) : (
                             <div className="text-center py-10">
                               <p className="text-gray-500 text-sm mb-4">No devices found</p>
                               <button 
                                 onClick={() => setDiscoveryStep('prep')}
                                 className="text-[10px] font-bold text-brand-primary uppercase tracking-widest hover:underline"
                               >
                                 Check Settings
                               </button>
                             </div>
                           )}
                         </div>
                         
                         <div className="mt-8 pt-6 border-t border-white/5 text-center">
                           <p className="text-[10px] text-gray-500 leading-relaxed max-w-[200px] mx-auto">
                             Make sure your TV is connected to your mobile hotspot and the <span className="text-brand-primary">Happy Cast</span> app is open on the TV.
                           </p>
                         </div>
                      </motion.div>
                      <div 
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm -z-10" 
                        onClick={() => setShowCastModal(false)} 
                      />
                    </div>
                  )}
                </AnimatePresence>

                {/* Simple Yellow Progress Line for Ads - Strictly at bottom edge */}
                {isAdPlaying && (
                  <div className="absolute bottom-0 left-0 w-full h-[3px] z-[80] pointer-events-none bg-black/10">
                    <div 
                      className="h-full bg-yellow-400 transition-all duration-300 ease-out shadow-[0_0_8px_rgba(250,204,21,0.6)]"
                      style={{ width: `${adDuration > 0 ? (adCurrentTime / adDuration) * 100 : 0}%` }}
                    />
                  </div>
                )}

                {/* Security Restriction Overlay for Screenshots */}
                <AnimatePresence>
                  {isScreenCaptureBlocked && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[100] bg-black flex flex-col items-center justify-center p-6 text-center select-none"
                    >
                      {/* Security Mesh Pattern to interfere with capture */}
                      <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '4px 4px' }} />
                      
                      <div className="relative z-10 flex flex-col items-center">
                        <div className="w-20 h-20 bg-red-600/20 rounded-full flex items-center justify-center mb-6 border border-red-600/50">
                          <Lock className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 tracking-tight uppercase">PROTECTED CONTENT</h2>
                        <p className="text-gray-400 text-sm max-w-[280px] font-medium leading-relaxed">
                          Screen capture and screenshots are restricted to protect copyrighted content.
                          <span className="block mt-2 text-red-500/80 font-bold">PLEASE CLOSE CAPTURE TOOLS</span>
                        </p>
                        
                        <div className="mt-8 flex items-center gap-2 text-[10px] font-bold text-gray-500 bg-white/5 py-1.5 px-4 rounded-full border border-white/10 tracking-widest uppercase">
                          <div className="w-1.5 h-1.5 bg-red-600 rounded-full animate-pulse" />
                          Security Active
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
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
                disabled={isDownloading}
                className={`flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm transition-all shrink-0 ${isTamilanPlanActive ? 'bg-brand-primary text-white' : 'bg-white/10 hover:bg-white/20'} ${isDownloading ? 'opacity-50 cursor-wait' : ''}`}
              >
                {isDownloading ? (
                   <>
                     <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                     <span>Downloading...</span>
                   </>
                ) : (
                  <>
                    <Download className="w-4 h-4" /> 
                    {isTamilanPlanActive ? 'Download Ready' : 'Download'}
                  </>
                )}
              </button>
              
              <button className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors shrink-0">
                <MoreHorizontal className="w-5 h-5" />
              </button>

              <button 
                onClick={onNextVideo}
                className="flex items-center gap-2 px-6 py-2 bg-brand-primary text-white rounded-full font-bold text-sm transition-all shadow-lg shadow-brand-primary/20 hover:scale-105 active:scale-95 ml-auto"
              >
                Next Video <SkipForward className="w-4 h-4 text-white" />
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
              <h3 className="text-xl font-black tracking-tight">Comments <span className="text-gray-500 font-bold ml-2">{comments.length}</span></h3>
              <MoreHorizontal className="w-5 h-5 text-gray-400" />
            </div>
            
            <form onSubmit={handlePostComment} className="flex items-center gap-4 mb-4">
              <div className="w-10 h-10 rounded-full bg-brand-primary flex items-center justify-center font-bold text-sm">
                {auth.currentUser?.displayName?.charAt(0) || 'D'}
              </div>
              <input 
                type="text" 
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..." 
                disabled={isPostingComment}
                className="flex-1 bg-transparent border-b border-white/10 py-2 text-sm focus:border-white focus:outline-none transition-colors disabled:opacity-50"
              />
              {newComment.trim() && (
                <button 
                  type="submit"
                  disabled={isPostingComment}
                  className="bg-brand-primary text-white font-bold text-xs px-4 py-2 rounded-full hover:bg-brand-primary/80 transition-colors disabled:opacity-50"
                >
                  Comment
                </button>
              )}
            </form>

            <div className="flex flex-col gap-8 pb-20">
              {comments.length > 0 ? comments.map((comment) => (
                <div key={comment.id} className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-gray-800 shrink-0 uppercase flex items-center justify-center font-bold text-xs">
                    {comment.userName.charAt(0)}
                  </div>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                       <span className="text-sm font-bold">{comment.userName}</span>
                       <span className="text-[10px] text-gray-500">{formatDistanceToNow(comment.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-200 leading-normal">{comment.text}</p>
                    <div className="flex items-center gap-4 mt-1">
                      <div className="flex items-center gap-1">
                        <ThumbsUp className="w-3 h-3 text-gray-400 cursor-pointer hover:text-brand-primary" />
                        <span className="text-[10px] text-gray-400">{comment.likes || 0}</span>
                      </div>
                      <ThumbsDown className="w-3 h-3 text-gray-400 cursor-pointer hover:text-red-500" />
                      <span className="text-[10px] font-bold text-gray-400 cursor-pointer hover:text-white">Reply</span>
                    </div>
                  </div>
                </div>
              )) : (
                <div className="text-center py-10 text-gray-500">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm font-medium">No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          <div className="mt-12 mb-20 flex justify-center">
            <button 
              onClick={onClose}
              className="flex items-center gap-2 px-8 py-3 bg-white/5 hover:bg-white/10 rounded-2xl text-gray-400 hover:text-white transition-all border border-white/5 font-bold uppercase tracking-widest text-xs"
            >
              <ChevronLeft className="w-4 h-4" /> Exit Player
            </button>
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
