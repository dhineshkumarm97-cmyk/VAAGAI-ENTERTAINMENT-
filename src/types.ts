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
  genre?: string;
  ownerId?: string;
  syncId?: string;
  dubbedLanguages?: string[];
  dubbedUrls?: Record<string, string>;
}

export interface Category {
  id: string;
  title: string;
  videos: Video[];
}

export interface UserProfile {
  uid: string;
  nickname: string;
  avatarUrl: string;
  createdAt: string;
  updatedAt?: string;
  isTamilanPlanActive?: boolean;
}
