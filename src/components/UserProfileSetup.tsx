import React, { useState } from 'react';
import { motion } from 'motion/react';
import { User, Check, Edit2 } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface UserProfileSetupProps {
  onComplete: () => void;
}

const AVATARS = [
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/cute-boy-smiling-cartoon-kawaii-boy-illustration-boy-avatar-happy-kid_1001605-3440_r1l1p0.jpg',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/cute-boy-smiling-cartoon-kawaii-boy-illustration-boy-avatar-happy-kid_1001605-3445_ushdyz.jpg',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809505/cute-adorable-little-girl-character-avatar-isolated_925324-1724_pvwbpk.jpg',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809503/cute-adorable-little-girl-character-avatar-isolated_925324-1728_frboyd.jpg',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/Lion-icon_cxqtdq.png',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/dog-8661433_1280_gvweup.png',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/beautiful-lion-black-background-43713984_um4cmm.jpg',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809503/black-and-white-siberian-kitten-face-vector-50471781_jcj8t8.jpg',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809503/cute-dog-looking-cartoon-vector-icon-illustration-animal-nature-icon-isolated-flat-vector_138676-12277_ixknrc.jpg',
  'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809503/illustration-of-a-grey-cat-with-yellow-eyes-isolated-on-white-background-vector_qmodvz.jpg',
];

export default function UserProfileSetup({ onComplete }: UserProfileSetupProps) {
  const [nickname, setNickname] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(AVATARS[0]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!nickname.trim() || !auth.currentUser) return;

    setIsLoading(true);
    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        uid: auth.currentUser.uid,
        nickname: nickname.trim(),
        avatarUrl: selectedAvatar,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      onComplete();
    } catch (error) {
      console.error('Error saving profile:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden"
      >
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-primary/20 rounded-full blur-[80px]" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-primary/10 rounded-full blur-[80px]" />

        <div className="relative z-10 flex flex-col items-center">
          <h1 className="text-3xl md:text-4xl font-display font-black text-white mb-2 tracking-tight uppercase text-center">
            Set Up Your <span className="text-brand-primary">Profile</span>
          </h1>
          <p className="text-gray-400 font-medium mb-10 text-center max-w-sm">
            Choose an avatar and nickname to represent you on Vaagai.
          </p>

          {/* Avatar Preview */}
          <div className="relative mb-8">
            <div className="w-32 h-32 rounded-full border-4 border-brand-primary p-1 shadow-[0_0_30px_rgba(255,51,51,0.2)]">
              <img 
                src={selectedAvatar} 
                alt="Selected Avatar" 
                className="w-full h-full rounded-full object-cover"
              />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-brand-primary p-2 rounded-full shadow-lg">
              <User className="w-5 h-5 text-white" />
            </div>
          </div>

          {/* Avatar Selection */}
          <div className="grid grid-cols-5 gap-4 mb-10">
            {AVATARS.map((url, index) => (
              <button
                key={index}
                onClick={() => setSelectedAvatar(url)}
                className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all duration-300 transform hover:scale-110 ${
                  selectedAvatar === url ? 'border-brand-primary scale-110' : 'border-transparent'
                }`}
              >
                <img src={url} alt={`Avatar option ${index + 1}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>

          {/* Nickname Input */}
          <div className="w-full max-w-sm space-y-4 mb-10">
            <div className="relative">
              <input
                type="text"
                placeholder="Enter Nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                maxLength={20}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white text-lg font-bold placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/50 transition-all pl-12"
              />
              <Edit2 className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-black text-gray-600 uppercase">
                {nickname.length}/20
              </div>
            </div>
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            disabled={!nickname.trim() || isLoading}
            className={`w-full max-w-sm py-5 rounded-2xl font-black text-xl tracking-widest uppercase transition-all shadow-2xl flex items-center justify-center gap-3 ${
              nickname.trim() && !isLoading
                ? 'bg-brand-primary text-white cursor-pointer hover:shadow-brand-primary/30' 
                : 'bg-white/5 text-white/20 cursor-not-allowed'
            }`}
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-6 h-6" />
                Finish Setup
              </>
            )}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}
