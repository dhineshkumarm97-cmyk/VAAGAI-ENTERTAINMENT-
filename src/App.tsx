/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SplashScreen from './components/SplashScreen';
import LanguageSelector from './components/LanguageSelector';
import VideoPlayer from './components/VideoPlayer';
import { Home, Compass, PlaySquare, MoreVertical } from 'lucide-react';
import { Video } from './types';

const MOCK_VIDEOS: Video[] = [
  {
    id: '1',
    title: 'MURUGAN SOUTH INDIA DEVOTIONAL - OFFICIAL VIDEO',
    description: 'Experience the divine presence with this soul-stirring devotional video. Dedicated to Lord Murugan, capturing the essence of South Indian spiritual heritage and culture.',
    thumbnail: 'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778682585/Picsart_26-05-13_06-45-33-442_t7kmaw.png',
    videoUrl: 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778682664/AQPljtACF3Gie1XyO9z11wAoJdIkB2FXfDZnvHKfJth_Br4-NDdBD3cgecUHH06IrQIFLRWUt9p5woPAtdqR38_X_sttldo.mp4',
    category: 'Trending',
    year: '2024',
    duration: '12:45',
    rating: 'UA',
    views: '1.2M',
    uploadedAt: '2 days ago',
    channelName: 'Vaagai Media',
    channelAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100',
    subscribers: '5.2M',
    language: 'tamil'
  },
  {
    id: '2',
    title: 'Hindi Epic Adventure - The Journey Begins',
    description: 'A grand exploration of the northern mountains and the legends that live within them.',
    thumbnail: 'https://images.unsplash.com/photo-1524492412937-b28074a5d7da?q=80&w=2071&auto=format&fit=crop',
    videoUrl: 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778682664/AQPljtACF3Gie1XyO9z11wAoJdIkB2FXfDZnvHKfJth_Br4-NDdBD3cgecUHH06IrQIFLRWUt9p5woPAtdqR38_X_sttldo.mp4',
    category: 'Trending',
    year: '2023',
    duration: '24:10',
    rating: 'UA',
    views: '3.4M',
    uploadedAt: '1 month ago',
    channelName: 'North Star India',
    channelAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?q=80&w=100',
    subscribers: '1.2M',
    language: 'hindi'
  },
  {
    id: '3',
    title: 'Telugu Cultural Dance Performance',
    description: 'Breathtaking Kuchipudi dance performance by world-renowned artists.',
    thumbnail: 'https://images.unsplash.com/photo-1530731141654-5993c3016c77?q=80&w=2070&auto=format&fit=crop',
    videoUrl: 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778682664/AQPljtACF3Gie1XyO9z11wAoJdIkB2FXfDZnvHKfJth_Br4-NDdBD3cgecUHH06IrQIFLRWUt9p5woPAtdqR38_X_sttldo.mp4',
    category: 'Trending',
    year: '2024',
    duration: '08:15',
    rating: 'UA',
    views: '890K',
    uploadedAt: '1 week ago',
    channelName: 'South Arts',
    channelAvatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=100',
    subscribers: '450K',
    language: 'telugu'
  },
  {
    id: '4',
    title: 'Malayalam Nature Documentary: Western Ghats',
    description: 'Deep dive into the biodiversity of the magical Western Ghats.',
    thumbnail: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=80&w=2070&auto=format&fit=crop',
    videoUrl: 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778682664/AQPljtACF3Gie1XyO9z11wAoJdIkB2FXfDZnvHKfJth_Br4-NDdBD3cgecUHH06IrQIFLRWUt9p5woPAtdqR38_X_sttldo.mp4',
    category: 'Nature',
    year: '2024',
    duration: '18:50',
    rating: 'UA',
    views: '1.5M',
    uploadedAt: '3 days ago',
    channelName: 'Kerala Wild',
    channelAvatar: 'https://images.unsplash.com/photo-1582510003544-4d00b7f74220?q=100&w=100',
    subscribers: '2.1M',
    language: 'malayalam'
  },
  {
    id: '5',
    title: 'Bengali Sweets: A Culinary Journey',
    description: 'Discover the secrets behind the most famous sweets from West Bengal.',
    thumbnail: 'https://images.unsplash.com/photo-1589113735053-06692db20005?q=80&w=2070&auto=format&fit=crop',
    videoUrl: 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778682664/AQPljtACF3Gie1XyO9z11wAoJdIkB2FXfDZnvHKfJth_Br4-NDdBD3cgecUHH06IrQIFLRWUt9p5woPAtdqR38_X_sttldo.mp4',
    category: 'Food',
    year: '2024',
    duration: '14:20',
    rating: 'UA',
    views: '450K',
    uploadedAt: '5 days ago',
    channelName: 'Bengal Bites',
    channelAvatar: 'https://images.unsplash.com/photo-1589113735053-06692db20005?q=100&w=100',
    subscribers: '120K',
    language: 'bengali'
  },
  {
    id: '6',
    title: 'Punjabi Folk Music - Virsa',
    description: 'Soulful Punjabi folk music that connects you to the roots of Punjab.',
    thumbnail: 'https://images.unsplash.com/photo-1593693400551-744385a448fc?q=80&w=2070&auto=format&fit=crop',
    videoUrl: 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778682664/AQPljtACF3Gie1XyO9z11wAoJdIkB2FXfDZnvHKfJth_Br4-NDdBD3cgecUHH06IrQIFLRWUt9p5woPAtdqR38_X_sttldo.mp4',
    category: 'Music',
    year: '2024',
    duration: '10:05',
    rating: 'UA',
    views: '2.1M',
    uploadedAt: '2 weeks ago',
    channelName: 'Punjab Beats',
    channelAvatar: 'https://images.unsplash.com/photo-1593693400551-744385a448fc?q=100&w=100',
    subscribers: '3.4M',
    language: 'punjabi'
  },
  {
    id: '7',
    title: 'Marathi Killa Exploration: Raigad',
    description: 'History and architectural marvels of the Raigad Fort.',
    thumbnail: 'https://images.unsplash.com/photo-1551009175-15bdf9dcb580?q=80&w=2070&auto=format&fit=crop',
    videoUrl: 'https://res.cloudinary.com/dkc9ru68y/video/upload/v1778682664/AQPljtACF3Gie1XyO9z11wAoJdIkB2FXfDZnvHKfJth_Br4-NDdBD3cgecUHH06IrQIFLRWUt9p5woPAtdqR38_X_sttldo.mp4',
    category: 'History',
    year: '2023',
    duration: '22:15',
    rating: 'UA',
    views: '780K',
    uploadedAt: '1 month ago',
    channelName: 'Marathi Heritage',
    channelAvatar: 'https://images.unsplash.com/photo-1551009175-15bdf9dcb580?q=100&w=100',
    subscribers: '560K',
    language: 'marathi'
  }
];

