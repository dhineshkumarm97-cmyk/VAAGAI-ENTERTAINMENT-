import React, { useState, useEffect } from 'react';
import { Info, Sparkles, Star, Play, CheckCircle2, XCircle, ChevronLeft, Loader2, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TAMILAN_QUIZ_QUESTIONS, QuizQuestion } from '../constants/tamilanQuiz';

interface MonetizationProps {
  isTamilanPlanActive: boolean;
  onPlanActive: () => void;
  isProfileLoading?: boolean;
}

export default function Monetization({ isTamilanPlanActive, onPlanActive, isProfileLoading }: MonetizationProps) {
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizStep, setQuizStep] = useState<'intro' | 'active' | 'success' | 'failed'>('intro');
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [currentQuizIndex, setCurrentQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [isAnswering, setIsAnswering] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  if (isProfileLoading && !isTamilanPlanActive) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
        <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Checking Partner Status...</p>
      </div>
    );
  }

  const startQuiz = () => {
    const shuffled = [...TAMILAN_QUIZ_QUESTIONS].sort(() => 0.5 - Math.random());
    setQuizQuestions(shuffled.slice(0, 10));
    setCurrentQuizIndex(0);
    setQuizScore(0);
    setQuizStep('intro');
    setShowQuiz(true);
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (isAnswering) return;
    
    setIsAnswering(true);
    setSelectedAnswer(optionIdx);
    
    const currentQ = quizQuestions[currentQuizIndex];
    const isCorrect = currentQ.options[optionIdx] === currentQ.answer;

    if (isCorrect) setQuizScore(prev => prev + 1);

    setTimeout(() => {
      setSelectedAnswer(null);
      setIsAnswering(false);
      
      if (currentQuizIndex < 9) {
        setCurrentQuizIndex(prev => prev + 1);
      } else {
        // Evaluate overall score
        if (quizScore + (isCorrect ? 1 : 0) === 10) {
          setQuizStep('success');
          onPlanActive();
        } else {
          setQuizStep('failed');
        }
      }
    }, 800);
  };

  const handleSubscribe = () => {
    setIsSubscribing(true);
    window.open("https://youtube.com/@murugansouthindiadevotional?si=wqWd2awM_sw81Y4s", "_blank");
    
    // Simulate verification or just award it as per user intent
    setTimeout(() => {
      onPlanActive();
      setIsSubscribing(false);
    }, 2000);
  };

  if (showQuiz) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-white p-6 flex flex-col">
        <button 
          onClick={() => setShowQuiz(false)}
          className="flex items-center gap-2 text-gray-500 mb-8 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Exit Verification</span>
        </button>

        <AnimatePresence mode="wait">
          {quizStep === 'intro' && (
            <motion.div 
              key="intro"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="w-24 h-24 bg-brand-primary/20 rounded-[2rem] flex items-center justify-center border border-brand-primary/30">
                <Sparkles className="w-12 h-12 text-brand-primary" />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter italic">Tamilan Challenge</h1>
                <p className="text-gray-400 max-w-sm mx-auto font-medium">
                  Prove your roots. Answer 10 correctly in a row to unlock Lifetime VAAGAI Premium.
                </p>
              </div>
              <button 
                onClick={() => setQuizStep('active')}
                className="w-full max-w-xs py-5 bg-brand-primary text-white font-black rounded-2xl shadow-2xl shadow-brand-primary/20 active:scale-95 transition-all text-sm tracking-widest uppercase"
              >
                Start Challenge
              </button>
            </motion.div>
          )}

          {quizStep === 'active' && quizQuestions[currentQuizIndex] && (
            <motion.div 
              key="active"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                   <span className="text-[10px] font-black text-brand-primary uppercase tracking-[0.2em]">Level {currentQuizIndex + 1}/10</span>
                   <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Perfect Score Required</span>
                </div>
                <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${(currentQuizIndex + 1) * 10}%` }}
                     className="h-full bg-brand-primary"
                   />
                </div>
              </div>

              <h2 className="text-2xl font-bold leading-relaxed">
                {quizQuestions[currentQuizIndex].question}
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {quizQuestions[currentQuizIndex].options.map((option, idx) => {
                  const isSelected = selectedAnswer === idx;
                  const isCorrect = isAnswering && option === quizQuestions[currentQuizIndex].answer;
                  const isWrong = isAnswering && isSelected && option !== quizQuestions[currentQuizIndex].answer;

                  return (
                    <button
                      key={idx}
                      disabled={isAnswering}
                      onClick={() => handleQuizAnswer(idx)}
                      className={`
                        w-full p-6 rounded-3xl border text-left font-bold transition-all flex items-center justify-between group
                        ${isSelected ? 'scale-[0.98]' : ''}
                        ${!isAnswering ? 'bg-white/5 border-white/10 hover:border-brand-primary/50' : ''}
                        ${isCorrect ? 'bg-green-500/20 border-green-500 text-green-500' : ''}
                        ${isWrong ? 'bg-red-500/20 border-red-500 text-red-500' : ''}
                        ${isAnswering && !isCorrect && !isWrong ? 'opacity-40 border-white/5' : ''}
                      `}
                    >
                      <span className="flex-1">{option}</span>
                      {isCorrect && <CheckCircle2 className="w-6 h-6" />}
                      {isWrong && <XCircle className="w-6 h-6" />}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {quizStep === 'success' && (
            <motion.div 
              key="success"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="w-32 h-32 bg-green-500/20 rounded-full flex items-center justify-center border border-green-500/30">
                <CheckCircle2 className="w-16 h-16 text-green-500" />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter italic">Verified!</h1>
                <p className="text-gray-400 font-medium max-w-sm">
                  You are a true Tamilan. Lifetime Free access has been activated on your account.
                </p>
              </div>
              <button 
                onClick={() => setShowQuiz(false)}
                className="w-full max-w-xs py-5 bg-white text-black font-black rounded-2xl active:scale-95 transition-all text-sm tracking-widest uppercase"
              >
                Done
              </button>
            </motion.div>
          )}

          {quizStep === 'failed' && (
            <motion.div 
              key="failed"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex-1 flex flex-col items-center justify-center text-center space-y-8"
            >
              <div className="w-32 h-32 bg-red-500/20 rounded-full flex items-center justify-center border border-red-500/30">
                <XCircle className="w-16 h-16 text-red-500" />
              </div>
              <div className="space-y-4">
                <h1 className="text-4xl font-black uppercase tracking-tighter italic">Failed</h1>
                <p className="text-gray-400 font-medium">You need 10/10 correct answers to qualify.</p>
                <p className="text-orange-500 font-bold">Your Score: {quizScore}/10</p>
              </div>
              <div className="w-full max-w-xs space-y-3">
                <button 
                  onClick={startQuiz}
                  className="w-full py-5 bg-brand-primary text-white font-black rounded-2xl active:scale-95 transition-all text-sm tracking-widest uppercase"
                >
                  Try Again
                </button>
                <button 
                  onClick={() => setShowQuiz(false)}
                  className="w-full py-5 bg-white/5 text-gray-500 font-bold rounded-2xl active:scale-95 transition-all text-sm tracking-widest uppercase"
                >
                  Close
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-5 pb-32">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-black tracking-tight uppercase italic">Eligibility</h1>
        {isTamilanPlanActive && (
          <div className="flex items-center gap-2 bg-green-500/20 text-green-500 px-4 py-1.5 rounded-full border border-green-500/30">
             <ShieldCheck className="w-4 h-4" />
             <span className="text-[10px] font-black uppercase tracking-widest">Active Partner</span>
          </div>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-[#1a1a1a] rounded-3xl p-5 flex gap-4 items-start mb-10 border border-white/5 relative overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-primary/0 to-brand-primary/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <div className="mt-1 relative z-10">
          <div className="w-10 h-10 bg-white/5 rounded-2xl flex items-center justify-center">
            <Info className="w-5 h-5 text-gray-400" />
          </div>
        </div>
        <div className="relative z-10">
          <h2 className="text-lg font-bold text-gray-100 mb-1">Status as of: 19 May 2026</h2>
          <p className="text-xs text-gray-500 font-medium leading-relaxed">
            VAAGAI Partner Program (VPP) requirements are tracking your progress automatically. 
          </p>
        </div>
      </div>

      {/* Main Activation Card */}
      {!isTamilanPlanActive && (
        <div className="mb-12 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] rounded-[2.5rem] p-8 border border-brand-primary/30 shadow-[0_0_50px_rgba(255,107,0,0.1)]">
           <div className="flex items-center gap-4 mb-8">
              <div className="w-16 h-16 bg-brand-primary rounded-3xl flex items-center justify-center shadow-2xl shadow-brand-primary/30">
                 <Star className="w-8 h-8 text-white" />
              </div>
              <div>
                 <h2 className="text-2xl font-black uppercase tracking-tighter leading-none italic">Tamilan Plan</h2>
                 <p className="text-brand-primary text-xs font-black uppercase tracking-widest mt-2 animate-pulse">Unlock Lifetime Free Access</p>
              </div>
           </div>

           <p className="text-gray-400 text-sm font-medium leading-relaxed mb-10">
             Choose any one of the following methods to verify and activate your Lifetime Premium access.
           </p>

           <div className="space-y-4">
              <button 
                onClick={startQuiz}
                className="w-full bg-white text-black p-6 rounded-3xl flex items-center justify-between group hover:bg-brand-primary hover:text-white transition-all shadow-xl active:scale-[0.98]"
              >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center group-hover:bg-white/20 transition-colors">
                      <Star className="w-6 h-6 text-black group-hover:text-white" />
                   </div>
                   <div className="text-left">
                      <h4 className="font-black uppercase tracking-widest text-xs">Method 1: Quiz</h4>
                      <p className="text-[10px] opacity-60 font-bold">Answer 10 Questions</p>
                   </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-black/10 flex items-center justify-center group-hover:border-white/20">
                   <Star className="w-4 h-4" />
                </div>
              </button>

              <button 
                onClick={handleSubscribe}
                disabled={isSubscribing}
                className="w-full bg-[#FF0000] text-white p-6 rounded-3xl flex items-center justify-between group hover:bg-[#CC0000] transition-all shadow-xl active:scale-[0.98] disabled:opacity-50"
              >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                      {isSubscribing ? <Loader2 className="w-6 h-6 animate-spin" /> : <Play className="w-6 h-6 fill-white" />}
                   </div>
                   <div className="text-left">
                      <h4 className="font-black uppercase tracking-widest text-xs">Method 2: Subscribe</h4>
                      <p className="text-[10px] opacity-60 font-bold">Follow our channel</p>
                   </div>
                </div>
                <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                   <Play className="w-4 h-4 fill-white" />
                </div>
              </button>
           </div>
        </div>
      )}

      {/* Eligibility Progress Section */}
      <h3 className="text-xl font-bold mb-8 flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-gray-500" />
        Partner Progress
      </h3>
      
      <div className="space-y-12 mb-12">
        <div>
          <ProgressBar 
            current={1200000} 
            target={2000000} 
            label="2,000,000 views" 
            sublabel="Required for partner program"
            targetLabel="20 lakh"
          />
        </div>

        <div>
          <ProgressBar 
            current={2548} 
            target={5000} 
            label="2,548 public watch hours" 
            sublabel="last 365 days"
            targetLabel="5,000"
          />
        </div>
      </div>
    </div>
  );
}

function ProgressBar({ 
  current, 
  target, 
  label, 
  sublabel, 
  targetLabel
}: { 
  current: number, 
  target: number, 
  label: string, 
  sublabel: string, 
  targetLabel: string
}) {
  const percentage = Math.min(100, (current / target) * 100);

  return (
    <div className="relative">
      <div className="flex justify-between items-baseline mb-4">
        <div>
          <div className="text-lg font-black text-white">{label}</div>
          <div className="text-[10px] text-gray-500 font-black uppercase tracking-widest mt-1">{sublabel}</div>
        </div>
        <div className="text-sm font-black text-gray-400">{targetLabel}</div>
      </div>
      
      <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className="h-full bg-brand-primary rounded-full shadow-[0_0_15px_rgba(255,107,0,0.3)]"
        />
      </div>
    </div>
  );
}

