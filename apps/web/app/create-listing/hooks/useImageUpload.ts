/**
 * Custom hook for handling image uploads
 */
import { useState, useRef } from 'react';

interface UseImageUploadResult {
  uploadedImages: string[];
  isUploadingImages: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  processImageFiles: (files: FileList | null) => Promise<void>;
  handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  removeImage: (index: number) => void;
  addImages: (imageUrls: string[]) => void;
  setUploadedImages: React.Dispatch<React.SetStateAction<string[]>>;
}

export function useImageUpload(onSuccess?: (count: number) => void): UseImageUploadResult {
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImageFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    setIsUploadingImages(true);

    try {
      const formData = new FormData();
      imageFiles.forEach(file => formData.append('images', file));

      const token = localStorage.getItem('auth_token');
      if (!token) throw new Error('No authentication token found');

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const response = await fetch(`${apiUrl}/upload/property-images`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to upload images');
      }

      const result = await response.json();

      if (result.success && result.data) {
        const imageUrls = result.data.map((img: { original: string }) => img.original);
        setUploadedImages(prev => [...prev, ...imageUrls]);
        console.log(`✅ Successfully uploaded ${imageUrls.length} images`);

        if (onSuccess) {
          onSuccess(imageUrls.length);
        }
      }
    } catch (error) {
      console.error('❌ Failed to upload images:', error);
      throw error;
    } finally {
      setIsUploadingImages(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    processImageFiles(e.target.files);
    e.target.value = '';
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const addImages = (imageUrls: string[]) => {
    setUploadedImages(prev => [...prev, ...imageUrls]);
  };

  return {
    uploadedImages,
    isUploadingImages,
    fileInputRef,
    processImageFiles,
    handleImageUpload,
    removeImage,
    addImages,
    setUploadedImages,
  };
}
