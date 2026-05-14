import React from 'react';
import { Search, Video, Mic, ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface NavbarProps {
  isTamilanPlanActive: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
}

export default function Navbar({ 
  isTamilanPlanActive, 
  searchQuery, 
  onSearchChange 
}: NavbarProps) {
  const [isMobileSearchVisible, setIsMobileSearchVisible] = React.useState(false);

  return (
    <nav
      id="main-nav"
      className="sticky top-0 w-full z-40 bg-bg-dark flex items-center justify-between px-4 md:px-6 h-16 border-b border-white/5"
    >
      <div className={`flex items-center gap-4 ${isMobileSearchVisible ? 'hidden sm:flex' : 'flex'}`}>
        <motion.div 
          className="text-xl font-display font-bold text-white cursor-pointer tracking-tighter flex items-center gap-2 md:hidden"
        >
          <div className="w-7 h-7 rounded bg-brand-primary flex items-center justify-center font-black text-lg italic">V</div>
          VAAGAI
        </motion.div>
        
        {isTamilanPlanActive && (
          <div className="hidden lg:flex items-center px-3 py-1 bg-brand-primary/10 border border-brand-primary/20 rounded-full">
            <span className="text-[10px] font-black text-brand-primary tracking-widest uppercase">Tamilan Plan Active</span>
          </div>
        )}
      </div>

      <div className={`${isMobileSearchVisible ? 'flex' : 'hidden md:flex'} flex-1 max-w-2xl items-center gap-2 md:gap-4 px-2 md:px-8`}>
        {isMobileSearchVisible && (
          <button 
            onClick={() => setIsMobileSearchVisible(false)}
            className="md:hidden p-2 text-gray-400 hover:text-white"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            onSearchChange(searchQuery);
          }}
          className="flex flex-1 items-center bg-gray-900 border border-white/10 rounded-full overflow-hidden focus-within:border-blue-500 transition-colors"
        >
          <input 
            type="text" 
            placeholder="Search" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="flex-1 bg-transparent px-4 py-2 outline-none text-white text-sm"
            autoFocus={isMobileSearchVisible}
          />
          <button 
            type="submit"
            className="px-5 bg-white/5 border-l border-white/10 hover:bg-white/10 transition-colors"
          >
            <Search className="w-5 h-5 text-gray-400" />
          </button>
        </form>
        <button className="hidden sm:flex p-2.5 bg-gray-900 hover:bg-white/10 rounded-full transition-colors text-white">
          <Mic className="w-5 h-5" />
        </button>
      </div>

      <div className={`flex items-center gap-2 md:gap-4 ${isMobileSearchVisible ? 'hidden sm:flex' : 'flex'}`}>
        <button 
          onClick={() => setIsMobileSearchVisible(true)}
          className="md:hidden p-2 text-white hover:bg-white/10 rounded-full"
        >
          <Search className="w-6 h-6" />
        </button>
        <Video className="hidden sm:block w-6 h-6 cursor-pointer hover:bg-white/10 rounded-full p-1 text-white" />
      </div>
    </nav>
  );
}
