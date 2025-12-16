/**
 * Custom hook for handling video uploads
 * Supports single video upload (max 100MB, MP4/MOV/WebM/MPEG)
 */
import { useState, useRef } from 'react';

interface UseVideoUploadResult {
  videoUrl: string | null;
  isUploadingVideo: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleVideoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeVideo: () => void;
  setVideoUrl: React.Dispatch<React.SetStateAction<string | null>>;
}

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm', 'video/mpeg'];
const MAX_VIDEO_SIZE = 100 * 1024 * 1024; // 100MB

export function useVideoUpload(onSuccess?: () => void): UseVideoUploadResult {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    // Validate file type
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      alert('Bitte wählen Sie ein gültiges Video-Format (MP4, MOV, WebM, MPEG)');
      return;
    }

    // Validate file size
    if (file.size > MAX_VIDEO_SIZE) {
      alert('Das Video ist zu groß. Maximale Größe: 100MB');
      return;
    }

    setIsUploadingVideo(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('video', file);

      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No authentication token found');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const result = JSON.parse(xhr.responseText);
            if (result.success && result.data?.url) {
              resolve(result.data.url);
            } else {
              reject(new Error(result.message || 'Upload failed'));
            }
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('POST', `${apiUrl}/upload/property-video`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      const url = await uploadPromise;
      setVideoUrl(url);
      console.log('✅ Successfully uploaded video:', url);

      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error('❌ Failed to upload video:', error);
      alert('Video-Upload fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setIsUploadingVideo(false);
      setUploadProgress(0);
    }
  };

  const removeVideo = () => {
    setVideoUrl(null);
  };

  return {
    videoUrl,
    isUploadingVideo,
    uploadProgress,
    fileInputRef,
    handleVideoUpload,
    removeVideo,
    setVideoUrl,
  };
}