export default function App() {
  const [appState, setAppState] = useState<'splash' | 'language' | 'main'>('splash');
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isTamilanPlanActive, setIsTamilanPlanActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('vaagai_language');
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }
  }, []);

  const filteredVideos = MOCK_VIDEOS.filter(video => 
    video.language === selectedLanguage &&
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (appState === 'splash') {
    return (
      <SplashScreen 
        onFinish={() => {
          const savedLanguage = localStorage.getItem('vaagai_language');
          if (savedLanguage) {
            setAppState('main');
          } else {
            setAppState('language');
          }
        }} 
      />
    );
  }

  if (appState === 'language') {
    return (
      <LanguageSelector 
        onSelect={(lang) => {
          setSelectedLanguage(lang);
          localStorage.setItem('vaagai_language', lang);
          setAppState('main');
        }} 
      />
    );
  }

  return (
    <div id="youtube-root" className="min-h-screen bg-bg-dark text-white font-sans flex flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 bg-bg-dark p-4 gap-6 border-r border-white/5">
        <div 
          onClick={() => setAppState('language')}
          className="flex items-center gap-4 px-2 mb-4 cursor-pointer group"
        >
          <div className="w-8 h-8 rounded bg-brand-primary flex items-center justify-center font-black text-xl italic group-hover:rotate-12 transition-transform">V</div>
          <span className="text-xl font-display font-bold text-white tracking-tighter">VAAGAI</span>
        </div>
        
        <nav className="flex flex-col gap-1">
          {[
            { icon: Home, label: 'Home', active: true },
            { icon: PlaySquare, label: 'Shorts' },
            { icon: Compass, label: 'Subscriptions' }
          ].map((item) => (
            <button 
              key={item.label}
              className={`flex items-center gap-6 p-3 rounded-xl transition-colors ${item.active ? 'bg-white/10' : 'hover:bg-white/5'}`}
            >
              <item.icon className={`w-6 h-6 ${item.active ? 'text-white' : 'text-gray-400'}`} />
              <span className={`text-sm ${item.active ? 'font-bold' : 'font-medium text-gray-400'}`}>{item.label}</span>
            </button>
          ))}
          
          <div className="h-px bg-white/5 my-4" />
          
          <button 
            onClick={() => setAppState('language')}
            className="flex items-center gap-6 p-3 rounded-xl hover:bg-white/5 transition-colors"
          >
            <div className="w-6 h-6 rounded-full bg-brand-primary/20 flex items-center justify-center">
              <span className="text-[10px] font-black text-brand-primary uppercase">
                {selectedLanguage?.charAt(0)}
              </span>
            </div>
            <span className="text-sm font-medium text-gray-400 capitalize">Change Language</span>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col">
        <Navbar 
          isTamilanPlanActive={isTamilanPlanActive} 
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        
        {/* Video Grid */}
        <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredVideos.length > 0 ? (
            filteredVideos.map((video) => (
              <div 
                key={video.id} 
                className="flex flex-col gap-3 group cursor-pointer"
                onClick={() => setSelectedVideo(video)}
              >
              <div className="aspect-video relative rounded-2xl overflow-hidden bg-gray-800">
                <img 
                  src={video.thumbnail} 
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                  alt={video.title}
                  referrerPolicy="no-referrer"
                />
                <span className="absolute bottom-2 right-2 bg-black/80 px-1.5 py-0.5 rounded text-xs font-bold text-white">
                  {video.duration}
                </span>
              </div>
              
              <div className="flex gap-3 px-1">
                <div className="flex flex-col gap-1 flex-1">
                  <h3 className="font-bold text-base leading-snug line-clamp-2 text-white group-hover:text-brand-primary transition-colors">
                    {video.title}
                  </h3>
                  <div className="flex flex-col text-sm text-gray-400">
                    <span>{video.views} views</span>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full py-20 flex flex-col items-center justify-center text-gray-500 gap-4">
            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
              <Compass className="w-10 h-10" />
            </div>
            <p className="text-lg font-bold">No videos found matching "{searchQuery}"</p>
          </div>
        )}
        </div>
      </main>

      {/* Video Player Detail Page */}
      <VideoPlayer 
        video={selectedVideo} 
        onClose={() => setSelectedVideo(null)} 
        isTamilanPlanActive={isTamilanPlanActive}
        onPlanActive={() => setIsTamilanPlanActive(true)}
      />
    </div>
  );
}

