import React from 'react';
import { motion } from 'motion/react';
import { Languages, CheckCircle2 } from 'lucide-react';

const LANGUAGES = [
  { id: 'tamil', label: 'Tamil', native: 'தமிழ்', isAvailable: true },
  { id: 'hindi', label: 'Hindi', native: 'हिन्दी', isAvailable: false },
  { id: 'telugu', label: 'Telugu', native: 'తెలుగు', isAvailable: false },
  { id: 'malayalam', label: 'Malayalam', native: 'മലയാളం', isAvailable: false },
  { id: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ', isAvailable: false },
  { id: 'english', label: 'English', native: 'English', isAvailable: false },
];

interface LanguageSelectorProps {
  onSelect: (langId: string) => void;
}

export default function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  const [selected, setSelected] = React.useState<string | null>(null);

  const handleConfirm = () => {
    if (selected === 'tamil') {
      onSelect(selected);
    }
  };

  return (
    <div className="fixed inset-0 bg-bg-dark z-50 flex flex-col items-center justify-center p-6 sm:p-12 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-4xl w-full flex flex-col items-center"
      >
        <h1 className="text-3xl md:text-5xl font-display font-black text-white text-center mb-4 tracking-tight uppercase">
          Select <span className="text-brand-primary italic">Language</span>
        </h1>
        <p className="text-gray-400 text-lg text-center mb-12 max-w-lg font-medium">
          Choose your preferred language to personalize your viewing experience.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-6 w-full max-w-3xl mb-12">
          {LANGUAGES.map((lang) => (
            <motion.button
              key={lang.id}
              whileHover={lang.isAvailable ? { scale: 1.05 } : {}}
              whileTap={lang.isAvailable ? { scale: 0.95 } : {}}
              onClick={() => lang.isAvailable && setSelected(lang.id)}
              className={`relative flex flex-col items-center justify-center p-8 rounded-3xl border-2 transition-all duration-300 ${
                selected === lang.id 
                  ? 'bg-brand-primary/20 border-brand-primary shadow-[0_0_30px_rgba(255,51,51,0.2)]' 
                  : !lang.isAvailable
                    ? 'bg-white/5 border-white/5 opacity-60 grayscale cursor-not-allowed'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10 cursor-pointer'
              }`}
            >
              <span className={`text-2xl font-black mb-1 ${selected === lang.id ? 'text-white' : 'text-white'}`}>
                {lang.native}
              </span>
              <span className="text-sm text-gray-500 font-bold uppercase tracking-widest">
                {lang.label}
              </span>
              
              {!lang.isAvailable && (
                <div className="mt-3 py-1 px-3 bg-black/40 rounded-full border border-white/10">
                  <span className="text-[10px] font-black text-brand-primary uppercase italic tracking-tighter">
                    Coming Soon
                  </span>
                </div>
              )}

              {selected === lang.id && (
                <div className="absolute -top-2 -right-2 bg-brand-primary rounded-full p-1 shadow-lg">
                  <CheckCircle2 className="w-5 h-5 text-white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={selected === 'tamil' ? { scale: 1.02 } : {}}
          whileTap={selected === 'tamil' ? { scale: 0.98 } : {}}
          onClick={handleConfirm}
          disabled={selected !== 'tamil'}
          className={`px-16 py-5 rounded-2xl font-black text-xl tracking-widest uppercase transition-all shadow-2xl ${
            selected === 'tamil'
              ? 'bg-brand-primary text-white cursor-pointer hover:shadow-brand-primary/30' 
              : 'bg-white/5 text-white/20 cursor-not-allowed'
          }`}
        >
          Get Started
        </motion.button>
      </motion.div>
    </div>
  );
}
