import React, { useState } from 'react';
import { motion } from 'motion/react';
import { LogIn } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { User } from 'firebase/auth';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const user = await signInWithGoogle();
      if (user) {
        onLoginSuccess(user);
      }
    } catch (err: any) {
      console.error('Login error detail:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('Popup blocked! Please allow popups for this site to sign in.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again.');
      } else {
        setError('Failed to sign in with Google. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-dark flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px]" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] relative z-10 shadow-2xl"
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-brand-primary flex items-center justify-center font-black text-3xl italic mb-6 shadow-[0_0_20px_rgba(255,51,51,0.3)]">
            V
          </div>
          
          <h1 className="text-3xl font-display font-black text-white mb-2 tracking-tight uppercase">
            Welcome to <span className="text-brand-primary italic">VAAGAI</span>
          </h1>
          <p className="text-gray-400 font-medium mb-10">
            Sign in to access premium content and keep your preferences synced.
          </p>

          {error && (
            <div className="w-full p-4 bg-red-500/10 border border-red-500/20 rounded-xl mb-6 text-red-500 text-sm font-bold">
              {error}
            </div>
          )}

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white text-black py-4 px-6 rounded-2xl font-black text-lg transition-all hover:bg-gray-100 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mb-6"
          >
            {isLoading ? (
              <div className="w-6 h-6 border-4 border-black/20 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Continue with Google
              </>
            )}
          </motion.button>

          <p className="text-gray-500 text-xs font-bold uppercase tracking-widest leading-loose">
            By continuing, you agree to our <br />
            <span className="text-gray-400 underline cursor-pointer">Terms of Service</span> & <span className="text-gray-400 underline cursor-pointer">Privacy Policy</span>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
