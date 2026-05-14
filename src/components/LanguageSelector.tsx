import React from 'react';
import { motion } from 'motion/react';
import { Languages, CheckCircle2 } from 'lucide-react';

const LANGUAGES = [
  { id: 'tamil', label: 'Tamil', native: 'தமிழ்' },
  { id: 'hindi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'telugu', label: 'Telugu', native: 'తెలుగు' },
  { id: 'malayalam', label: 'Malayalam', native: 'മലയാളം' },
  { id: 'kannada', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { id: 'bengali', label: 'Bengali', native: 'বাংলা' },
  { id: 'punjabi', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
  { id: 'gujarati', label: 'Gujarati', native: 'ગુજરાતી' },
  { id: 'marathi', label: 'Marathi', native: 'मराठी' },
  { id: 'odia', label: 'Odia', native: 'ଓଡ଼ିଆ' },
  { id: 'assamese', label: 'Assamese', native: 'অসমীয়া' },
  { id: 'sanskrit', label: 'Sanskrit', native: 'संस्कृतम्' },
  { id: 'kashmiri', label: 'Kashmiri', native: 'कॉशुर' },
  { id: 'konkani', label: 'Konkani', native: 'कोंकणी' },
  { id: 'nepali', label: 'Nepali', native: 'नेपाली' },
  { id: 'sindhi', label: 'Sindhi', native: 'سنڌي' },
  { id: 'urdu', label: 'Urdu', native: 'اردू' },
];

interface LanguageSelectorProps {
  onSelect: (langId: string) => void;
}

export default function LanguageSelector({ onSelect }: LanguageSelectorProps) {
  const [selected, setSelected] = React.useState<string | null>(null);

  const handleConfirm = () => {
    if (selected) {
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


        <h1 className="text-3xl md:text-5xl font-display font-black text-white text-center mb-4 tracking-tight">
          Select Your <span className="text-brand-primary">Language</span>
        </h1>
        <p className="text-gray-400 text-lg text-center mb-12 max-w-lg">
          Personalize your experience by choosing your preferred language for content.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 w-full mb-12">
          {LANGUAGES.map((lang) => (
            <motion.button
              key={lang.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelected(lang.id)}
              className={`relative flex flex-col items-center justify-center p-6 rounded-2xl border-2 transition-all duration-300 ${
                selected === lang.id 
                  ? 'bg-brand-primary/20 border-brand-primary shadow-lg shadow-brand-primary/10' 
                  : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
              }`}
            >
              <span className={`text-xl font-bold mb-1 ${selected === lang.id ? 'text-brand-primary' : 'text-white'}`}>
                {lang.native}
              </span>
              <span className="text-xs text-gray-400 font-medium">
                {lang.label}
              </span>
              {selected === lang.id && (
                <div className="absolute top-2 right-2">
                  <CheckCircle2 className="w-4 h-4 text-brand-primary" />
                </div>
              )}
            </motion.button>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleConfirm}
          disabled={!selected}
          className={`px-12 py-4 rounded-full font-black text-lg tracking-widest uppercase transition-all shadow-2xl ${
            selected 
              ? 'bg-brand-primary text-white cursor-pointer' 
              : 'bg-white/10 text-white/30 cursor-not-allowed'
          }`}
        >
          Continue
        </motion.button>
      </motion.div>
    </div>
  );
}
