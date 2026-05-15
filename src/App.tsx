/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import SplashScreen from './components/SplashScreen';
import LanguageSelector from './components/LanguageSelector';
import VideoPlayer from './components/VideoPlayer';
import Login from './components/Login';
import UserProfileSetup from './components/UserProfileSetup';
import BottomNav from './components/BottomNav';
import MySpace from './components/MySpace';
import ProfileSelection from './components/ProfileSelection';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Home, Compass, PlaySquare, MoreVertical, LogOut } from 'lucide-react';
import { Video, UserProfile } from './types';

const MOCK_VIDEOS: Video[] = [
  {
    id: 'vid-1',
    title: 'Vaagai Official Trailer',
    description: 'The official trailer for our upcoming grand release. Experience the magic of Tamil cinema like never before.',
    thumbnail: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=1925&auto=format&fit=crop',
    videoUrl: 'https://drive.google.com/file/d/1TJakoWL-PP4ZJw_mrFBcYgN34QSzcwB_/view',
    category: 'New',
    year: '2026',
    duration: '02:30',
    rating: 'U',
    views: '25K',
    uploadedAt: 'Today',
    channelName: 'Vaagai Media',
    channelAvatar: 'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/Lion-icon_cxqtdq.png',
    subscribers: '1M',
    language: 'tamil'
  },
  {
    id: 'vid-2',
    title: 'Vaagai Special Content',
    description: 'Special additional content for our community.',
    thumbnail: 'https://images.unsplash.com/photo-1598897349489-02f20ebee3d4?q=80&w=2070&auto=format&fit=crop',
    videoUrl: 'https://drive.google.com/file/d/1-dc6kxO4XTq9UL-Tvk2JSUuDT4lRGUT5/view',
    category: 'New',
    year: '2026',
    duration: '03:15',
    rating: 'U',
    views: '10K',
    uploadedAt: 'Recent',
    channelName: 'Vaagai Media',
    channelAvatar: 'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/Lion-icon_cxqtdq.png',
    subscribers: '1M',
    language: 'tamil'
  },
  {
    id: 'vid-3',
    title: 'Vaagai Premium Clip',
    description: 'Exclusive community video for our Tamilan fans.',
    thumbnail: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?q=80&w=2076&auto=format&fit=crop',
    videoUrl: 'https://drive.google.com/file/d/1TJakoWL-PP4ZJw_mrFBcYgN34QSzcwB_/view',
    category: 'Premium',
    year: '2026',
    duration: '02:45',
    rating: 'U',
    views: '5K',
    uploadedAt: 'Just now',
    channelName: 'Vaagai Media',
    channelAvatar: 'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/Lion-icon_cxqtdq.png',
    subscribers: '1M',
    language: 'tamil'
  },
  {
    id: 'vid-4',
    title: 'Behind the Scenes: Vaagai',
    description: 'See what goes on behind the cameras of our biggest productions.',
    thumbnail: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059&auto=format&fit=crop',
    videoUrl: 'https://drive.google.com/file/d/1-dc6kxO4XTq9UL-Tvk2JSUuDT4lRGUT5/view',
    category: 'Trending',
    year: '2026',
    duration: '12:20',
    rating: 'U/A',
    views: '15K',
    uploadedAt: '2 days ago',
    channelName: 'Vaagai Media',
    channelAvatar: 'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/Lion-icon_cxqtdq.png',
    subscribers: '1M',
    language: 'tamil'
  }
];

