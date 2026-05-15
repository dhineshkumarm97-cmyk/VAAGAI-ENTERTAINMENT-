import React from 'react';
import { Settings, HelpCircle, ChevronRight, Plus, Edit2, Play, Bell } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile, Video } from '../types';
import { auth } from '../lib/firebase';

interface MySpaceProps {
  userProfile: UserProfile | null;
  watchlist: Video[];
  isTamilanPlanActive: boolean;
}

export default function MySpace({ userProfile, watchlist, isTamilanPlanActive }: MySpaceProps) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pt-6 pb-24">
      {/* Header */}
      <div className="px-5 flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-brand-primary font-bold">V</span>
          </div>
        </div>
        <button className="flex items-center gap-2 text-gray-400 text-sm font-medium hover:text-white transition-colors">
          <Settings className="w-5 h-5" />
          <span>Help & Settings</span>
        </button>
      </div>

      {/* Profiles */}
      <div className="px-5 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Profiles</h2>
          <button className="flex items-center gap-1.5 text-gray-400 text-xs hover:text-white transition-colors">
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit</span>
          </button>
        </div>
        <div className="flex gap-6 overflow-x-auto pb-2 scrollbar-none">
          {/* Main User */}
          <div className="flex flex-col items-center gap-2 min-w-[72px]">
            <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-brand-primary to-blue-500">
              <div className="w-full h-full rounded-full border-2 border-[#0a0a0f] overflow-hidden">
                <img src={userProfile?.avatarUrl} alt="You" className="w-full h-full object-cover" />
              </div>
            </div>
            <span className="text-xs font-medium text-gray-400">You</span>
          </div>

          {/* Kids Profile (Static placeholder standard for hotstar style) */}
          <div className="flex flex-col items-center gap-2 min-w-[72px]">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center shadow-lg">
              <span className="text-sm font-black italic">KIDS</span>
            </div>
            <span className="text-xs font-medium text-gray-400">Kids</span>
          </div>

          {/* Add Profile */}
          <button className="flex flex-col items-center gap-2 min-w-[72px]">
            <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-white transition-colors">
              <Plus className="w-8 h-8" />
            </div>
            <span className="text-xs font-medium text-gray-400">Add</span>
          </button>
        </div>
      </div>

      {/* Notifications Section */}
      <div className="px-5 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            Notifications
          </h2>
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </div>
        <div className="bg-[#161621] rounded-xl p-5 border border-white/5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-brand-primary/10 rounded-full flex items-center justify-center text-brand-primary">
              <Bell className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-200 mb-2">YOU'RE ALL CAUGHT UP</p>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">Enable notifications to stay updated on new content releases and offers.</p>
              <button className="text-xs font-bold bg-white/5 border border-white/10 px-4 py-2 rounded-lg hover:bg-white/10 transition-colors">
                ALLOW
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Watchlist */}
      <div className="px-5 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Watchlist</h2>
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-none">
          {watchlist.map((video) => (
            <motion.div 
              key={video.id}
              className="flex-shrink-0 w-32 aspect-[2/3] rounded-lg overflow-hidden relative group"
              whileHover={{ scale: 1.05 }}
            >
              <img 
                src={video.thumbnail} 
                alt={video.title} 
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Play className="w-8 h-8 fill-brand-primary text-brand-primary" />
              </div>
            </motion.div>
          ))}
          {watchlist.length === 0 && (
             <div className="w-full py-10 flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-2xl bg-white/[0.02]">
                <p className="text-sm text-gray-500">Your watchlist is empty</p>
             </div>
          )}
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-5">
        <button 
          onClick={() => auth.signOut()}
          className="w-full py-4 rounded-xl border border-white/10 text-gray-400 font-medium hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2"
        >
          Log Out
        </button>
      </div>
    </div>
  );
}
