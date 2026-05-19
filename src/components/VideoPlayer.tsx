import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}
import { 
  X, ChevronLeft, Check, ThumbsUp, ThumbsDown, Share2, Download, 
  Scissors, MoreHorizontal, MoreVertical, Bell, Info, Lock,
  Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX,
  Maximize, Minimize, Settings, MessageSquare, SkipBack, SkipForward,
  Cast, Home, Languages, Sparkles, AudioLines, Loader2
} from 'lucide-react';
import { Video } from '../types';
import { db, auth, signInWithGoogle, handleFirestoreError, OperationType } from '../lib/firebase';
import { getLocalFileUrl } from '../lib/db';
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
import { TAMILAN_QUIZ_QUESTIONS, QuizQuestion } from '../constants/tamilanQuiz';

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
  initialLanguage: string | null;
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

const getProcessedVideoUrl = (url: string) => {
  if (!url) return '';
  // Handle local persistent files
  if (url.startsWith('local-file://')) return url;
  
  // Dropbox: Convert sharing link to direct link
  if (url.includes('dropbox.com') && url.includes('?dl=0')) {
    return url.replace('?dl=0', '?raw=1');
  }
  if (url.includes('dropbox.com') && !url.includes('?raw=1') && !url.includes('?dl=1')) {
    return url + (url.includes('?') ? '&' : '?') + 'raw=1';
  }
  return url;
};

const isDirectVideo = (url: string) => {
  if (!url) return false;
  const processedUrl = getProcessedVideoUrl(url);
  
  // Handle local blob URLs and persistent local files
  if (processedUrl.startsWith('blob:') || processedUrl.startsWith('local-file://')) return true;
  
  // Platforms that require iframe embedding should not be treated as direct videos
  const iframePlatforms = [
    'drive.google.com', 
    'docs.google.com', 
    'youtube.com', 
    'youtu.be', 
    'vimeo.com', 
    'facebook.com', 
    'dailymotion.com',
    'ok.ru',
    'vk.com',
    'twitch.tv',
    'bilibili.com'
  ];
  if (iframePlatforms.some(platform => processedUrl.includes(platform))) return false;
  
  const extensionPattern = /\.(mp4|webm|ogg|mp3|m4a|m4v|f4v|f4p|f4a|f4b|m3u8|mpd)(\?.*)?$/i;
  const isDirectByExt = processedUrl.match(extensionPattern) !== null;
  
  // Dropbox with raw=1 is a direct video
  if (processedUrl.includes('dropbox.com') && processedUrl.includes('raw=1')) return true;
  
  // Check for Cloudinary or other common direct video formats that might not have extension at the very end
  const isCloudinaryVideo = processedUrl.includes('cloudinary.com') && (processedUrl.includes('/video/') || processedUrl.includes('/upload/v'));
  
  return isDirectByExt || isCloudinaryVideo;
};

const getYouTubeID = (url: string) => {
  if (!url) return null;
  // Robust YouTube ID extraction
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  const id = (match && match[2].length === 11) ? match[2] : null;
  
  if (!id) {
    // Fallback for some attribution links or other formats
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (urlObj.hostname.includes('youtube.com')) {
      return urlObj.searchParams.get('v');
    }
    if (urlObj.hostname === 'youtu.be') {
      return urlObj.pathname.slice(1);
    }
  }
  return id;
};

const getDriveID = (url: string) => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || 
                url.match(/[?&]id=([a-zA-Z0-9_-]{25,})/) ||
                url.match(/\/file\/d\/([a-zA-Z0-9_-]{25,})/);
  return match ? match[1] : null;
};

const isYouTube = (url: string) => !!getYouTubeID(url);

