import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface SplashScreenProps {
  onFinish: () => void;
}

export default function SplashScreen({ onFinish }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onFinish, 500); // Wait for exit animation
    }, 2500);

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          id="splash-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-darker"
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              duration: 1.2, 
              ease: [0.22, 1, 0.36, 1],
              scale: { type: "spring", damping: 15 } 
            }}
            className="flex flex-col items-center"
          >
            <div className="relative mb-8">
              <motion.h1 
                className="text-5xl md:text-7xl font-display font-bold tracking-widest text-brand-primary"
                initial={{ letterSpacing: "0.5em", opacity: 0 }}
                animate={{ letterSpacing: "0.1em", opacity: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              >
                VAAGAI
              </motion.h1>
              <motion.div 
                className="absolute -bottom-2 left-0 h-1 bg-brand-primary"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ duration: 1.5, delay: 0.5, ease: "easeInOut" }}
              />
            </div>
            
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1, duration: 0.8 }}
              className="text-gray-400 font-display tracking-widest text-sm uppercase"
            >
              Entertainment
            </motion.p>
          </motion.div>

          <div className="absolute bottom-12 w-48 h-1 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-brand-primary animate-progress" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
