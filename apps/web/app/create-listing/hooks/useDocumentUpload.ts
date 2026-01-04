/**
 * Custom hook for handling document uploads (PDFs, images for floor plans, etc.)
 */
import { useState, useRef, useCallback } from 'react';
import type { PropertyDocument, DocumentCategory, DocumentVisibility } from '../types';
import { getDefaultVisibility } from '../utils/documentUtils';

const ALLOWED_MIMETYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
];
const MAX_DOCUMENT_SIZE = 20 * 1024 * 1024; // 20MB

interface UseDocumentUploadResult {
  documents: PropertyDocument[];
  isUploadingDocument: boolean;
  uploadProgress: number;
  fileInputRef: React.RefObject<HTMLInputElement>;
  uploadDocument: (file: File, category: DocumentCategory) => Promise<PropertyDocument | null>;
  removeDocument: (id: string) => void;
  updateDocumentCategory: (id: string, category: DocumentCategory) => void;
  updateDocumentVisibility: (id: string, visibility: DocumentVisibility) => void;
  setDocuments: React.Dispatch<React.SetStateAction<PropertyDocument[]>>;
}

export function useDocumentUpload(
  onSuccess?: (doc: PropertyDocument) => void,
  mode?: 'create' | 'edit' | 'import'
): UseDocumentUploadResult {
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [isUploadingDocument, setIsUploadingDocument] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadDocument = useCallback(async (file: File, category: DocumentCategory): Promise<PropertyDocument | null> => {
    // Validate file type
    if (!ALLOWED_MIMETYPES.includes(file.type)) {
      console.error('[Documents] Invalid file type:', file.type);
      alert('Nur PDF, JPG, PNG und WebP Dateien sind erlaubt.');
      return null;
    }

    // Validate file size
    if (file.size > MAX_DOCUMENT_SIZE) {
      console.error('[Documents] File too large:', file.size);
      alert('Die Datei ist zu groß. Maximale Größe: 20MB');
      return null;
    }

    setIsUploadingDocument(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('document', file);

      const token = localStorage.getItem('auth_token');
      if (!token) {
        throw new Error('Keine Authentifizierung gefunden');
      }

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

      // Use XMLHttpRequest for progress tracking
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise<PropertyDocument>((resolve, reject) => {
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable) {
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(progress);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const result = JSON.parse(xhr.responseText);
              if (result.success && result.data) {
                resolve(result.data as PropertyDocument);
              } else {
                reject(new Error(result.message || 'Upload fehlgeschlagen'));
              }
            } catch {
              reject(new Error('Ungültige Server-Antwort'));
            }
          } else {
            reject(new Error(`Upload fehlgeschlagen mit Status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Netzwerkfehler beim Upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload abgebrochen')));

        xhr.open('POST', `${apiUrl}/upload/property-document?category=${category}`);
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.send(formData);
      });

      const doc = await uploadPromise;
      // Auto-assign visibility based on category (KI auto-categorization)
      const docWithVisibility: PropertyDocument = {
        ...doc,
        visibility: doc.visibility || getDefaultVisibility(category, mode),
      };
      setDocuments(prev => [...prev, docWithVisibility]);

      console.log(`[Documents] Successfully uploaded: ${docWithVisibility.filename} (${docWithVisibility.category}) - visibility: ${docWithVisibility.visibility}`);
      onSuccess?.(doc);

      return doc;
    } catch (error) {
      console.error('[Documents] Upload failed:', error);
      alert('Dokument-Upload fehlgeschlagen. Bitte versuche es erneut.');
      return null;
    } finally {
      setIsUploadingDocument(false);
      setUploadProgress(0);
    }
  }, [onSuccess, mode]);

  const removeDocument = useCallback((id: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== id));
  }, []);

  const updateDocumentCategory = useCallback((id: string, category: DocumentCategory) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === id ? { ...doc, category } : doc
    ));
  }, []);

  const updateDocumentVisibility = useCallback((id: string, visibility: DocumentVisibility) => {
    setDocuments(prev => prev.map(doc =>
      doc.id === id ? { ...doc, visibility } : doc
    ));
  }, []);

  return {
    documents,
    isUploadingDocument,
    uploadProgress,
    fileInputRef,
    uploadDocument,
    removeDocument,
    updateDocumentCategory,
    updateDocumentVisibility,
    setDocuments,
  };
}
