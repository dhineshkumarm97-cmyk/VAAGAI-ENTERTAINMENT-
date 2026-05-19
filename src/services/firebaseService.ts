import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  orderBy, 
  doc, 
  getDoc, 
  deleteDoc, 
  updateDoc,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { Video } from '../types';

export async function fetchVideos(): Promise<Video[]> {
  const path = 'videos';
  try {
    // Fetch all videos. Sorting can be done locally if index is not ready.
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const videos = snapshot.docs.map(doc => {
      const data = doc.data();
      return { 
        id: doc.id, 
        ...data,
        // Ensure timestamp is handled if it's a Firestore Timestamp or missing
        uploadedAt: data.uploadedAt instanceof Timestamp ? new Date(data.uploadedAt.seconds * 1000).toLocaleDateString() : 'Recently'
      } as Video;
    });
    
    // Sort locally by id desc as a proxy for time if created by server
    return videos.sort((a, b) => b.id.localeCompare(a.id));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
    return [];
  }
}

export async function addVideo(video: Partial<Video>) {
  const path = 'videos';
  try {
    const docRef = await addDoc(collection(db, path), {
      uploadedAt: serverTimestamp(),
      views: '0',
      channelName: 'Vaagai Admin',
      channelAvatar: 'https://res.cloudinary.com/dkc9ru68y/image/upload/v1778809504/Lion-icon_cxqtdq.png',
      subscribers: '1M',
      ownerId: auth.currentUser?.uid || 'admin',
      ...video,
    });
    return docRef.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteVideo(videoId: string) {
  const path = `videos/${videoId}`;
  try {
    await deleteDoc(doc(db, 'videos', videoId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function deleteAllVideos() {
  const path = 'videos';
  try {
    const q = query(collection(db, path));
    const snapshot = await getDocs(q);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function checkIfAdmin(uid: string): Promise<boolean> {
  if (!uid) return false;
  const path = `admins/${uid}`;
  try {
    const adminDoc = await getDoc(doc(db, 'admins', uid));
    return adminDoc.exists();
  } catch (error) {
    console.error('Error checking admin status:', error);
    return false;
  }
}