export default function App() {
  const [appState, setAppState] = useState<'splash' | 'login' | 'profile_setup' | 'language' | 'profile_selection' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'myspace'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isTamilanPlanActive, setIsTamilanPlanActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      
      if (!currentUser) {
        setUserProfile(null);
        if (appState !== 'splash') {
          setAppState('login');
        }
      }
    });

    const savedLanguage = localStorage.getItem('vaagai_language');
    if (savedLanguage) {
      setSelectedLanguage(savedLanguage);
    }

    return () => unsubscribe();
  }, []); // Run once on mount

  // Handle auto-navigation when user is logged in and at login state
  useEffect(() => {
    if (user && appState === 'login') {
      handlePostLoginNavigation(user);
    }
  }, [user, appState]);

  const handlePostLoginNavigation = async (currentUser?: User | null) => {
    const activeUser = currentUser || auth.currentUser;
    if (!activeUser) {
      setAppState('login');
      return;
    }

    try {
      const savedLanguage = localStorage.getItem('vaagai_language');
      if (!savedLanguage) {
        setAppState('language');
        return;
      }

      setSelectedLanguage(savedLanguage);

      // Check if user has a profile
      const userDoc = await getDoc(doc(db, 'users', activeUser.uid));
      
      if (!userDoc.exists()) {
        setAppState('profile_setup');
        return;
      }

      setUserProfile(userDoc.data() as UserProfile);
      setAppState('profile_selection');
    } catch (error) {
      console.error('Error in post-login navigation:', error);
      // If we can't check profile, maybe something is wrong with rules or connection
      // For now, let's try to go to profile setup as a fallback if they are logged in
      setAppState('profile_setup');
    }
  };

  const filteredVideos = MOCK_VIDEOS.filter(video => 
    video.language === selectedLanguage &&
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
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
        );
      case 'search':
        return (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center py-40">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
              <Compass className="w-10 h-10 text-gray-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">Search Content</h2>
            <p className="text-gray-500 max-w-xs">Looking for movies, shows or channels? Use the search bar above.</p>
          </div>
        );
      case 'myspace':
        return (
          <MySpace 
            userProfile={userProfile} 
            watchlist={MOCK_VIDEOS.slice(0, 3)} 
            isTamilanPlanActive={isTamilanPlanActive}
          />
        );
      default:
        return null;
    }
  };

  if (appState === 'splash') {
    return (
      <SplashScreen 
        onFinish={() => {
          if (auth.currentUser) {
            handlePostLoginNavigation();
          } else {
            setAppState('login');
          }
        }} 
      />
    );
  }

  if (appState === 'login') {
    return (
      <Login 
        onLoginSuccess={(loggedUser) => {
          handlePostLoginNavigation(loggedUser);
        }} 
      />
    );
  }

  if (appState === 'profile_selection') {
    return (
      <ProfileSelection 
        userProfile={userProfile}
        onSelect={() => setAppState('main')}
      />
    );
  }

  if (appState === 'profile_setup') {
    return (
      <UserProfileSetup 
        onComplete={async () => {
          if (auth.currentUser) {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (userDoc.exists()) {
              setUserProfile(userDoc.data() as UserProfile);
            }
          }
          setAppState('main');
        }} 
      />
    );
  }

  if (appState === 'language') {
    return (
      <LanguageSelector 
        onSelect={async (lang) => {
          setSelectedLanguage(lang);
          localStorage.setItem('vaagai_language', lang);
          
          if (auth.currentUser) {
            const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
            if (!userDoc.exists()) {
              setAppState('profile_setup');
            } else {
              setUserProfile(userDoc.data() as UserProfile);
              setAppState('main');
            }
          } else {
            setAppState('login');
          }
        }} 
      />
    );
  }

  return (
    <div id="youtube-root" className="min-h-screen bg-bg-dark text-white font-sans flex flex-col h-screen overflow-hidden">
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {activeTab !== 'myspace' && (
          <Navbar 
            userProfile={userProfile}
            isTamilanPlanActive={isTamilanPlanActive} 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
        )}
        
        <div className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>

        <BottomNav 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
          userProfile={userProfile}
        />
      </main>

      {/* Video Player Detail Page */}
      <VideoPlayer 
        video={selectedVideo} 
        onClose={() => setSelectedVideo(null)} 
        isTamilanPlanActive={isTamilanPlanActive}
        onPlanActive={() => setIsTamilanPlanActive(true)}
        onNextVideo={() => {
          if (!selectedVideo) return;
          const currentIndex = MOCK_VIDEOS.findIndex(v => v.id === selectedVideo.id);
          const nextIndex = (currentIndex + 1) % MOCK_VIDEOS.length;
          setSelectedVideo(MOCK_VIDEOS[nextIndex]);
        }}
      />
    </div>
  );
}

