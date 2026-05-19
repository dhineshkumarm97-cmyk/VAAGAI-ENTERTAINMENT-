import React, { useState, useRef, useEffect } from 'react';
import { Search, Video, Mic, ChevronLeft, LogOut, Info, Clock, X, Sparkles, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { auth } from '../lib/firebase';

interface NavbarProps {
  userProfile: UserProfile | null;
  isTamilanPlanActive: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenAbout?: () => void;
  activeTab?: string;
  searchHistory?: string[];
  onSearchSubmit?: (query: string) => void;
  isAISearching?: boolean;
}

export default function Navbar({ 
  userProfile,
  isTamilanPlanActive, 
  searchQuery, 
  onSearchChange,
  onOpenAbout,
  activeTab,
  searchHistory = [],
  onSearchSubmit,
  isAISearching
}: NavbarProps) {
  const [isMobileSearchVisible, setIsMobileSearchVisible] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowHistory(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchSubmit = (query: string) => {
    if (onSearchSubmit) {
      onSearchSubmit(query);
    }
    setShowHistory(false);
    if (isMobileSearchVisible) setIsMobileSearchVisible(false);
  };

  return (
    <nav
      id="main-nav"
      className="sticky top-0 w-full z-40 bg-bg-dark flex items-center justify-between px-4 md:px-6 h-16 border-b border-white/5"
    >
      <div className={`flex items-center gap-4 ${isMobileSearchVisible ? 'hidden sm:flex' : 'flex'}`}>
        <motion.div 
          className="text-xl font-display font-bold text-white cursor-pointer tracking-tighter flex items-center gap-2 md:hidden"
        >
          <div className="w-7 h-7 rounded bg-brand-primary flex items-center justify-center font-black text-lg italic">V</div>
          VAAGAI
        </motion.div>
        
        {isTamilanPlanActive && (
          <div className="hidden lg:flex items-center px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full">
            <span className="text-[10px] font-black text-brand-primary tracking-widest uppercase">Tamilan Plan Active</span>
          </div>
        )}
      </div>

      <div className={`${isMobileSearchVisible ? 'flex gap-2' : 'hidden md:flex md:gap-4'} flex-1 max-w-2xl items-center px-2 md:px-8 relative`} ref={containerRef}>
        {isMobileSearchVisible && (
          <button 
            onClick={() => setIsMobileSearchVisible(false)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <div className="flex-1 relative">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSearchSubmit(searchQuery);
            }}
            className="flex flex-1 items-center bg-gray-900 border border-white/10 rounded-full overflow-hidden focus-within:border-blue-500 transition-colors"
          >
            <input 
              type="text" 
              placeholder="Search" 
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              onFocus={() => setShowHistory(true)}
              className="flex-1 bg-transparent px-4 py-2 outline-none text-white text-sm"
              autoFocus={isMobileSearchVisible}
            />
            <button 
              type="submit"
              disabled={isAISearching}
              className="px-5 bg-white/5 border-l border-white/10 hover:bg-white/10 transition-colors relative group disabled:opacity-50"
            >
              {isAISearching ? (
                <Loader2 className="w-5 h-5 text-brand-primary animate-spin" />
              ) : (
                <>
                  <Search className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                  <Sparkles className="w-3 h-3 text-brand-primary absolute top-2 right-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </>
              )}
            </button>
          </form>

          {/* Search History Dropdown */}
          <AnimatePresence>
            {showHistory && searchHistory.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a2e] border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50"
              >
                <div className="py-2">
                  <h3 className="px-4 py-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Recent Searches</h3>
                  {searchHistory.map((term, index) => (
                    <button
                      key={`${term}-${index}`}
                      onClick={() => handleSearchSubmit(term)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-left transition-colors group"
                    >
                      <Clock className="w-4 h-4 text-gray-500 group-hover:text-brand-primary" />
                      <span className="text-sm font-medium text-gray-300 group-hover:text-white">{term}</span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <div className={`flex items-center gap-2 md:gap-4 ${isMobileSearchVisible ? 'hidden sm:flex' : 'flex'}`}>
        {activeTab === 'home' && (
          <button 
            onClick={onOpenAbout}
            className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95"
            title="About VAAGAI"
          >
            <Info className="w-6 h-6" />
          </button>
        )}
        
        <button 
          onClick={() => setIsMobileSearchVisible(true)}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-full"
        >
          <Search className="w-6 h-6" />
        </button>

        {/* No profile or logout here, they are in My Space now */}
      </div>
    </nav>
  );
}
