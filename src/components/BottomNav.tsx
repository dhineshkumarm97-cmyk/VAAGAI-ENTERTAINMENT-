import React from 'react';
import { Search, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile } from '../types';

interface BottomNavProps {
  activeTab: 'home' | 'search' | 'myspace';
  onTabChange: (tab: 'home' | 'search' | 'myspace') => void;
  userProfile: UserProfile | null;
}

export default function BottomNav({ activeTab, onTabChange, userProfile }: BottomNavProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#0a0a14]/95 backdrop-blur-lg border-t border-white/5 pb-safe">
      {/* Decorative Glow Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand-primary/40 to-transparent" />
      
      <div className="max-w-md mx-auto px-6 h-16 flex items-center justify-between">
        <button 
          onClick={() => onTabChange('search')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'search' ? 'text-white' : 'text-gray-400'
          }`}
        >
          <Search className="w-6 h-6" />
          <span className="text-[10px] font-medium">Search</span>
        </button>

        <button 
          onClick={() => onTabChange('home')}
          className={`relative flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'home' ? 'text-white' : 'text-gray-400'
          }`}
        >
          {activeTab === 'home' && (
            <motion.div 
              layoutId="nav-bg"
              className="absolute -top-1 w-10 h-10 bg-brand-primary/20 blur-xl rounded-full"
            />
          )}
          <Sparkles className={`w-8 h-8 ${activeTab === 'home' ? 'text-white fill-white' : ''}`} />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button 
          onClick={() => onTabChange('myspace')}
          className={`flex flex-col items-center justify-center gap-1 transition-colors ${
            activeTab === 'myspace' ? 'text-white' : 'text-gray-400'
          }`}
        >
          <div className={`w-6 h-6 rounded-full overflow-hidden border-2 ${
            activeTab === 'myspace' ? 'border-brand-primary' : 'border-transparent'
          }`}>
            {userProfile ? (
              <img src={userProfile.avatarUrl} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-700" />
            )}
          </div>
          <span className="text-[10px] font-medium">My Space</span>
        </button>
      </div>
    </div>
  );
}
