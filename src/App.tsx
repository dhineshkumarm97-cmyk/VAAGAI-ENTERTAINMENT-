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
import Monetization from './components/Monetization';
import ProfileSelection from './components/ProfileSelection';
import AboutModal from './components/AboutModal';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { Home, Compass, PlaySquare, MoreVertical, LogOut, Loader2, ShieldCheck, Search, Sparkles } from 'lucide-react';
import { Video, UserProfile } from './types';
import { fetchVideos, checkIfAdmin } from './services/firebaseService';
import { AdminDashboard } from './components/AdminDashboard';
import ResolvedImage from './components/ResolvedImage';

export default function App() {
  const [appState, setAppState] = useState<'splash' | 'login' | 'profile_setup' | 'language' | 'profile_selection' | 'main'>('splash');
  const [activeTab, setActiveTab] = useState<'home' | 'search' | 'myspace' | 'admin' | 'monetization'>('home');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedLanguage, setSelectedLanguage] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
  const [isTamilanPlanActive, setIsTamilanPlanActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAboutOpen, setIsAboutOpen] = useState(false);
  const [searchHistory, setSearchHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('vaagai_search_history');
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem('vaagai_search_history', JSON.stringify(searchHistory));
  }, [searchHistory]);

  const addToSearchHistory = (query: string) => {
    if (!query.trim()) return;
    setSearchHistory(prev => {
      const filtered = prev.filter(item => item.toLowerCase() !== query.toLowerCase());
      return [query, ...filtered].slice(0, 10);
    });
  };

  const loadVideos = async () => {
    setIsLoadingVideos(true);
    try {
      const data = await fetchVideos();
      // Load all videos into state to allow flexible local filtering
      setVideos(data);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, [selectedLanguage]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setDebouncedSearchQuery('');
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setIsSearching(false);
    }, 500);

    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    if (!isLoadingVideos && videos.length > 0) {
      const params = new URLSearchParams(window.location.search);
      const videoId = params.get('v');
      if (videoId) {
        const video = videos.find(v => v.id === videoId);
        if (video) {
          setSelectedVideo(video);
          setAppState('main'); // Ensure we are in main state to show player
        }
      }
    }
  }, [isLoadingVideos, videos]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      
      if (currentUser) {
        // Auth success, check admin
        const adminStatus = await checkIfAdmin(currentUser.uid);
        // Direct email check as backup bootstrap
        if (currentUser.email === 'dhineshkumarm97@gmail.com') {
          setIsAdmin(true);
        } else {
          setIsAdmin(adminStatus);
        }
      } else {
        setUserProfile(null);
        setIsAdmin(false);
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
  }, []);
 // Run once on mount

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
      const userPath = `users/${activeUser.uid}`;
      let userDoc;
      try {
        userDoc = await getDoc(doc(db, 'users', activeUser.uid));
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, userPath);
        return;
      }
      
      if (!userDoc.exists()) {
        setAppState('profile_setup');
        return;
      }

      const profileData = userDoc.data() as UserProfile;
      setUserProfile(profileData);
      setIsTamilanPlanActive(!!profileData.isTamilanPlanActive);
      setAppState('profile_selection');
    } catch (error) {
      console.error('Error in post-login navigation:', error);
      // If we can't check profile, maybe something is wrong with rules or connection
      // For now, let's try to go to profile setup as a fallback if they are logged in
      setAppState('profile_setup');
    }
  };

  useEffect(() => {
    if (activeTab === 'home') {
      loadVideos();
    }
  }, [activeTab]);

  const filteredVideos = videos.filter(video => {
    const query = debouncedSearchQuery.toLowerCase();
    const matchesSearch = video.title.toLowerCase().includes(query) || 
                         video.description?.toLowerCase().includes(query);
    
    // If there is a search query, show all matching videos regardless of language to be more inclusive
    if (debouncedSearchQuery.trim() !== '') {
      return matchesSearch;
    }
    
    // Otherwise, show videos for the selected language
    return video.language === selectedLanguage;
  });

  const searchSuggestions = searchQuery.trim() !== '' 
    ? videos
        .filter(v => v.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .slice(0, 5)
    : [];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'home':
        if (isLoadingVideos) {
          return (
            <div className="flex-1 flex flex-col items-center justify-center py-40">
              <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
              <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching your movies...</p>
            </div>
          );
        }
        return (
          <div className="p-4 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 pb-24">
            {/* AI Indicator */}
            <a 
              href="https://ais-dev-pvrxy3ot5rfdbkck6rqri5-650106038083.asia-east1.run.app"
              target="_blank"
              rel="noopener noreferrer"
              className="fixed bottom-24 right-6 z-[90] bg-black/40 backdrop-blur-md rounded-full p-6 border border-white/20 shadow-2xl hover:scale-110 transition-transform shadow-brand-primary/20"
            >
              <Sparkles className="w-14 h-14 text-brand-primary" />
            </a>
            {filteredVideos.length > 0 ? (
              filteredVideos.map((video) => (
                <div 
                  key={video.id} 
                  className="flex flex-col gap-3 group cursor-pointer"
                  onClick={() => setSelectedVideo(video)}
                >
                <div className="aspect-video relative rounded-2xl overflow-hidden bg-gray-800">
                  <ResolvedImage 
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
          <div className="flex-1 overflow-y-auto pb-24">
            {searchQuery.trim() === '' ? (
              <div className="flex-1 flex flex-col items-center justify-center p-6 text-center py-40">
                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-4">
                  <Search className="w-10 h-10 text-gray-600" />
                </div>
                <h2 className="text-xl font-bold mb-2 uppercase tracking-tight">Discover VAAGAI Content</h2>
                <p className="text-gray-500 max-w-xs font-medium">Looking for movies, shows or channels? Type in the search bar above to start your cinematic journey.</p>
              </div>
            ) : (
              <div className="p-4 md:p-8">
                {/* Instant Suggestions */}
                {!debouncedSearchQuery && searchQuery && (
                  <div className="mb-8 bg-white/5 rounded-3xl p-6 border border-white/5 animate-pulse">
                    <h3 className="text-xs font-black text-gray-500 uppercase tracking-widest mb-4">Suggestions...</h3>
                    <div className="space-y-4">
                      {searchSuggestions.map(v => (
                        <div 
                          key={v.id} 
                          className="flex items-center gap-3 cursor-pointer hover:text-brand-primary"
                          onClick={() => {
                            setSearchQuery(v.title);
                            setDebouncedSearchQuery(v.title);
                          }}
                        >
                          <Search className="w-3.5 h-3.5 text-brand-primary" />
                          <span className="text-sm font-bold">{v.title}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <h2 className="text-lg font-black uppercase tracking-widest text-brand-primary">
                      {isSearching ? 'Searching...' : 'Search Results'}
                    </h2>
                    {isSearching && <Loader2 className="w-4 h-4 text-brand-primary animate-spin" />}
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase">{filteredVideos.length} found</span>
                </div>
                
                {isSearching ? (
                  <div className="py-20 flex flex-col items-center justify-center">
                    <div className="w-16 h-16 border-4 border-brand-primary/20 border-t-brand-primary rounded-full animate-spin mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Scanning the library...</p>
                  </div>
                ) : filteredVideos.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredVideos.map((video) => (
                      <div 
                        key={video.id} 
                        className="flex flex-col gap-3 group cursor-pointer"
                        onClick={() => setSelectedVideo(video)}
                      >
                        <div className="aspect-video relative rounded-2xl overflow-hidden bg-gray-800">
                          <ResolvedImage 
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
                            <div className="flex items-center gap-2 text-xs text-gray-400">
                              <span>{video.views} views</span>
                              <span>•</span>
                              <span className="uppercase text-[9px] font-black text-brand-primary/80">{video.language}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-20 flex flex-col items-center justify-center text-gray-500 gap-4">
                    <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                      <Compass className="w-10 h-10" />
                    </div>
                    <p className="text-lg font-black uppercase tracking-tight text-white">No results found</p>
                    <p className="text-sm text-gray-500 italic font-medium">Try different keywords or check your spelling.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'myspace':
        return (
          <MySpace 
            userProfile={userProfile} 
            watchlist={videos.slice(0, 3)} 
            isTamilanPlanActive={isTamilanPlanActive}
            onNavigateToMonetization={() => setActiveTab('monetization')}
            onClearLocalVideos={loadVideos}
            onOpenAbout={() => setIsAboutOpen(true)}
          />
        );
      case 'monetization':
        return <Monetization />;
      case 'admin':
        return <AdminDashboard onRefresh={loadVideos} />;
      default:
        return null;
    }
  };

  if (appState === 'splash') {
    return (
      <SplashScreen 
        onFinish={() => {
          const savedLanguage = localStorage.getItem('vaagai_language');
          if (savedLanguage) {
            setSelectedLanguage(savedLanguage);
            if (auth.currentUser) {
              handlePostLoginNavigation();
            } else {
              setAppState('login');
            }
          } else {
            setAppState('language');
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
            const userPath = `users/${auth.currentUser.uid}`;
            try {
              const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
              if (userDoc.exists()) {
                const profileData = userDoc.data() as UserProfile;
                setUserProfile(profileData);
                setIsTamilanPlanActive(!!profileData.isTamilanPlanActive);
              }
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, userPath);
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
            const userPath = `users/${auth.currentUser.uid}`;
            try {
              const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
              if (!userDoc.exists()) {
                setAppState('profile_setup');
              } else {
                const profileData = userDoc.data() as UserProfile;
                setUserProfile(profileData);
                setIsTamilanPlanActive(!!profileData.isTamilanPlanActive);
                setAppState('main');
              }
            } catch (error) {
              handleFirestoreError(error, OperationType.GET, userPath);
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
        {!selectedVideo && activeTab !== 'myspace' && (
          <Navbar 
            userProfile={userProfile}
            isTamilanPlanActive={isTamilanPlanActive} 
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenAbout={() => setIsAboutOpen(true)}
            activeTab={activeTab}
            searchHistory={searchHistory}
            onSearchSubmit={(query) => {
              addToSearchHistory(query);
              setSearchQuery(query);
              setActiveTab('search');
            }}
          />
        )}
        
        <div className="flex-1 overflow-y-auto">
          {renderTabContent()}
        </div>

        {!selectedVideo && (
          <BottomNav 
            activeTab={activeTab as any} 
            onTabChange={setActiveTab as any} 
            userProfile={userProfile}
            isAdmin={isAdmin}
          />
        )}
      </main>

      {/* Video Player Detail Page */}
      <VideoPlayer 
        video={selectedVideo} 
        onClose={() => setSelectedVideo(null)} 
        isTamilanPlanActive={isTamilanPlanActive}
        onPlanActive={async () => {
          setIsTamilanPlanActive(true);
          if (auth.currentUser) {
            const userPath = `users/${auth.currentUser.uid}`;
            try {
              await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                isTamilanPlanActive: true,
                updatedAt: new Date().toISOString()
              });
            } catch (err) {
              handleFirestoreError(err, OperationType.UPDATE, userPath);
            }
          }
        }}
        initialLanguage={selectedLanguage}
        onNextVideo={() => {
          if (!selectedVideo) return;
          const currentIndex = videos.findIndex(v => v.id === selectedVideo.id);
          const nextIndex = (currentIndex + 1) % videos.length;
          setSelectedVideo(videos[nextIndex]);
        }}
      />

      <AboutModal isOpen={isAboutOpen} onClose={() => setIsAboutOpen(false)} />
    </div>
  );
}

