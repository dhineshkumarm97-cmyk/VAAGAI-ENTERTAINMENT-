import React from 'react';
import { Settings, HelpCircle, ChevronRight, Plus, Edit2, Play, Bell, DollarSign, Star, ShieldCheck, Loader2, Eraser } from 'lucide-react';
import { motion } from 'motion/react';
import { UserProfile, Video } from '../types';
import { auth } from '../lib/firebase';
import ResolvedImage from './ResolvedImage';
import { clearAllLocalFiles } from '../lib/db';

interface MySpaceProps {
  userProfile: UserProfile | null;
  watchlist: Video[];
  isTamilanPlanActive: boolean;
  onNavigateToMonetization?: () => void;
  onClearLocalVideos?: () => void;
  onOpenAbout?: () => void;
}

export default function MySpace({ userProfile, watchlist, isTamilanPlanActive, onNavigateToMonetization, onClearLocalVideos, onOpenAbout }: MySpaceProps) {
  const [isClearing, setIsClearing] = React.useState(false);

  const handleClearLocal = async () => {
    if (window.confirm('Clear app local cache and temporary files?')) {
      setIsClearing(true);
      await clearAllLocalFiles();
      if (onClearLocalVideos) onClearLocalVideos();
      setIsClearing(false);
      alert('Local storage cleared.');
    }
  };
  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white pt-6 pb-24">
      {/* Header */}
      <div className="px-5 flex items-center justify-between mb-8">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-brand-primary/20 rounded-lg flex items-center justify-center">
            <span className="text-brand-primary font-bold">V</span>
          </div>
        </div>
        <button 
          onClick={onOpenAbout}
          className="flex items-center gap-2 text-gray-400 text-sm font-medium hover:text-white transition-colors"
        >
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
                <ResolvedImage src={userProfile?.avatarUrl || ''} alt="You" className="w-full h-full object-cover" />
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

      {/* TAMILAN PLAN - New Section */}
      <div className="px-5 mb-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold">Your Plan</h2>
        </div>
        <div 
          className={`rounded-2xl p-6 border transition-all ${
            isTamilanPlanActive 
              ? 'bg-green-500/10 border-green-500/30' 
              : 'bg-brand-primary/10 border-brand-primary/30'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                isTamilanPlanActive ? 'bg-green-500' : 'bg-brand-primary'
              }`}>
                {isTamilanPlanActive ? <ShieldCheck className="w-6 h-6 text-white" /> : <Star className="w-6 h-6 text-white" />}
              </div>
              <div>
                <h3 className="font-black text-white uppercase tracking-tighter">Tamilan Plan</h3>
                <p className="text-xs text-gray-400 font-medium">
                  {isTamilanPlanActive 
                    ? 'Lifetime Free Access • Ad-free' 
                    : 'Unlock Free Ad-free Streaming'}
                </p>
              </div>
            </div>
            {!isTamilanPlanActive && (
              <button 
                onClick={() => {
                  // Since we are in MySpace, we need a way to open the VideoPlayer subscription modal or just the quiz.
                  // For now, I'll alert the user to take the test in the video player or I can implement a way to trigger it here.
                  // But the simplest is to just mention it's active in the video player.
                  // Actually, let's make it so they can trigger it here too.
                  // But MySpace doesn't have the VideoPlayer context.
                  window.dispatchEvent(new CustomEvent('open-tamilan-quiz'));
                }}
                className="bg-brand-primary text-white text-[10px] font-black px-4 py-2 rounded-lg uppercase tracking-widest shadow-lg active:scale-95 transition-all"
              >
                Activate Free
              </button>
            )}
            {isTamilanPlanActive && (
              <span className="text-green-500 text-[10px] font-black uppercase tracking-widest">Active</span>
            )}
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
              <ResolvedImage 
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
      <div className="px-5 space-y-3">
        <button 
          onClick={handleClearLocal}
          disabled={isClearing}
          className="w-full py-4 rounded-xl border border-white/5 text-gray-500 font-medium hover:bg-white/5 hover:text-white transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {isClearing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Clearing Cache...</span>
            </>
          ) : (
            <>
              <Eraser className="w-4 h-4" />
              <span>Clear App Cache</span>
            </>
          )}
        </button>

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
