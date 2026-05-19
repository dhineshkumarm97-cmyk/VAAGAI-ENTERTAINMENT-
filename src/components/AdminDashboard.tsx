import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Link as LinkIcon, Video as VideoIcon, CheckCircle2, Eraser } from 'lucide-react';
import { addVideo, fetchVideos, deleteVideo, deleteAllVideos } from '../services/firebaseService';
import { Video } from '../types';
import { motion, AnimatePresence } from 'motion/react';

export const AdminDashboard: React.FC<{ onRefresh?: () => void }> = ({ onRefresh }) => {
  const [title, setTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [category, setCategory] = useState('Movie');
  const [genre, setGenre] = useState('');
  const [language, setLanguage] = useState('tamil');
  const [thumbnail, setThumbnail] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState(false);

  const loadVideos = async () => {
    setIsLoading(true);
    const data = await fetchVideos();
    setVideos(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnail(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !videoUrl) return;

    setIsAdding(true);
    try {
      await addVideo({
        title,
        videoUrl,
        category,
        genre,
        language,
        description: `Experience the magic of ${title}`,
        thumbnail: thumbnail || `https://images.unsplash.com/photo-1542204111-38102a3b53c3?q=80&w=1974&auto=format&fit=crop`,
      });
      setTitle('');
      setVideoUrl('');
      setGenre('');
      setThumbnail(null);
      setSuccessMsg(true);
      setTimeout(() => setSuccessMsg(false), 3000);
      loadVideos();
      if (onRefresh) onRefresh();
    } catch (error) {
      alert('Failed to add video. Make sure you have admin permissions.');
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteVideo = async (id: string) => {
    if (!window.confirm('Delete this video?')) return;
    try {
      await deleteVideo(id);
      loadVideos();
      if (onRefresh) onRefresh();
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Failed to delete video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('CRITICAL: Are you sure you want to delete ALL videos from the library? This cannot be undone.')) return;
    
    setIsLoading(true);
    try {
      await deleteAllVideos();
      loadVideos();
      if (onRefresh) onRefresh();
      alert('Library cleared completely.');
    } catch (error) {
      console.error('Error clearing library:', error);
      alert('Failed to clear library.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 pb-24">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand-primary/20 flex items-center justify-center text-brand-primary">
          <VideoIcon className="w-6 h-6" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Admin Dashboard</h1>
          <p className="text-gray-400 text-sm">Manage your movie library across the platform</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Section */}
        <div className="lg:col-span-5">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-5">
              <Plus className="w-32 h-32 text-white" />
            </div>
            
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Plus className="w-5 h-5 text-brand-primary" /> Add New Video
            </h2>
            
            <form onSubmit={handleAddVideo} className="space-y-4 relative z-10">
              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Video Title</label>
                <input 
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Vaagai Official Trailer"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/50 transition-all font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Drive Video Link</label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input 
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/..."
                    className="w-full bg-black/40 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/50 transition-all font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Genre</label>
                <input 
                  type="text"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  placeholder="e.g. Action, Drama, Horror"
                  className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-brand-primary/50 transition-all font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Thumbnail</label>
                <div className="space-y-3">
                  <div 
                    className="relative w-full h-32 bg-black/40 border border-white/10 border-dashed rounded-2xl overflow-hidden group cursor-pointer"
                    onClick={() => document.getElementById('thumbnail-input')?.click()}
                  >
                    {thumbnail ? (
                      <img src={thumbnail} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                        <Plus className="w-6 h-6 mb-1" />
                        <span className="text-[10px] font-bold uppercase tracking-wider">Select Device Image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Change Image</span>
                    </div>
                  </div>
                  <input 
                    id="thumbnail-input"
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Category</label>
                  <select 
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary/50 transition-all font-medium appearance-none"
                  >
                    <option value="Movie">Movie</option>
                    <option value="Trailer">Trailer</option>
                    <option value="Music">Music</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Language</label>
                  <select 
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-brand-primary/50 transition-all font-medium appearance-none"
                  >
                    <option value="tamil">Tamil</option>
                    <option value="english">English</option>
                  </select>
                </div>
              </div>

              <button 
                type="submit"
                disabled={isAdding}
                className="w-full bg-brand-primary hover:bg-brand-primary/90 disabled:opacity-50 text-white font-black uppercase tracking-widest py-4 rounded-2xl transition-all shadow-lg shadow-brand-primary/20 flex items-center justify-center gap-2 mt-4"
              >
                {isAdding ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    Add Movie Link
                  </>
                )}
              </button>

              <AnimatePresence>
                {successMsg && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-2 text-green-400 text-xs font-bold justify-center mt-2"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Video added successfully!
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </div>
        </div>

        {/* List Section */}
        <div className="lg:col-span-7">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <VideoIcon className="w-5 h-5 text-gray-400" /> Active Library
              </h2>
              <span className="text-[10px] font-black bg-white/10 px-2 py-1 rounded-md text-gray-400 uppercase tracking-widest">
                {videos.length} Videos
              </span>
            </div>

            {videos.length > 0 && (
              <button 
                onClick={handleClearAll}
                className="mb-4 flex items-center gap-2 text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-500/10 p-2 rounded-xl border border-red-500/20 transition-all self-end"
              >
                <Eraser className="w-3.5 h-3.5" />
                Clear All Content
              </button>
            )}

            <div className="flex-1 space-y-3 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <Loader2 className="w-8 h-8 text-brand-primary animate-spin mb-4" />
                  <p className="text-gray-500 text-xs font-bold uppercase tracking-widest">Updating cache...</p>
                </div>
              ) : videos.length === 0 ? (
                <div className="text-center py-20 bg-black/20 rounded-2xl border border-dashed border-white/5">
                  <p className="text-gray-500 text-sm italic">Library is empty. Start by adding a link.</p>
                </div>
              ) : (
                videos.map((video) => (
                  <div key={video.id} className="group flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center text-gray-500 flex-shrink-0">
                        <VideoIcon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{video.title}</h3>
                        <p className="text-[10px] text-gray-500 font-mono truncate max-w-[200px]">{video.videoUrl}</p>
                        <div className="flex gap-2 mt-1 flex-wrap">
                          <span className="text-[8px] font-black bg-brand-primary/10 text-brand-primary px-1.5 py-0.5 rounded uppercase">{video.language}</span>
                          <span className="text-[8px] font-black bg-white/10 text-gray-400 px-1.5 py-0.5 rounded uppercase">{video.category}</span>
                          {video.genre && (
                            <span className="text-[8px] font-black bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded uppercase">{video.genre}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => video.id && handleDeleteVideo(video.id)}
                      className="p-2.5 text-gray-500 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