export default function VideoPlayer({ video, onClose, isTamilanPlanActive, onPlanActive, onNextVideo, initialLanguage }: VideoPlayerProps) {
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [adQueue, setAdQueue] = useState<string[]>([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [isSeekingAds, setIsSeekingAds] = useState(false);
  const [adRemainingTime, setAdRemainingTime] = useState(0);
  const [isAdMuted, setIsAdMuted] = useState(false);
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
  const [resolvedVideoUrl, setResolvedVideoUrl] = useState<string | null>(null);
  const [resolvedThumbnailUrl, setResolvedThumbnailUrl] = useState<string | null>(null);
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
  const [activeSettingsTab, setActiveSettingsTab] = useState<'main' | 'quality' | 'speed'>('main');
  
  const [audioTrack, setAudioTrack] = useState<string>('tamil');
  const [isDubbing, setIsDubbing] = useState(false);
  const [dubbingProgress, setDubbingProgress] = useState(0);
  const [showDubbingSuccess, setShowDubbingSuccess] = useState(false);
  const [isAiDubbingEnabled, setIsAiDubbingEnabled] = useState(true);
  const [showBetaModal, setShowBetaModal] = useState(false);
  const [showDubbingMenu, setShowDubbingMenu] = useState(false);
  const [audioTrackLabel, setAudioTrackLabel] = useState('TAM');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isScreenCaptureBlocked, setIsScreenCaptureBlocked] = useState(false);
  const [discoveredDevices, setDiscoveredDevices] = useState<{name: string, id: string, subtitle: string}[]>([]);
  const [isHotspotReady, setIsHotspotReady] = useState(false);
  const [discoveryStep, setDiscoveryStep] = useState<'prep' | 'scanning' | 'results'>('prep');
  
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizStep, setQuizStep] = useState<'intro' | 'active' | 'success' | 'failed'>('intro');

  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedResumeTime, setSavedResumeTime] = useState<number | null>(null);
  const [initialStartTime, setInitialStartTime] = useState(0);
  const [playerKey, setPlayerKey] = useState(0);

  const [hasTriggeredPreRoll, setHasTriggeredPreRoll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const adVideoRef = useRef<HTMLVideoElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const lastTimeRef = useRef(0);
  const ignoreNextSeekRef = useRef(false);
  const ytPlayerRef = useRef<any>(null);
  const ytIframeRef = useRef<HTMLIFrameElement>(null);

  const [adPlayFailed, setAdPlayFailed] = useState(false);
  const [showCopyNotification, setShowCopyNotification] = useState(false);

  useEffect(() => {
    if (!video || !video.id) return;
    
    // Check for saved playback position
    const saved = localStorage.getItem(`v-pos-${video.id}`);
    if (saved) {
      const time = parseFloat(saved);
      if (time > 10) { // Only resume if watched more than 10s
        setSavedResumeTime(time);
        setShowResumeModal(true);
      }
    }
  }, [video?.id]);

  useEffect(() => {
    // Save position every 5 seconds
    if (!isPlaying || isAdPlaying || !video?.id) return;
    
    const interval = setInterval(() => {
      if (currentTime > 10) {
        localStorage.setItem(`v-pos-${video.id}`, currentTime.toString());
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [isPlaying, isAdPlaying, currentTime, video?.id]);

  const handleResume = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowResumeModal(false);
    
    if (savedResumeTime !== null) {
      ignoreNextSeekRef.current = true;
      if (videoRef.current) {
        videoRef.current.currentTime = savedResumeTime;
        videoRef.current.play().catch(err => console.warn('Resume play blocked:', err));
        setIsPlaying(true);
      } else if (isYouTube(video?.videoUrl) && ytPlayerRef.current) {
        ytPlayerRef.current.seekTo(savedResumeTime, true);
        // Small delay to ensure seek completes before play
        setTimeout(() => {
          if (ytPlayerRef.current) {
            ytPlayerRef.current.playVideo();
            setIsPlaying(true);
          }
        }, 150);
      } else if (!isDirectVideo(video?.videoUrl)) {
        setInitialStartTime(savedResumeTime);
        setCurrentTime(savedResumeTime);
        lastTimeRef.current = savedResumeTime;
        setPlayerKey(prev => prev + 1);
        setIsPlaying(true);
      }
      setCurrentTime(savedResumeTime);
      lastTimeRef.current = savedResumeTime;
      setHasTriggeredPreRoll(true);
    }
  };

  const handleStartOver = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setShowResumeModal(false);
    
    if (video?.id) localStorage.removeItem(`v-pos-${video.id}`);
    
    ignoreNextSeekRef.current = true;
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(err => console.warn('Start over play blocked:', err));
      setIsPlaying(true);
    } else if (isYouTube(video?.videoUrl) && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(0, true);
      setTimeout(() => {
        if (ytPlayerRef.current) {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      }, 150);
    } else if (!isDirectVideo(video?.videoUrl)) {
      setInitialStartTime(0);
      setCurrentTime(0);
      lastTimeRef.current = 0;
      setPlayerKey(prev => prev + 1);
      setIsPlaying(true);
    }
    setCurrentTime(0);
    lastTimeRef.current = 0;
    setHasTriggeredPreRoll(true);
  };

  useEffect(() => {
    const resolveUrls = async () => {
      if (!video) return;

      // Resolve thumbnail
      if (video.thumbnail?.startsWith('local-file://')) {
        const url = await getLocalFileUrl(video.thumbnail);
        setResolvedThumbnailUrl(url);
      } else {
        setResolvedThumbnailUrl(video.thumbnail);
      }

      // Resolve video
      if (video.videoUrl?.startsWith('local-file://')) {
        const url = await getLocalFileUrl(video.videoUrl);
        setResolvedVideoUrl(url);
      } else {
        setResolvedVideoUrl(getProcessedVideoUrl(video.videoUrl));
      }
    };

    resolveUrls();
    
    return () => {
      // Clean up blob URLs when component unmounts or video changes
      if (resolvedVideoUrl?.startsWith('blob:')) URL.revokeObjectURL(resolvedVideoUrl);
      if (resolvedThumbnailUrl?.startsWith('blob:')) URL.revokeObjectURL(resolvedThumbnailUrl);
    };
  }, [video?.videoUrl, video?.thumbnail]);

  useEffect(() => {
    if (isYouTube(video?.videoUrl) && !window.YT) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }
  }, [video?.videoUrl]);

  useEffect(() => {
    const handleYouTubeIframe = () => {
      if (isYouTube(video?.videoUrl) && window.YT && window.YT.Player && ytIframeRef.current) {
        if (ytPlayerRef.current) {
          try {
            ytPlayerRef.current.destroy();
          } catch (e) {
            console.warn("Error destroying previous YT player", e);
          }
        }

        ytPlayerRef.current = new window.YT.Player(ytIframeRef.current, {
          events: {
            onReady: (event: any) => {
              if (isPlaying && !isAdPlaying) {
                event.target.playVideo();
              }
              setDuration(event.target.getDuration());
            },
            onStateChange: (event: any) => {
              // YT.PlayerState.PLAYING = 1, PAUSED = 2, ENDED = 0
              if (event.data === 1) {
                setIsPlaying(true);
              } else if (event.data === 2) {
                setIsPlaying(false);
              } else if (event.data === 0) {
                setIsPlaying(false);
                onNextVideo();
              }
            }
          }
        });
      }
    };

    if (window.onYouTubeIframeAPIReady) {
      const original = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        original();
        handleYouTubeIframe();
      };
    } else {
      window.onYouTubeIframeAPIReady = handleYouTubeIframe;
    }

    // If API already loaded, just call it
    if (window.YT && window.YT.Player) {
      handleYouTubeIframe();
    }

    return () => {
      if (ytPlayerRef.current) {
        try {
          ytPlayerRef.current.destroy();
        } catch (e) {}
      }
    };
  }, [video?.videoUrl]);

  useEffect(() => {
    if (isYouTube(video?.videoUrl) && ytPlayerRef.current && ytPlayerRef.current.playVideo) {
      if (isPlaying && !isAdPlaying) {
        ytPlayerRef.current.playVideo();
      } else {
        ytPlayerRef.current.pauseVideo();
      }
    }
  }, [isPlaying, isAdPlaying, video?.videoUrl]);
  
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    if (showControls && isPlaying) {
      timeout = setTimeout(() => {
        setShowControls(false);
      }, 4000); // Increased to 4s for better UX
    }
    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  const toggleControls = (e: React.MouseEvent | React.TouchEvent) => {
    // Don't toggle if clicking on interactive elements
    if ((e.target as HTMLElement).closest('button, input, [role="button"]')) return;
    
    e.preventDefault();
    e.stopPropagation();
    
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
        // Just prepare basic state, don't auto-start ad
        setPlayedMidRolls([]);
        lastTimeRef.current = 0;
        setAdPlayFailed(false);
        setIsCasting(false);
        setCastingDevice(null);
        setSelectedQuality('1080p');
        setPlaybackSpeed(1);
        setAudioTrack(initialLanguage === 'telugu' ? 'telugu' : 'tamil');
        setHasTriggeredPreRoll(false);
        setIsAdPlaying(false);
        setShowSettingsMenu(false);
        setShowDubbingMenu(false);
        
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
    const handleOpenQuiz = () => {
      if (!isTamilanPlanActive) {
        startQuiz();
      }
    };
    window.addEventListener('open-tamilan-quiz', handleOpenQuiz);
    return () => window.removeEventListener('open-tamilan-quiz', handleOpenQuiz);
  }, [isTamilanPlanActive]);

  useEffect(() => {
    if (isAdPlaying && adQueue[currentAdIndex]) {
      const playAd = async () => {
        try {
          if (adVideoRef.current) {
            adVideoRef.current.load(); // Force load before play
            await adVideoRef.current.play();
            setAdPlayFailed(false);
          }
        } catch (err) {
          console.warn("Ad autoplay blocked, trying muted:", err);
          // Fallback to muted if unmuted fails
          if (adVideoRef.current) {
            adVideoRef.current.muted = true;
            setIsAdMuted(true);
            try {
              await adVideoRef.current.play();
              setAdPlayFailed(false);
            } catch (retryErr) {
              console.warn("Muted ad autoplay also blocked:", retryErr);
              setAdPlayFailed(true);
            }
          }
        }
      };
      
      // Short delay to ensure video element is ready for playback
      const t = setTimeout(playAd, 300);
      return () => clearTimeout(t);
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

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && !isAdPlaying && video && !isDirectVideo(video.videoUrl)) {
      interval = setInterval(() => {
        const midRollInterval = 30;

        // For YouTube, we sync with the real API time
        if (isYouTube(video.videoUrl) && ytPlayerRef.current && ytPlayerRef.current.getCurrentTime) {
          const ytTime = ytPlayerRef.current.getCurrentTime();
          const ytDuration = ytPlayerRef.current.getDuration();
          if (ytTime !== undefined) {
             setCurrentTime(ytTime);
          }
          if (ytDuration !== undefined) setDuration(ytDuration);
          return;
        }

        // Mid-roll logic for other iframes
        setCurrentTime(prev => {
          const next = prev + 1;
          return next;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isAdPlaying, video, playedMidRolls, isTamilanPlanActive, currentTime]);

  if (!video) return null;

  const handleDownload = async () => {
    if (!video) return;
    
    if (!isTamilanPlanActive) {
      setShowSubscriptionModal(true);
    } else {
      if (isDownloading) return;
      
      setIsDownloading(true);
      try {
        const urlToFetch = resolvedVideoUrl || getProcessedVideoUrl(video.videoUrl);
        
        // If it's already a blob URL (resolved local file), we can skip the fetch
        if (urlToFetch.startsWith('blob:')) {
          const a = document.createElement('a');
          a.href = urlToFetch;
          const fileName = video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video';
          a.download = `${fileName}.mp4`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        } else {
          // Try to fetch the video as a blob to force download
          const response = await fetch(urlToFetch);
          if (!response.ok) throw new Error('Network response was not ok');
          
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          const fileName = video.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'video';
          a.download = `${fileName}.mp4`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        }
      } catch (error) {
        console.error('Download failed:', error);
        // Fallback: Try opening in a new tab if blob fetch fails (e.g. CORS)
        const a = document.createElement('a');
        a.href = resolvedVideoUrl || getProcessedVideoUrl(video.videoUrl);
        a.target = '_blank';
        a.download = video.title;
        a.click();
      } finally {
        setIsDownloading(false);
      }
    }
  };

  const handleShare = async () => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = `${baseUrl}?v=${video?.id}`;
    
    const shareData = {
      title: video?.title || 'VAAGAI Video',
      text: `Check out this video on VAAGAI: ${video?.title}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Error sharing:', error);
          copyToClipboard(shareUrl);
        }
      }
    } else {
      copyToClipboard(shareUrl);
    }
  };

  const copyToClipboard = (url?: string) => {
    const baseUrl = window.location.origin + window.location.pathname;
    const shareUrl = url || `${baseUrl}?v=${video?.id}`;
    
    navigator.clipboard.writeText(shareUrl).then(() => {
      setShowCopyNotification(true);
      setTimeout(() => setShowCopyNotification(false), 3000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
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

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setActiveSettingsTab('main');
    setShowSettingsMenu(false);
  };

  const audioTracks = [
    { label: 'Original', value: 'original', code: 'ORG' },
    { label: 'Tamil', value: 'tamil', code: 'TAM' },
    { label: 'Telugu', value: 'telugu', code: 'TEL' },
    { label: 'Hindi', value: 'hindi', code: 'HIN' },
    { label: 'English', value: 'english', code: 'ENG' },
    { label: 'Malayalam', value: 'malayalam', code: 'MAL' },
    { label: 'Kannada', value: 'kannada', code: 'KAN' },
  ];

  const handleAudioTrackChange = (lang: string) => {
    if (!isAiDubbingEnabled && lang !== 'original' && (!video.dubbedUrls || !video.dubbedUrls[lang])) {
      return;
    }

    if (lang === audioTrack) {
      setShowDubbingMenu(false);
      return;
    }

    const savedTime = videoRef.current ? videoRef.current.currentTime : currentTime;
    const track = audioTracks.find(t => t.value === lang);
    
    setIsDubbing(true);
    setDubbingProgress(0);
    setShowDubbingMenu(false);

    const isAutoDubbed = lang !== 'original' && (!video.dubbedUrls || !video.dubbedUrls[lang]);
    const totalDelay = isAutoDubbed ? 3000 : 1500;
    const increment = 100 / (totalDelay / 100);
    
    const progressInterval = setInterval(() => {
      setDubbingProgress(prev => Math.min(prev + increment, 98));
    }, 100);

    setTimeout(() => {
      clearInterval(progressInterval);
      setDubbingProgress(100);
      
      setTimeout(() => {
        setAudioTrack(lang);
        if (track) setAudioTrackLabel(track.code);
        setIsDubbing(false);
        setShowDubbingSuccess(true);
        setTimeout(() => setShowDubbingSuccess(false), 3000);
        
        // Restore time logic
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.currentTime = savedTime;
            if (isPlaying) videoRef.current.play();
          } else if (isYouTube(video.videoUrl) && ytPlayerRef.current) {
            ytPlayerRef.current.seekTo(savedTime, true);
            if (isPlaying) ytPlayerRef.current.playVideo();
          }
        }, 300);
      }, 500);
    }, totalDelay);
  };

  const getEffectiveVideoUrl = () => {
    if (video.dubbedUrls && video.dubbedUrls[audioTrack]) {
      return getProcessedVideoUrl(video.dubbedUrls[audioTrack]);
    }
    return resolvedVideoUrl || getProcessedVideoUrl(video.videoUrl);
  };

  const currentVideoUrl = (video && isDirectVideo(video.videoUrl)) 
    ? getEffectiveVideoUrl()
    : 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778810317/Blue_and_Pink_Modern_Business_Service_Promotion_Ads_Video_20260515_072619_0000_g2yko5.mp4';

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
    // Ads disabled per user request
    return;
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
        if (videoRef.current) {
          // Restore playback speed after ad
          videoRef.current.playbackRate = playbackSpeed;
          videoRef.current.play().catch(err => {
            console.warn("Autoplay after ad blocked:", err);
            setIsPlaying(false);
          });
        } else if (isYouTube(video.videoUrl) && ytPlayerRef.current) {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        } else if (!isDirectVideo(video.videoUrl)) {
          // General iframe
          setIsPlaying(true);
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
    
    // Normal playback or backward seek
    lastTimeRef.current = vTime;
  };

  const togglePlay = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (isAdPlaying) return;

    setShowControls(true); // Ensure controls are shown when play/pause is toggled
    
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        const playPromise = videoRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch(err => {
            console.warn('Video play blocked:', err);
            setIsPlaying(false);
          });
        }
      }
      setIsPlaying(!isPlaying);
    } else if (isYouTube(video.videoUrl) && ytPlayerRef.current) {
      try {
        const state = ytPlayerRef.current.getPlayerState();
        if (state === 1) { // 1 = playing
          ytPlayerRef.current.pauseVideo();
          setIsPlaying(false);
        } else {
          ytPlayerRef.current.playVideo();
          setIsPlaying(true);
        }
      } catch (err) {
        // Fallback if getPlayerState fails or isn't ready
        if (isPlaying) ytPlayerRef.current.pauseVideo();
        else ytPlayerRef.current.playVideo();
        setIsPlaying(!isPlaying);
      }
    } else {
      // For unknown iframes, we toggle our UI state
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
    const isYT = isYouTube(video.videoUrl);
    const vTime = isDirect ? videoRef.current?.currentTime || 0 : (isYT && ytPlayerRef.current?.getCurrentTime ? ytPlayerRef.current.getCurrentTime() : currentTime);
    const targetTime = Math.max(0, Math.min(vTime + seconds, duration || 9999));
    
    // Just seek directly, no ads
    if (isDirect && videoRef.current) {
      videoRef.current.currentTime = targetTime;
    } else if (isYT && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(targetTime, true);
    }
    setCurrentTime(targetTime);
    lastTimeRef.current = targetTime;
  };

  const handleProgressChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isAdPlaying) return;
    const targetTime = parseFloat(e.target.value);
    const vRef = videoRef.current;
    const isYT = isYouTube(video.videoUrl);
    
    // Just seek directly, no ads
    if (vRef) {
      vRef.currentTime = targetTime;
    } else if (isYT && ytPlayerRef.current) {
      ytPlayerRef.current.seekTo(targetTime, true);
    }
    setCurrentTime(targetTime);
    lastTimeRef.current = targetTime;
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    } else if (isYouTube(video.videoUrl) && ytPlayerRef.current) {
      if (isMuted) {
        ytPlayerRef.current.unMute();
      } else {
        ytPlayerRef.current.mute();
      }
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
    } else if (isYouTube(video.videoUrl) && ytPlayerRef.current) {
      ytPlayerRef.current.setVolume(v * 100);
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

  const getEmbedUrl = (url: string, t: number = 0) => {
    if (!url) return '';
    let embedUrl = url;
    
    // YouTube Handling
    const ytId = getYouTubeID(url);
    if (ytId) {
      const origin = window.location.origin;
      embedUrl = `https://www.youtube.com/embed/${ytId}?controls=0&modestbranding=1&rel=0&iv_load_policy=3&enablejsapi=1&disablekb=1&widget_referrer=${encodeURIComponent(origin)}&origin=${encodeURIComponent(origin)}`;
      // Extract original timestamp if present
      const ytTimeMatch = url.match(/[?&]t=([0-9]+)/);
      const startTime = t > 0 ? Math.floor(t) : (ytTimeMatch ? parseInt(ytTimeMatch[1]) : 0);
      if (startTime > 0) embedUrl += `&start=${startTime}`;
    } 
    // Vimeo Handling
    else if (url.includes('vimeo.com')) {
      const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?([0-9]+)/);
      if (vimeoMatch && vimeoMatch[1]) {
        embedUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1&badge=0&byline=0&portrait=0&title=0`;
        if (t > 0) embedUrl += `#t=${Math.floor(t)}s`;
      }
    }
    // Dailymotion Handling
    else if (url.includes('dailymotion.com')) {
      const dmMatch = url.match(/dailymotion\.com\/video\/([a-zA-Z0-9]+)/) || url.match(/dai\.ly\/([a-zA-Z0-9]+)/);
      if (dmMatch && dmMatch[1]) {
        embedUrl = `https://www.dailymotion.com/embed/video/${dmMatch[1]}?autoplay=1&mute=1`;
        if (t > 0) embedUrl += `&start=${Math.floor(t)}`;
      }
    }
    // Facebook Handling
    else if (url.includes('facebook.com')) {
      embedUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`;
    }
    // Google Drive / Docs Handling
    else if (url.includes('drive.google.com') || url.includes('docs.google.com')) {
      const driveId = getDriveID(url);
      if (driveId) {
        embedUrl = `https://drive.google.com/file/d/${driveId}/preview`;
      }
    }
    
    // Add autoplay and mute to maximize chance of starting
    if (!embedUrl.includes('autoplay=')) {
      const separator = embedUrl.includes('?') ? '&' : '?';
      // Only add parameters if it's not a generic unknown URL that might break
      if (ytId || url.includes('vimeo') || url.includes('dailymotion') || url.includes('drive') || url.includes('facebook')) {
        embedUrl += `${separator}autoplay=1&mute=1&rel=0&showinfo=0&modestbranding=1`;
      }
    }

    // Generic time parameter fallback
    if (t > 0 && !embedUrl.includes('start=') && !embedUrl.includes('#t=') && (ytId || url.includes('vimeo') || url.includes('drive'))) {
      const separator = embedUrl.includes('?') ? '&' : '?';
      embedUrl += `${separator}t=${Math.floor(t)}`;
    }
    
    return embedUrl;
  };

  const startQuiz = () => {
    // Pick 10 random questions
    const shuffled = [...TAMILAN_QUIZ_QUESTIONS].sort(() => 0.5 - Math.random());
    setQuizQuestions(shuffled.slice(0, 10));
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizStep('active');
    setShowQuiz(true);
  };

  const handleQuizAnswer = (selectedOptionIndex: number) => {
    const currentQ = quizQuestions[currentQuizIndex];
    const selectedOption = currentQ.options[selectedOptionIndex];
    const isCorrect = selectedOption === currentQ.answer;

    if (isCorrect) {
      setQuizScore(prev => prev + 1);
    }

    if (currentQuizIndex < 9) {
      setCurrentQuizIndex(prev => prev + 1);
    } else {
      // Final question answered
      const finalScore = isCorrect ? quizScore + 1 : quizScore;
      if (finalScore === 10) {
        setQuizStep('success');
        onPlanActive();
      } else {
        setQuizStep('failed');
      }
    }
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
          onMouseMove={() => setShowControls(true)}
        >
          {/* Floating Close Button - Hidden per user request for "only video box" */}
          <div className="absolute top-4 left-4 z-[60] transition-opacity duration-300 opacity-0 pointer-events-none">
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-3 bg-black/40 hover:bg-white/20 backdrop-blur-xl border border-white/10 rounded-full text-white transition-all active:scale-95 shadow-2xl"
              title="Close Player"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          </div>
          
          <div className="w-full h-full relative overflow-hidden">
              {/* Main Content (Always Mounted for Iframe Stability) */}
              <div className="w-full h-full min-h-[220px]" style={getQualityStyle()}>
                {/* Background Thumbnail for continuity */}
                <div 
                  className="absolute inset-0 z-0 opacity-40 blur-xl scale-110"
                  style={{ 
                    backgroundImage: `url(${resolvedThumbnailUrl || video.thumbnail})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                />

                {/* Audio Switching Loading Overlay */}
                <AnimatePresence>
                  {isDubbing && (
                    <motion.div 
                      key="audio-switching-overlay"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[46] bg-black/80 flex flex-col items-center justify-center backdrop-blur-2xl"
                    >
                      <div className="relative">
                        <motion.div 
                          animate={{ rotate: 360 }}
                          transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                          className="w-24 h-24 border border-brand-primary/20 rounded-full flex items-center justify-center"
                        >
                           <Sparkles className="w-4 h-4 text-brand-primary absolute -top-2 left-1/2 -translate-x-1/2" />
                        </motion.div>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <AudioLines className="w-8 h-8 text-brand-primary animate-pulse" />
                        </div>
                      </div>
                      <div className="mt-8 text-center px-6">
                        <div className="flex items-center justify-center gap-2 mb-2 opacity-0">
                           <Sparkles className="w-3 h-3 text-brand-primary" />
                           <h3 className="text-xs font-black text-white tracking-[0.2em] uppercase">Neural AI Hub</h3>
                        </div>
                        <p className="text-[10px] text-brand-primary font-bold uppercase tracking-widest animate-pulse">Syncing AI voice to {audioTrack}...</p>
                        
                        <div className="mt-6 w-full max-w-[200px] mx-auto opacity-0 pointer-events-none">
                          <div className="flex justify-between items-center mb-2">
                             <span className="text-[8px] font-black text-gray-500 uppercase tracking-tighter">Neural Mapping</span>
                             <span className="text-[8px] font-black text-brand-primary">{Math.round(dubbingProgress)}%</span>
                          </div>
                          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                               initial={{ width: "0%" }}
                               animate={{ width: `${dubbingProgress}%` }}
                               className="h-full bg-brand-primary shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]"
                             />
                          </div>
                        </div>

                        <div className="mt-6 flex gap-1 justify-center">
                           {[1,2,3,4,5].map(i => (
                             <motion.div 
                               key={i}
                               animate={{ height: [4, 12, 4] }}
                               transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                               className="w-1 bg-brand-primary rounded-full"
                             />
                           ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Dubbing Success Notification */}
                <AnimatePresence>
                  {showDubbingSuccess && (
                    <motion.div 
                      key="dubbing-success"
                      initial={{ opacity: 0, y: -20, x: '-50%' }}
                      animate={{ opacity: 1, y: 20, x: '-50%' }}
                      exit={{ opacity: 0, y: -20, x: '-50%' }}
                      className="absolute top-4 left-1/2 z-[51] bg-brand-primary text-black px-4 py-2 rounded-full flex items-center gap-2 shadow-2xl"
                    >
                      <Sparkles className="w-4 h-4 text-black" />
                      <span className="text-xs font-black uppercase tracking-widest whitespace-nowrap">AI {audioTrack} Audio Active</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Persistent AI Dubbing Badge */}
                <AnimatePresence>
                  {audioTrack !== 'original' && isPlaying && !showControls && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="absolute top-6 right-6 z-[45] flex items-center gap-2 bg-black/40 backdrop-blur-xl border border-white/5 px-3 py-1.5 rounded-full pointer-events-none"
                    >
                      <div className="flex gap-0.5 items-end h-3">
                         {[1,2,3].map(i => (
                           <motion.div 
                             key={i}
                             animate={{ height: isPlaying ? [4, 12, 4] : 4 }}
                             transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.15 }}
                             className="w-0.5 bg-brand-primary rounded-full"
                           />
                         ))}
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[7px] font-black tracking-widest text-brand-primary uppercase leading-none">Neural Dub</span>
                        <span className="text-[8px] font-bold text-white uppercase tracking-tighter leading-none mt-0.5">{audioTrack} SYNC</span>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>


                
                {/* Resume Modal Overlay */}
                <AnimatePresence>
                  {showResumeModal && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 z-[200] bg-black/90 backdrop-blur-3xl flex items-center justify-center p-6 text-center"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className="bg-[#121212] border border-white/10 rounded-[2.5rem] p-10 max-w-sm w-full shadow-[0_0_100px_rgba(0,0,0,0.8)] relative z-[201]"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                          <RotateCcw className="w-8 h-8 text-brand-primary" />
                        </div>
                        <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tighter">Resume Playback?</h2>
                        <p className="text-gray-400 text-sm mb-10">
                          You was already watched <span className="text-brand-primary font-black">{formatTime(savedResumeTime || 0)}</span>
                        </p>
                        
                        <div className="flex flex-col gap-4">
                          <button 
                            type="button"
                            onClick={handleResume}
                            className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-black uppercase tracking-widest py-5 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-brand-primary/20 active:scale-95 cursor-pointer relative z-[202]"
                          >
                            <Play className="w-5 h-5 fill-current" /> Resume Now
                          </button>
                          <button 
                            type="button"
                            onClick={handleStartOver}
                            className="w-full bg-white/5 hover:bg-white/10 text-white font-bold py-5 rounded-2xl transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer relative z-[202]"
                          >
                            Start from Beginning
                          </button>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isDirectVideo(video.videoUrl) ? (
                  <div className="relative w-full h-full overflow-hidden bg-black group/iframe">
                      <iframe
                        key={`${video.id}-${playerKey}`}
                        ref={ytIframeRef}
                        id="youtube-player"
                        src={getEmbedUrl(video.videoUrl, initialStartTime)}
                        className={`
                          border-none relative z-30 transition-opacity duration-700
                          ${isYouTube(video.videoUrl) 
                            ? 'w-[110%] h-[130%] -ml-[5%] -mt-[15%] pointer-events-none' 
                            : 'w-full h-full pointer-events-auto'
                          } 
                          ${isAdPlaying || showResumeModal ? 'opacity-0 pointer-events-none' : 'opacity-100'}
                        `}
                        allowFullScreen
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        sandbox="allow-forms allow-scripts allow-same-origin allow-presentation"
                      />
                    
                    {/* Interaction Shield - Capture clicks for YouTube to sync state, others interact directly */}
                    {isYouTube(video.videoUrl) && !isAdPlaying && !showResumeModal && (
                      <div 
                        className="absolute inset-0 z-40 cursor-pointer flex items-center justify-center bg-black/20 group/shield"
                        onClick={(e) => {
                          e.stopPropagation();
                          togglePlay(e);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const x = e.clientX - rect.left;
                          if (x < rect.width / 3) {
                            skip(-10);
                          } else if (x > (rect.width / 3) * 2) {
                            skip(10);
                          } else {
                            toggleFullscreen();
                          }
                        }}
                      />
                    )}
                  </div>
                ) : (
                    <video
                      ref={videoRef}
                      autoPlay={false}
                      controls={false}
                      playsInline
                      className={`w-full h-full object-contain relative z-10 transition-opacity duration-500 ${isAdPlaying || isDubbing ? 'opacity-0' : 'opacity-100'}`}
                      src={currentVideoUrl}
                      onTimeUpdate={handleTimeUpdate}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                      onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                      onError={(e) => {
                        // If the blob URL is stale (after reload), fallback to a cinematic sample
                        const processedUrl = getProcessedVideoUrl(video.videoUrl);
                        const fallbackUrl = 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778810317/Blue_and_Pink_Modern_Business_Service_Promotion_Ads_Video_20260515_072619_0000_g2yko5.mp4';
                        if ((processedUrl.startsWith('blob:') || processedUrl.startsWith('local-file:')) && e.currentTarget.src !== fallbackUrl) {
                          console.warn('Local file or blob URL stale or failed, falling back to cinematic sample');
                          e.currentTarget.src = fallbackUrl;
                          e.currentTarget.play().catch(() => {});
                        }
                      }}
                      poster={resolvedThumbnailUrl || video.thumbnail}
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
            {/* If it's a Drive/YouTube video and we're showing an ad, we should 
                ensure the iframe doesn't start playing sound in the background 
                if we can, but since it's an iframe we can only hide it. */}
            <video
              ref={adVideoRef}
                      key={`ad-${currentAdIndex}`}
                      autoPlay
                      playsInline
                      preload="auto"
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

                      {/* Skip Ad Button after 5 seconds */}
                      {!isTamilanPlanActive && adCurrentTime > 5 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleAdEnded(); }}
                          className="mt-6 pointer-events-auto bg-white/10 hover:bg-white/20 backdrop-blur-xl border border-white/20 px-6 py-2 rounded-xl text-white font-black text-xs uppercase tracking-widest transition-all active:scale-95 flex items-center gap-2"
                        >
                          Skip Ad
                          <Play className="w-3 h-3 fill-white" />
                        </button>
                      )}
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

              {/* Custom Controls Overlay - Show ONLY for Direct/YouTube to respect external player's UI */}
              {!isAdPlaying && (isDirectVideo(video.videoUrl) || isYouTube(video.videoUrl)) && (
              <div className={`absolute inset-0 z-40 bg-gradient-to-t from-black/80 via-transparent to-black/40 flex flex-col justify-end transition-opacity duration-300 pointer-events-none ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                {/* Center Play Button removed as per user request */}
                <div className="flex-1 flex items-center justify-center pointer-events-none" />

                {/* Bottom Controls - Show for YouTube/Direct ONLY */}
                <div className="p-4 md:p-8 flex flex-col gap-4 bg-gradient-to-t from-black via-black/40 to-transparent relative z-50 pointer-events-auto flex">


                  {/* Progress Bar with End Timestamps */}
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] md:text-sm font-mono text-white/80 font-bold">{formatTime(currentTime)}</span>
                      <span className="text-[10px] md:text-sm font-mono text-white/80 font-bold">{formatTime(duration)}</span>
                    </div>
                    
                    <div 
                      ref={progressRef}
                      className="relative h-6 flex items-center group/progress cursor-pointer"
                      onMouseMove={handleProgressBarMouseMove}
                      onMouseLeave={handleProgressBarMouseLeave}
                    >
                      <input
                        type="range"
                        min={0}
                        max={duration || 0}
                        step={0.1}
                        value={currentTime}
                        onChange={handleProgressChange}
                        className="absolute inset-x-0 w-full opacity-0 z-20 cursor-pointer h-full"
                      />
                      {/* Track Background */}
                      <div className="absolute inset-x-0 h-1 bg-white/20 rounded-full overflow-hidden transition-all group-hover/progress:h-1.5 focus-within:h-1.5">
                        {/* Hover Preview Bar */}
                        {hoverTime !== null && (
                          <div 
                            className="absolute inset-y-0 bg-white/20 z-0"
                            style={{ width: `${duration > 0 ? (hoverTime / duration) * 100 : 0}%` }}
                          />
                        )}
                        <div 
                          className="h-full bg-white relative z-10 transition-all duration-75" 
                          style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                        />
                        
                        {/* Mid-roll Ad Markers */}
                        {!isTamilanPlanActive && duration > 0 && Array.from({ length: Math.floor(duration / 30) }).map((_, i) => (
                          <div 
                            key={`ad-marker-${i}`}
                            className="absolute top-0 w-1 h-full bg-yellow-500/80 z-20"
                            style={{ left: `${((i + 1) * 30 / duration) * 100}%` }}
                          />
                        ))}
                      </div>
                      {/* Thumb handle */}
                      <div 
                        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg z-30 transition-transform scale-0 group-hover/progress:scale-100 group-focus-within/progress:scale-100 pointer-events-none"
                        style={{ left: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                      />
                      
                      {/* Timestamp Tooltip */}
                      <AnimatePresence>
                        {hoverTime !== null && (
                          <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.9 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.9 }}
                            className="absolute bottom-full mb-3 bg-white text-black text-[10px] font-black px-2 py-1 rounded shadow-xl pointer-events-none z-50 transition-all"
                            style={{ left: hoverX, transform: 'translateX(-50%)' }}
                          >
                            {formatTime(hoverTime)}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  {/* Main Control Bar */}
                  <div className="flex items-center justify-between pb-2">
                    {/* Left: Volume Section - Hidden per user request */}
                    <div className="hidden items-center gap-4 w-1/4">
                      <div className="flex items-center gap-3">
                        <button onClick={toggleMute} className="text-white hover:text-white/80 transition-colors">
                          {isMuted || volume === 0 ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
                        </button>
                        <div className="relative w-24 h-1 bg-white/20 rounded-full group cursor-pointer hidden md:block">
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.01}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="absolute inset-0 w-full opacity-0 z-20 cursor-pointer h-full"
                          />
                          <div 
                            className="h-full bg-white transition-all duration-75" 
                            style={{ width: `${(isMuted ? 0 : volume) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Center: Playback Center Section - Hidden per user request */}
                    <div className="hidden items-center gap-8 md:gap-12">
                      <button onClick={(e) => { e.stopPropagation(); skip(-10); }} className="text-white hover:scale-110 transition-transform active:scale-95">
                        <SkipBack className="w-6 h-6 md:w-8 md:h-8" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); skip(10); }} className="text-white hover:scale-110 transition-transform active:scale-95">
                        <SkipForward className="w-6 h-6 md:w-8 md:h-8" />
                      </button>
                    </div>

                    {/* Right: Tools Section - Hidden per user request for "only video box" */}
                    <div className="hidden items-center justify-end gap-2 md:gap-6 w-1/4">
                      {/* Special Feature Button */}
                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowDubbingMenu(!showDubbingMenu); setShowSettingsMenu(false); }}
                          className={`p-2 transition-all active:scale-95 flex items-center gap-1 relative ${showDubbingMenu ? 'text-brand-primary' : 'text-white hover:text-white/80'}`}
                          title="Auto Dubbed (BETA)"
                        >
                          <Languages className="w-5 h-5 md:w-6 md:h-6" />
                          <span className="text-[10px] font-black tracking-tighter opacity-80">{audioTrackLabel}</span>
                          {audioTrack !== 'original' && (
                            <motion.div 
                              layoutId="ai-dot"
                              className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-brand-primary rounded-full border-2 border-black"
                            />
                          )}
                          <div className="absolute -top-2 -right-3 bg-brand-primary text-[6px] font-black px-1 rounded-full text-black translate-y-2">BETA</div>
                        </button>
                        
                                <AnimatePresence>
                                  {showDubbingMenu && (
                                    <motion.div 
                                      initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                      animate={{ opacity: 1, scale: 1, y: 0 }}
                                      exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                      className="absolute bottom-full right-0 mb-4 bg-black/95 backdrop-blur-3xl border border-white/10 rounded-2xl p-2 min-w-[220px] shadow-2xl z-50 overflow-hidden"
                                    >
                                      <div className="px-3 py-3 border-b border-white/5 mb-2">
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-[10px] font-black tracking-widest text-gray-400 uppercase">AI Neural Sync</span>
                                          <Sparkles className="w-3 h-3 text-brand-primary animate-pulse" />
                                        </div>
                                        <div className="flex items-center justify-between mt-2">
                                           <div className="flex flex-col">
                                              <span className="text-[10px] font-bold text-white">Auto AI Dubbing</span>
                                              <span className="text-[7px] text-gray-500 font-bold uppercase tracking-tighter">Real-time Translation</span>
                                           </div>
                                           <button 
                                             onClick={(e) => { e.stopPropagation(); setIsAiDubbingEnabled(!isAiDubbingEnabled); }}
                                             className={`w-10 h-5 rounded-full relative transition-colors ${isAiDubbingEnabled ? 'bg-brand-primary' : 'bg-white/10'}`}
                                           >
                                              <motion.div 
                                                animate={{ x: isAiDubbingEnabled ? 20 : 2 }}
                                                className="absolute top-1 w-3 h-3 bg-white rounded-full shadow-lg"
                                              />
                                           </button>
                                        </div>
                                      </div>

                                      <div className="flex flex-col gap-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                        {audioTracks.map((track) => (
                                          <button
                                            key={track.value}
                                            onClick={(e) => { e.stopPropagation(); handleAudioTrackChange(track.value); }}
                                            className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-left transition-all group ${audioTrack === track.value ? 'bg-brand-primary/10 text-brand-primary' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                                          >
                                            <div className="flex items-center gap-3">
                                              <span className={`text-sm font-bold ${audioTrack === track.value ? 'text-white' : ''}`}>{track.label}</span>
                                              {track.value !== 'original' && (!video.dubbedUrls || !video.dubbedUrls[track.value]) && (
                                                <div className="px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 flex items-center gap-1 group-hover:border-brand-primary/30 transition-colors">
                                                  <Sparkles className="w-2 h-2 text-brand-primary" />
                                                  <span className="text-[7px] font-black tracking-tighter text-gray-500 group-hover:text-brand-primary transition-colors">AI</span>
                                                </div>
                                              )}
                                            </div>
                                            {audioTrack === track.value && (
                                              <motion.div layoutId="track-dot" className="w-2 h-2 rounded-full bg-brand-primary shadow-[0_0_10px_rgba(var(--brand-primary-rgb),0.5)]" />
                                            )}
                                          </button>
                                        ))}
                                      </div>
                                      
                                      <div className="mt-2 pt-2 border-t border-white/5 px-3 pb-1">
                                         <p className="text-[8px] text-gray-500 font-medium leading-relaxed italic">
                                           Neural AI voice synthesis might have slight sync variations in Beta.
                                         </p>
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                      </div>

                      <div className="relative">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setShowSettingsMenu(!showSettingsMenu); setShowDubbingMenu(false); setActiveSettingsTab('main'); }}
                          className={`p-2 transition-colors active:scale-90 ${showSettingsMenu ? 'text-brand-primary' : 'text-white hover:text-white/80'}`}
                        >
                          <Settings className={`w-5 h-5 md:w-6 md:h-6 ${showSettingsMenu ? 'rotate-90' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {showSettingsMenu && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute bottom-full right-0 mb-4 bg-black/95 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 min-w-[220px] shadow-2xl z-50 overflow-hidden"
                            >
                              {activeSettingsTab === 'main' && (
                                <div className="flex flex-col gap-1.5">
                                  <div className="px-3 py-2 border-b border-white/5 mb-1 text-[10px] font-black text-gray-500 uppercase tracking-widest text-left">Playback</div>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('quality'); }} className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-all">
                                    <span className="text-sm font-bold text-gray-300">Quality</span>
                                    <span className="text-xs font-black text-white">{selectedQuality}</span>
                                  </button>
                                  <button onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('speed'); }} className="flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-all">
                                    <span className="text-sm font-bold text-gray-300">Speed</span>
                                    <span className="text-xs font-black text-white">{playbackSpeed}x</span>
                                  </button>
                                </div>
                              )}
                              {activeSettingsTab === 'quality' && (
                                <div className="flex flex-col gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('main'); }} className="px-4 py-2 text-[10px] font-black text-gray-500 border-b border-white/5 flex items-center gap-2 hover:text-white transition-colors">
                                    <ChevronLeft className="w-3 h-3" /> BACK
                                  </button>
                                  {videoQualities.map(q => (
                                    <button 
                                      key={q.value}
                                      onClick={(e) => { e.stopPropagation(); handleQualityChange(q); }}
                                      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-all ${selectedQuality === q.value ? 'text-white text-left' : 'text-gray-400 text-left'}`}
                                    >
                                      <span className="text-sm font-bold">{q.label}</span>
                                      {selectedQuality === q.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {activeSettingsTab === 'speed' && (
                                <div className="flex flex-col gap-1">
                                  <button onClick={(e) => { e.stopPropagation(); setActiveSettingsTab('main'); }} className="px-4 py-2 text-[10px] font-black text-gray-500 border-b border-white/5 flex items-center gap-2 hover:text-white transition-colors">
                                    <ChevronLeft className="w-3 h-3" /> BACK
                                  </button>
                                  {playbackSpeeds.map(s => (
                                    <button 
                                      key={s.value}
                                      onClick={(e) => { e.stopPropagation(); handleSpeedChange(s.value); }}
                                      className={`flex items-center justify-between w-full px-4 py-3 rounded-xl hover:bg-white/5 transition-all ${playbackSpeed === s.value ? 'text-white text-left' : 'text-gray-400 text-left'}`}
                                    >
                                      <span className="text-sm font-bold">{s.label}</span>
                                      {playbackSpeed === s.value && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Fullscreen Button - Hidden per user request */}
                      <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="hidden text-white hover:scale-110 transition-transform active:scale-95 p-2">
                        {isFullscreen ? <Minimize className="w-6 h-6 md:w-8 md:h-8" /> : <Maximize className="w-6 h-6 md:w-8 md:h-8" />}
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
                
                {/* Beta Modal (Global) */}
                <AnimatePresence>
                  {showBetaModal && (
                    <motion.div 
                      key="beta-modal"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-black/95 backdrop-blur-md"
                    >
                      <motion.div 
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                        className="bg-[#0a0a14] border border-brand-primary/30 rounded-[2.5rem] p-8 md:p-10 max-w-sm w-full shadow-[0_0_100px_rgba(255,107,0,0.2)] text-center relative overflow-hidden"
                      >
                        <div className="absolute top-0 right-0 p-6">
                           <Sparkles className="w-8 h-8 text-brand-primary/10 animate-pulse" />
                        </div>
                        <div className="w-20 h-20 bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-8 border border-brand-primary/20 shadow-inner">
                          <Languages className="w-10 h-10 text-brand-primary" />
                        </div>
                        <h2 className="text-3xl font-black text-white mb-3 uppercase tracking-tighter">BETA VERSION</h2>
                        <div className="inline-block px-3 py-1 bg-brand-primary text-[10px] font-black text-white rounded-full mb-6 italic tracking-widest leading-none">VAAGAI AI ENGINE v2.4</div>
                        <p className="text-gray-400 text-sm leading-relaxed mb-10 font-medium">
                          Auto-Dubbing is currently in <span className="text-brand-primary font-bold">Public Beta</span>. Our AI generates real-time audio tracks, which may vary from original context. Thank you for testing the future of cinema.
                        </p>
                        <button 
                          onClick={() => setShowBetaModal(false)}
                          className="w-full bg-brand-primary hover:bg-brand-primary/90 text-white font-black py-4 rounded-2xl transition-all shadow-[0_10px_20px_rgba(255,107,0,0.3)] active:scale-95 text-sm uppercase tracking-widest"
                        >
                          I UNDERSTAND
                        </button>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
          </div>
        
        {/* Video Details Section */}
        <div className="p-4 md:px-12 flex flex-col gap-4 max-w-4xl mx-auto w-full">
{/* Title removed per user request */}

          
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

          {/* Copy Notification Toast */}
          <AnimatePresence>
            {showCopyNotification && (
              <motion.div 
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[300] bg-white text-black px-6 py-3 rounded-full font-bold shadow-2xl flex items-center gap-2"
              >
                <div className="w-5 h-5 bg-black rounded-full flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
                Link copied to clipboard!
              </motion.div>
            )}
          </AnimatePresence>
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
                    <span className="text-4xl font-black text-brand-primary uppercase">FREE</span>
                    <span className="text-gray-500 font-bold text-sm uppercase tracking-widest">/ Lifetime</span>
                   </div>
                   <span className="text-[10px] text-brand-primary font-black animate-pulse">PROVE YOU ARE TAMILAN</span>
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
                      startQuiz();
                      setShowSubscriptionModal(false);
                    }}
                    className="w-full py-4 bg-white text-black font-black rounded-2xl hover:bg-brand-primary hover:text-white transition-all active:scale-95 shadow-xl uppercase tracking-widest"
                  >
                    Take Tamilan Test
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

        {/* Tamilan Quiz Modal */}
        <AnimatePresence>
          {showQuiz && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[110] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-bg-dark rounded-[32px] border border-white/10 p-6 w-full max-w-lg flex flex-col gap-6 shadow-2xl overflow-hidden"
              >
                {quizStep === 'intro' && (
                  <div className="text-center space-y-6 py-4">
                    <div className="w-20 h-20 bg-brand-primary/20 rounded-full flex items-center justify-center mx-auto">
                      <Sparkles className="w-10 h-10 text-brand-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">TAMILAN VERIFICATION</h2>
                      <p className="text-gray-400 text-sm mt-2">Answer 10/10 questions correctly to activate your Lifetime Free Plan.</p>
                    </div>
                    <button 
                      onClick={() => setQuizStep('active')}
                      className="w-full py-4 bg-brand-primary text-white font-black rounded-2xl shadow-xl uppercase tracking-widest"
                    >
                      Start Challenge
                    </button>
                    <button 
                      onClick={() => setShowQuiz(false)}
                      className="text-gray-500 font-bold text-sm hover:text-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {quizStep === 'active' && quizQuestions[currentQuizIndex] && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-brand-primary uppercase tracking-widest">Question {currentQuizIndex + 1}/10</span>
                      <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Score: {quizScore}</span>
                    </div>
                    
                    <div className="bg-white/5 h-2 rounded-full overflow-hidden">
                      <motion.div 
                        className="bg-brand-primary h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(currentQuizIndex + 1) * 10}%` }}
                      />
                    </div>

                    <h3 className="text-xl font-bold text-white leading-relaxed min-h-[3.5rem]">
                      {quizQuestions[currentQuizIndex].question}
                    </h3>

                    <div className="grid grid-cols-1 gap-3">
                      {quizQuestions[currentQuizIndex].options.map((option, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleQuizAnswer(idx)}
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-left text-gray-300 font-bold hover:bg-white/10 hover:border-brand-primary hover:text-white transition-all active:scale-[0.98] flex items-center gap-4 group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-[10px] group-hover:bg-brand-primary/20 group-hover:text-brand-primary transition-colors">
                            {String.fromCharCode(65 + idx)}
                          </div>
                          {option}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {quizStep === 'success' && (
                  <div className="text-center space-y-6 py-8">
                    <motion.div 
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-24 h-24 bg-black rounded-full flex items-center justify-center mx-auto shadow-2xl"
                    >
                      <Sparkles className="w-12 h-12 text-white" />
                    </motion.div>
                    <div>
                      <h2 className="text-3xl font-black text-white uppercase tracking-tight">Verified TAMILAN!</h2>
                      <p className="text-gray-200 font-bold mt-2">10/10 Correct Answers</p>
                      <p className="text-gray-400 text-sm mt-4">Your Lifetime Free Plan is now ACTIVE. Enjoy ad-free streaming and unlimited downloads!</p>
                    </div>
                    <button 
                      onClick={() => setShowQuiz(false)}
                      className="w-full py-4 bg-white text-black font-black rounded-2xl shadow-xl uppercase tracking-widest"
                    >
                      Start Watching
                    </button>
                  </div>
                )}

                {quizStep === 'failed' && (
                  <div className="text-center space-y-6 py-8">
                    <div className="w-24 h-24 bg-red-500/20 rounded-full flex items-center justify-center mx-auto">
                      <Lock className="w-12 h-12 text-red-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-white uppercase tracking-tight">Verification Failed</h2>
                      <p className="text-red-400 font-bold mt-2">Score: {quizScore}/10</p>
                      <p className="text-gray-400 text-sm mt-4">You need to answer ALL 10 questions correctly to qualify for the Lifetime Free Plan.</p>
                    </div>
                    <div className="flex flex-col gap-3">
                      <button 
                        onClick={startQuiz}
                        className="w-full py-4 bg-brand-primary text-white font-black rounded-2xl shadow-xl uppercase tracking-widest"
                      >
                        Try Again
                      </button>
                      <button 
                        onClick={() => setShowQuiz(false)}
                        className="text-gray-500 font-bold text-sm hover:text-white transition-colors"
                      >
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </AnimatePresence>
  );
}
