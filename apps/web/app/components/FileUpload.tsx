'use client';

import { useState, useRef, useEffect } from 'react';
import { Upload, X, File, Image as ImageIcon, AlertTriangle, GripVertical } from 'lucide-react';

export interface FileUploadProps {
  /** Accepted file types (e.g., '.pdf', 'image/*', '.pdf,.png,.jpg') */
  accept?: string;
  /** Maximum file size in MB */
  maxSizeMB?: number;
  /** Allow multiple files */
  multiple?: boolean;
  /** Callback when files are selected */
  onFilesSelected: (files: File[]) => void;
  /** Current selected files (controlled component) */
  files?: File[];
  /** Callback to remove a file */
  onRemoveFile?: (index: number) => void;
  /** Callback when files are reordered */
  onReorder?: (files: File[]) => void;
  /** Disabled state */
  disabled?: boolean;
  /** Custom label for the upload area */
  label?: string;
  /** Custom description text */
  description?: string;
  /** Show file preview thumbnails */
  showPreview?: boolean;
  /** Custom accept description (e.g., "PDF-Format") */
  acceptDescription?: string;
  /** Show thumbnails for images */
  showThumbnails?: boolean;
}

export function FileUpload({
  accept = '*',
  maxSizeMB = 25,
  multiple = false,
  onFilesSelected,
  files = [],
  onRemoveFile,
  onReorder,
  disabled = false,
  label,
  description,
  showPreview = true,
  acceptDescription,
  showThumbnails = true,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate thumbnails for images
  useEffect(() => {
    if (!showThumbnails) return;

    files.forEach((file) => {
      if (file.type.startsWith('image/') && !thumbnails[file.name]) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setThumbnails((prev) => ({
            ...prev,
            [file.name]: e.target?.result as string,
          }));
        };
        reader.readAsDataURL(file);
      }
    });
  }, [files, showThumbnails]);

  // Determine file type icon
  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) {
      return <ImageIcon className="w-8 h-8 text-blue-600" />;
    }
    if (file.type === 'application/pdf') {
      return (
        <svg className="w-8 h-8 text-red-600" fill="currentColor" viewBox="0 0 24 24">
          <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9L13,3.5V9H18.5Z" />
        </svg>
      );
    }
    return <File className="w-8 h-8 text-gray-600" />;
  };

  // Validate file
  const validateFile = (file: File): string | null => {
    // Check file size
    const fileSizeMB = file.size / 1024 / 1024;
    if (fileSizeMB > maxSizeMB) {
      return `Datei ist zu groß. Maximal ${maxSizeMB}MB erlaubt.`;
    }

    // Check file type if accept is specified
    if (accept !== '*') {
      const acceptedTypes = accept.split(',').map(t => t.trim());
      const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
      const mimeType = file.type;

      const isAccepted = acceptedTypes.some(type => {
        // Check extension
        if (type.startsWith('.')) {
          return fileExtension === type.toLowerCase();
        }
        // Check mime type (including wildcards like image/*)
        if (type.includes('*')) {
          const baseType = type.split('/')[0];
          return mimeType.startsWith(baseType + '/');
        }
        return mimeType === type;
      });

      if (!isAccepted) {
        return `Dieser Dateityp wird nicht unterstützt. Erlaubt: ${acceptDescription || accept}`;
      }
    }

    return null;
  };

  // Handle file selection
  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles || newFiles.length === 0) return;

    setError(null);
    const fileArray = Array.from(newFiles);

    // Validate all files
    for (const file of fileArray) {
      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    // If not multiple, only take first file
    const filesToAdd = multiple ? fileArray : [fileArray[0]];
    onFilesSelected(filesToAdd);
  };

  // Drag and drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOverZone = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const droppedFiles = e.dataTransfer.files;
    handleFiles(droppedFiles);
  };

  // File input change handler
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
  };

  // Click to open file dialog
  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  // Remove file handler
  const handleRemoveFile = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemoveFile) {
      onRemoveFile(index);
    }
  };

  // Drag and drop handlers for reordering
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFiles = [...files];
    const draggedFile = newFiles[draggedIndex];
    newFiles.splice(draggedIndex, 1);
    newFiles.splice(index, 0, draggedFile);

    if (onReorder) {
      onReorder(newFiles);
    }
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Determine default labels
  const defaultLabel = multiple ? 'Dateien hochladen' : 'Datei hochladen';
  const defaultDescription = multiple
    ? 'Ziehe Dateien hierher oder klicke zum Auswählen'
    : 'Ziehe eine Datei hierher oder klicke zum Auswählen';

  return (
    <div>
      {/* Drop Zone */}
      <div
        onDragEnter={handleDragEnter}
        onDragOver={handleDragOverZone}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        className={`relative border-2 border-dashed rounded-2xl p-10 transition-all duration-200 cursor-pointer ${
          disabled
            ? 'opacity-50 cursor-not-allowed bg-gray-50'
            : isDragging
            ? 'border-gray-900 bg-gray-50 scale-[1.02] shadow-xl'
            : files.length > 0
            ? 'border-green-500 bg-green-50 shadow-lg'
            : 'border-gray-300 bg-white hover:border-gray-900 hover:shadow-lg'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="text-center">
          {files.length > 0 && showPreview ? (
            <div className="space-y-4">
              {/* Thumbnail Grid View */}
              {showThumbnails && files.some(f => f.type.startsWith('image/')) ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      draggable={!disabled && onReorder !== undefined}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`group relative bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-sm hover:shadow-lg transition-all cursor-move ${
                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                      }`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {/* Thumbnail */}
                      <div className="aspect-square relative bg-gray-100">
                        {file.type.startsWith('image/') && thumbnails[file.name] ? (
                          <img
                            src={thumbnails[file.name]}
                            alt={file.name}
                            className="w-full h-full object-cover"
                          />
                        ) : file.type === 'application/pdf' ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-16 h-16 text-red-600" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18.5,9L13,3.5V9H18.5Z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <File className="w-16 h-16 text-gray-400" />
                          </div>
                        )}

                        {/* Drag Handle */}
                        {onReorder && !disabled && (
                          <div className="absolute top-2 left-2 bg-gray-900/80 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <GripVertical className="w-4 h-4" />
                          </div>
                        )}

                        {/* Remove Button */}
                        {onRemoveFile && !disabled && (
                          <button
                            onClick={(e) => handleRemoveFile(index, e)}
                            className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-lg opacity-0 group-hover:opacity-100 hover:bg-red-700 transition-all shadow-lg"
                            type="button"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}

                        {/* Index Badge */}
                        <div className="absolute bottom-2 left-2 bg-gray-900/80 text-white px-2 py-1 rounded-md text-xs font-bold">
                          {index + 1}
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="p-2">
                        <p className="text-xs font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                /* List View for non-image files */
                <div className="space-y-3">
                  {files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      draggable={!disabled && onReorder !== undefined}
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all ${
                        onReorder && !disabled ? 'cursor-move' : ''
                      } ${draggedIndex === index ? 'opacity-50 scale-95' : ''}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {onReorder && !disabled && (
                        <div className="flex-shrink-0 text-gray-400 hover:text-gray-600">
                          <GripVertical className="w-5 h-5" />
                        </div>
                      )}
                      <div className="flex-shrink-0">{getFileIcon(file)}</div>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-gray-900 truncate text-base">{file.name}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                      {onRemoveFile && !disabled && (
                        <button
                          onClick={(e) => handleRemoveFile(index, e)}
                          className="flex-shrink-0 p-2.5 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          type="button"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {multiple && !disabled && (
                <button
                  onClick={handleClick}
                  className="mt-2 text-gray-900 hover:text-gray-700 font-semibold text-sm underline decoration-2 underline-offset-4"
                  type="button"
                >
                  + Weitere Dateien hinzufügen
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="mb-6">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-100 rounded-full mb-4 transition-transform hover:scale-110">
                  <Upload className="w-10 h-10 text-gray-400" />
                </div>
                <p className="text-xl font-semibold text-gray-900 mb-2">
                  {isDragging ? 'Datei hier ablegen' : label || defaultLabel}
                </p>
                <p className="text-base text-gray-600 mb-6">
                  {description || defaultDescription}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-3 px-8 py-3.5 bg-gray-900 text-white rounded-xl font-semibold hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleClick();
                }}
              >
                <Upload className="w-5 h-5" />
                Datei auswählen
              </button>
              <p className="mt-4 text-sm text-gray-500 font-medium">
                Maximal {maxSizeMB} MB
                {acceptDescription && ` • ${acceptDescription}`}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mt-4 p-4 bg-red-50 border-2 border-red-200 rounded-xl text-red-700 text-sm font-medium flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
