export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  category: string;
  year: string;
  duration: string;
  rating: string;
  views: string;
  uploadedAt: string;
  channelName: string;
  channelAvatar: string;
  subscribers: string;
  language: string;
}

export interface Category {
  id: string;
  title: string;
  videos: Video[];
}
