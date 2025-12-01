'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, ImagePlus } from 'lucide-react';

export interface ImageUploadWithDragDropProps {
  images: string[];
  onChange: (images: string[]) => void;
  maxImages?: number;
  label?: string;
  helpText?: string;
  required?: boolean;
}

/**
 * Wiederverwendbare Komponente für Bild-Upload mit Drag & Drop Neuordnung und Upload
 * Verwendet in: Create Listing, Edit Property
 */
export function ImageUploadWithDragDrop({
  images,
  onChange,
  maxImages = 10,
  label = 'Bilder hochladen',
  helpText = 'Ziehen Sie Bilder, um die Reihenfolge zu ändern',
  required = false,
}: ImageUploadWithDragDropProps) {
  const [draggedImageIndex, setDraggedImageIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process files and convert to base64
  const processFiles = async (files: FileList | File[]) => {
    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      if (images.length + newImages.length >= maxImages) {
        alert(`Maximal ${maxImages} Bilder erlaubt`);
        break;
      }

      const file = files[i];

      // Check if it's an image
      if (!file.type.startsWith('image/')) {
        continue;
      }

      const reader = new FileReader();

      await new Promise<void>((resolve) => {
        reader.onloadend = () => {
          if (reader.result) {
            newImages.push(reader.result as string);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    if (newImages.length > 0) {
      onChange([...images, ...newImages]);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await processFiles(files);

    // Reset input to allow selecting the same file again
    e.target.value = '';
  };

  const handleRemoveImage = (index: number) => {
    const newImages = images.filter((_, idx) => idx !== index);
    onChange(newImages);
  };

  // Drag & Drop for reordering images
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
    setDraggedImageIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleImageDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleImageDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedImageIndex === null || draggedImageIndex === dropIndex) {
      setDraggedImageIndex(null);
      return;
    }

    const newImages = [...images];
    const [draggedImage] = newImages.splice(draggedImageIndex, 1);
    newImages.splice(dropIndex, 0, draggedImage);

    onChange(newImages);
    setDraggedImageIndex(null);
  };

  const handleImageDragEnd = () => {
    setDraggedImageIndex(null);
    setDragOverIndex(null);
  };

  // Drag & Drop for uploading files
  const handleFileDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(true);
  };

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the drop zone itself
    if (e.currentTarget === e.target) {
      setIsDraggingFile(false);
    }
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingFile(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  return (
    <div className="space-y-3">
      {/* Drag & Drop Upload Zone */}
      <div
        onDragEnter={handleFileDragEnter}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all ${
          isDraggingFile
            ? 'border-primary bg-primary/5 scale-[1.02]'
            : 'border-gray-300 hover:border-primary/50'
        } ${required && images.length === 0 ? 'border-red-500' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="image-upload-input"
        />

        <label
          htmlFor="image-upload-input"
          className="flex flex-col items-center justify-center gap-2 px-4 py-6 cursor-pointer select-none"
          onDragEnter={(e) => e.preventDefault()}
          onDragOver={(e) => e.preventDefault()}
        >
          {isDraggingFile ? (
            <>
              <ImagePlus className="w-8 h-8 text-primary animate-bounce pointer-events-none" />
              <span className="font-medium text-primary pointer-events-none">Bilder hier ablegen...</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-primary pointer-events-none" />
              <span className="font-medium text-gray-900 pointer-events-none">
                {label} {images.length > 0 && `(${images.length}/${maxImages})`}
              </span>
              <span className="text-xs text-gray-500 pointer-events-none">
                Klicken oder Bilder hierher ziehen
              </span>
            </>
          )}
        </label>

        {required && images.length === 0 && (
          <p className="text-xs text-red-500 mt-1 px-4 pb-2 pointer-events-none">Mindestens ein Bild erforderlich</p>
        )}
      </div>

      {/* Image Preview with Drag & Drop Reordering */}
      {images.length > 0 && (
        <div>
          <p className="text-xs text-gray-500 mb-2">{helpText}</p>
          <div className="flex gap-3 overflow-x-auto pb-2 pt-2 px-1">
            {images.map((img, idx) => (
              <div
                key={`${img.substring(0, 20)}-${idx}`}
                draggable
                onDragStart={(e) => handleImageDragStart(e, idx)}
                onDragOver={(e) => handleImageDragOver(e, idx)}
                onDragLeave={handleImageDragLeave}
                onDrop={(e) => handleImageDrop(e, idx)}
                onDragEnd={handleImageDragEnd}
                className={`relative flex-shrink-0 cursor-move transition-all ${
                  draggedImageIndex === idx ? 'opacity-30 scale-95' : 'opacity-100 scale-100'
                } ${
                  dragOverIndex === idx && draggedImageIndex !== idx
                    ? 'scale-105 ring-2 ring-primary'
                    : ''
                }`}
              >
                <div className="relative group">
                  <img
                    src={img}
                    alt={`Upload ${idx + 1}`}
                    className="w-20 h-20 object-cover rounded-lg border-2 border-gray-200 hover:border-primary transition-colors pointer-events-none"
                    draggable={false}
                  />

                  {/* Image Number Badge */}
                  <div className="absolute top-1 left-1 w-5 h-5 bg-black/60 text-white text-xs rounded-full flex items-center justify-center font-medium pointer-events-none">
                    {idx + 1}
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleRemoveImage(idx);
                    }}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 z-10"
                    aria-label={`Bild ${idx + 1} entfernen`}
                  >
                    <X size={12} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
