import React from 'react';
import { Info } from 'lucide-react';
import { motion } from 'motion/react';

export default function Monetization() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-5 pb-32">
      <h1 className="text-2xl font-bold mb-6 mt-2 tracking-tight">Eligibility</h1>

      {/* Info Card */}
      <div className="bg-[#1a1a1a] rounded-2xl p-4 flex gap-4 items-start mb-10 border border-white/5">
        <div className="mt-1">
          <Info className="w-6 h-6 text-gray-400" />
        </div>
        <div>
          <h2 className="text-[17px] font-semibold text-gray-100 mb-1">Showing data as of: 12 May 2026</h2>
          <button className="text-blue-400 text-[15px] font-medium hover:underline">Learn more</button>
        </div>
      </div>

      {/* Eligibility Progress Section */}
      <div className="space-y-12 mb-12">
        {/* Requirement 1: Viewers */}
        <div>
          <ProgressBar 
            current={1200000} 
            target={2000000} 
            label="2,000,000 viewers" 
            sublabel="Required for partner program"
            targetLabel="20 lakh"
          />
        </div>

        {/* Requirement 2: Watch Hours */}
        <div className="space-y-10">
          <ProgressBar 
            current={2548} 
            target={5000} 
            label="2,548 valid public watch hours" 
            sublabel="last 365 days"
            targetLabel="5,000"
          />
        </div>
      </div>

      <p className="text-[14px] text-gray-400 font-medium mb-10">
        Some benefits may have additional eligibility criteria
      </p>

      {/* Next Steps Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-bold mb-4">Next steps</h3>
        
        <button className="w-full bg-[#2a2a2a] text-gray-100 font-bold py-4 rounded-full transition-colors active:bg-[#333]">
          Learn more about applying
        </button>
        
        <button className="w-full bg-[#3d3d3d] text-gray-400 font-bold py-4 rounded-full cursor-not-allowed">
          Apply now
        </button>

        <p className="text-center text-[15px] text-gray-300 font-medium pt-2">
          We'll let you know when you're eligible
        </p>
      </div>
    </div>
  );
}

function ProgressBar({ 
  current, 
  target, 
  label, 
  sublabel, 
  targetLabel, 
  isSmol = false 
}: { 
  current: number, 
  target: number, 
  label: string, 
  sublabel: string, 
  targetLabel: string,
  isSmol?: boolean
}) {
  const percentage = Math.min(100, (current / target) * 100);

  return (
    <div className="relative">
      <div className="flex justify-between items-baseline mb-2">
        <div>
          <div className="text-[17px] font-bold text-white leading-tight">{label}</div>
          <div className="text-[14px] text-gray-500 font-medium">{sublabel}</div>
        </div>
        <div className="text-[15px] font-bold text-gray-400">{targetLabel}</div>
      </div>
      
      <div className="w-full h-1.5 bg-[#333333] rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full bg-[#3ea6ff] rounded-full"
        />
      </div>
    </div>
  );
}

