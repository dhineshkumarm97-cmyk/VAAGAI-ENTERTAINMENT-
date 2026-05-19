import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ShieldCheck, Cpu, Globe, Youtube, Sparkles } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AboutModal({ isOpen, onClose }: AboutModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative w-full max-w-sm bg-[#0a0a0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-[0_0_50px_rgba(0,0,0,0.5)]"
          >
            {/* Close Icon (hidden in original image, but practical. Actually the image has an 'X' icon top right) */}
            <button 
              onClick={onClose}
              className="absolute top-6 right-6 text-gray-500 hover:text-white transition-colors z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="p-8 md:p-10 flex flex-col items-center">
              {/* Logo Section */}
              <div className="w-20 h-20 bg-black rounded-3xl border border-white/10 flex flex-col items-center justify-center mb-6 shadow-2xl relative group">
                <div className="absolute inset-0 bg-brand-primary/5 blur-xl group-hover:bg-brand-primary/10 transition-colors rounded-full" />
                <span className="text-3xl font-black text-white italic leading-none">V</span>
                <span className="text-[8px] font-black tracking-[0.2em] text-gray-400 uppercase mt-1">Vaagai</span>
              </div>

              {/* Title Section */}
              <h2 className="text-4xl font-black text-white italic tracking-tighter uppercase mb-1">
                VAAGAI <span className="text-brand-primary">CINEMA</span>
              </h2>
              <p className="text-[10px] font-black tracking-[0.3em] text-brand-primary/60 uppercase mb-10">
                Next • Gen • Entertainment
              </p>

              {/* Version & Foundation Info */}
              <div className="w-full space-y-3 mb-8">
                <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Version</span>
                  <span className="bg-white/10 text-white px-3 py-1 rounded-full text-[11px] font-black tracking-tight border border-white/10 shadow-lg">
                    v4.2.0-ULTRA
                  </span>
                </div>
                <div className="flex items-center justify-between bg-white/5 border border-white/5 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Foundation</span>
                  <span className="text-white text-[11px] font-black tracking-widest uppercase">
                    VAAGAI FLASH-5.0
                  </span>
                </div>
              </div>

              {/* Engineering Section */}
              <div className="w-full mb-6">
                <div className="bg-brand-primary/5 border border-brand-primary/20 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Cpu className="w-12 h-12 text-brand-primary" />
                  </div>
                  <h4 className="text-[9px] font-black text-brand-primary uppercase tracking-[0.2em] mb-2">
                    Architectural Engineering
                  </h4>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">
                    VAAGAI DEVELOPMENT COMPANY
                  </h3>
                  <p className="text-[10px] font-bold text-brand-primary/80 mb-3">
                    OWNER: MR.M.DHINESH KUMAR
                  </p>
                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-wider">
                    SECURE BOOT • AUTHENTIC TAMIL LOGIC • CLOUD SCALE
                  </p>
                </div>
              </div>

              {/* Media Section */}
              <div className="w-full mb-10">
                <div className="bg-blue-500/5 border border-blue-500/20 rounded-2xl p-5 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
                    <Globe className="w-12 h-12 text-blue-500" />
                  </div>
                  <h4 className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-2">
                    Digital Media Presence
                  </h4>
                  <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">
                    MURUGAN SOUTH INDIA DEVOTIONAL
                  </h3>
                  <p className="text-[10px] font-bold text-blue-400/80 mb-3 uppercase">
                    OFFICIAL YOUTUBE CHANNEL OWNER
                  </p>
                  <p className="text-[8px] font-black text-gray-600 uppercase tracking-wider">
                    SPIRITUAL CONTENT • DEVOTIONAL MEDIA • SOUTH INDIA
                  </p>
                </div>
              </div>

              {/* Dismiss Button */}
              <button
                onClick={onClose}
                className="w-full bg-white text-black py-4 rounded-xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all hover:bg-gray-100"
              >
                Dismiss
              </button>

              {/* Footer */}
              <p className="mt-8 text-[9px] font-black text-gray-700 uppercase tracking-[0.3em]">
                All Rights Reserved © 2026
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
