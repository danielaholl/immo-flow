'use client';

import React, { useState, useRef } from 'react';
import { Upload, X, ImagePlus, AlertCircle, CheckCircle2 } from 'lucide-react';

export interface ScreenshotUploadProps {
  onUpload: (screenshots: File[]) => void;
  maxFiles?: number;
  disabled?: boolean;
}

/**
 * Multi-Screenshot Upload Komponente
 * Ermöglicht das Hochladen mehrerer Screenshots für ein Exposé
 * Mit Vorschau, Neuordnung und Validierung
 */
export function ScreenshotUpload({
  onUpload,
  maxFiles = 10,
  disabled = false,
}: ScreenshotUploadProps) {
  const [screenshots, setScreenshots] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Process and validate files
  const processFiles = async (files: FileList | File[]) => {
    setError(null);
    const newFiles: File[] = [];
    const newPreviews: string[] = [];

    for (let i = 0; i < files.length; i++) {
      if (screenshots.length + newFiles.length >= maxFiles) {
        setError(`Maximal ${maxFiles} Screenshots erlaubt`);
        break;
      }

      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError(`${file.name} ist kein Bild`);
        continue;
      }

      // Validate file size (max 10MB per image)
      if (file.size > 10 * 1024 * 1024) {
        setError(`${file.name} ist zu groß (max 10MB)`);
        continue;
      }

      newFiles.push(file);

      // Create preview
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onloadend = () => {
          if (reader.result) {
            newPreviews.push(reader.result as string);
          }
          resolve();
        };
        reader.readAsDataURL(file);
      });
    }

    if (newFiles.length > 0) {
      const updatedScreenshots = [...screenshots, ...newFiles];
      const updatedPreviews = [...previews, ...newPreviews];
      setScreenshots(updatedScreenshots);
      setPreviews(updatedPreviews);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    await processFiles(files);

    // Reset input
    e.target.value = '';
  };

  const handleRemove = (index: number) => {
    const newScreenshots = screenshots.filter((_, idx) => idx !== index);
    const newPreviews = previews.filter((_, idx) => idx !== index);
    setScreenshots(newScreenshots);
    setPreviews(newPreviews);
    setError(null);
  };

  const handleClear = () => {
    setScreenshots([]);
    setPreviews([]);
    setError(null);
  };

  // Drag & Drop for reordering
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newScreenshots = [...screenshots];
    const newPreviews = [...previews];

    const [draggedFile] = newScreenshots.splice(draggedIndex, 1);
    const [draggedPreview] = newPreviews.splice(draggedIndex, 1);

    newScreenshots.splice(dropIndex, 0, draggedFile);
    newPreviews.splice(dropIndex, 0, draggedPreview);

    setScreenshots(newScreenshots);
    setPreviews(newPreviews);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Drag & Drop for file upload
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

  const handleUploadClick = () => {
    if (screenshots.length === 0) {
      setError('Bitte lade mindestens einen Screenshot hoch');
      return;
    }
    onUpload(screenshots);
  };

  return (
    <div className="space-y-4">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          📸 So funktioniert's:
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
          <li>Öffne das Exposé auf ImmobilienScout24, Immowelt oder einem anderen Portal</li>
          <li>Mache Screenshots aller relevanten Seiten (Beschreibung, Bilder, Details, Lage)</li>
          <li>Lade die Screenshots hier hoch (Drag & Drop oder Datei auswählen)</li>
          <li>Unsere KI liest automatisch alle Daten aus und erstellt eine Analyse!</li>
        </ol>
      </div>

      {/* Upload Zone */}
      <div
        onDragEnter={handleFileDragEnter}
        onDragOver={handleFileDragOver}
        onDragLeave={handleFileDragLeave}
        onDrop={handleFileDrop}
        className={`relative border-2 border-dashed rounded-xl transition-all ${
          isDraggingFile
            ? 'border-blue-500 bg-blue-50 scale-[1.02]'
            : 'border-gray-300 hover:border-blue-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          id="screenshot-upload-input"
          disabled={disabled}
        />

        <label
          htmlFor="screenshot-upload-input"
          className={`flex flex-col items-center justify-center gap-3 px-6 py-8 ${
            disabled ? 'cursor-not-allowed' : 'cursor-pointer'
          }`}
        >
          {isDraggingFile ? (
            <>
              <ImagePlus className="w-12 h-12 text-blue-500 animate-bounce" />
              <span className="font-medium text-blue-600 text-lg">
                Screenshots hier ablegen...
              </span>
            </>
          ) : (
            <>
              <Upload className="w-10 h-10 text-gray-400" />
              <div className="text-center">
                <p className="font-medium text-gray-900 text-lg mb-1">
                  Screenshots hochladen {screenshots.length > 0 && `(${screenshots.length}/${maxFiles})`}
                </p>
                <p className="text-sm text-gray-600">
                  Klicken oder Bilder hierher ziehen
                </p>
              </div>
              <p className="text-xs text-gray-500">
                PNG, JPG, WebP • Max {maxFiles} Dateien • Max 10MB pro Datei
              </p>
            </>
          )}
        </label>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Preview Grid with Reordering */}
      {screenshots.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="text-sm font-medium text-gray-700">
                {screenshots.length} Screenshot{screenshots.length !== 1 ? 's' : ''} hochgeladen
              </p>
            </div>
            <button
              onClick={handleClear}
              className="text-sm text-red-600 hover:text-red-700 font-medium"
              disabled={disabled}
            >
              Alle entfernen
            </button>
          </div>

          <p className="text-xs text-gray-500">
            💡 Tipp: Ziehe Screenshots, um die Reihenfolge zu ändern. Die Reihenfolge hilft der KI beim Verständnis.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {previews.map((preview, idx) => (
              <div
                key={`${screenshots[idx].name}-${idx}`}
                draggable={!disabled}
                onDragStart={(e) => handleDragStart(e, idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, idx)}
                onDragEnd={handleDragEnd}
                className={`relative group cursor-move transition-all ${
                  draggedIndex === idx ? 'opacity-30 scale-95' : 'opacity-100'
                } ${
                  dragOverIndex === idx && draggedIndex !== idx
                    ? 'scale-105 ring-2 ring-blue-500'
                    : ''
                }`}
              >
                <div className="relative aspect-[4/3] rounded-lg overflow-hidden border-2 border-gray-200 hover:border-blue-400 transition-colors">
                  <img
                    src={preview}
                    alt={`Screenshot ${idx + 1}`}
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />

                  {/* Order Badge */}
                  <div className="absolute top-2 left-2 w-6 h-6 bg-black/70 text-white text-sm rounded-full flex items-center justify-center font-bold">
                    {idx + 1}
                  </div>

                  {/* File Name */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                    <p className="text-xs text-white truncate">
                      {screenshots[idx].name}
                    </p>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemove(idx);
                    }}
                    disabled={disabled}
                    className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 disabled:opacity-50"
                    aria-label={`Screenshot ${idx + 1} entfernen`}
                  >
                    <X size={14} />
                  </button>
                </div>

                {/* File Size */}
                <p className="text-xs text-gray-500 mt-1 text-center">
                  {(screenshots[idx].size / 1024).toFixed(0)} KB
                </p>
              </div>
            ))}
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUploadClick}
            disabled={disabled || screenshots.length === 0}
            className="w-full px-6 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-5 h-5" />
            {screenshots.length} Screenshot{screenshots.length !== 1 ? 's' : ''} analysieren
          </button>
        </div>
      )}
    </div>
  );
}
