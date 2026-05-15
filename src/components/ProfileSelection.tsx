import React, { useEffect, useState } from 'react';
import { Edit2, Plus, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';

interface ProfileSelectionProps {
  userProfile: UserProfile | null;
  onSelect: (profile: UserProfile) => void;
}

export default function ProfileSelection({ userProfile, onSelect }: ProfileSelectionProps) {
  const [showToast, setShowToast] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setShowToast(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="flex items-center justify-between mb-12">
          <h1 className="text-2xl font-bold tracking-tight">Who's watching?</h1>
          <button className="flex items-center gap-2 text-gray-400 text-sm font-medium hover:text-white transition-colors">
            <Edit2 className="w-4 h-4" />
            <span>Edit</span>
          </button>
        </div>

        <div className="grid grid-cols-2 gap-8 justify-items-center mb-12">
          {/* Main User Profile */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => userProfile && onSelect(userProfile)}
            className="flex flex-col items-center gap-4 group"
          >
            <div className="w-28 h-28 rounded-full p-[3px] bg-gradient-to-tr from-brand-primary via-blue-500 to-purple-500 shadow-[0_0_30px_rgba(30,215,96,0.2)] group-hover:shadow-[0_0_40px_rgba(30,215,96,0.4)] transition-all">
              <div className="w-full h-full rounded-full border-4 border-[#0a0a0f] overflow-hidden">
                <img 
                  src={userProfile?.avatarUrl} 
                  alt="You" 
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
            <span className="text-lg font-medium text-gray-300 group-hover:text-white transition-colors">You</span>
          </motion.button>

          {/* Kids Profile */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-4 group"
          >
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400 flex items-center justify-center shadow-lg group-hover:brightness-110 transition-all">
              <span className="text-2xl font-black italic tracking-tighter text-white drop-shadow-md">KiDS</span>
            </div>
            <span className="text-lg font-medium text-gray-300 group-hover:text-white transition-colors">Kids</span>
          </motion.button>

          {/* Add Profile */}
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex flex-col items-center gap-4 group col-span-2 mt-4"
          >
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-gray-700 flex items-center justify-center text-gray-500 group-hover:border-gray-400 group-hover:text-white transition-all bg-white/[0.02]">
              <Plus className="w-10 h-10" />
            </div>
            <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">Add</span>
          </motion.button>
        </div>

        {/* Login Success Toast */}
        <AnimatePresence>
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 50 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 bg-[#1a1a2e] border border-white/10 px-6 py-3 rounded-2xl flex items-center gap-3 shadow-2xl z-50 pointer-events-none"
            >
              <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-200">Logged in successfully</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
