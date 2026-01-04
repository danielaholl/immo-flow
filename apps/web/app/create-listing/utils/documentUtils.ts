import type { DocumentCategory, DocumentVisibility } from '../types';
import { CATEGORY_TO_DEFAULT_VISIBILITY } from '../types';

/**
 * Erkennt die Dokumentkategorie anhand des Dateinamens
 */
export function detectDocumentCategory(filename: string): DocumentCategory {
  const name = filename.toLowerCase();

  // Grundriss-Erkennung
  if (name.includes('grundriss') || name.includes('floor')) {
    return 'grundriss';
  }

  // Lageplan-Erkennung
  if (name.includes('lageplan') || name.includes('lage') || name.includes('site')) {
    return 'lageplan';
  }

  // Energieausweis-Erkennung
  if (name.includes('energie') || name.includes('energy') || name.includes('ausweis')) {
    return 'energieausweis';
  }

  // Expose-Erkennung
  if (name.includes('expose') || name.includes('exposé')) {
    return 'expose';
  }

  // Mietvertrag-Erkennung
  if (name.includes('mietvertrag') || name.includes('mietv') || name.includes('rental') || name.includes('miete')) {
    return 'mietvertrag';
  }

  // Kaufvertrag-Erkennung
  if (name.includes('kaufvertrag') || name.includes('kaufv') || name.includes('purchase')) {
    return 'kaufvertrag';
  }

  // ETW-Protokoll-Erkennung
  if (name.includes('protokoll') || name.includes('etw') || name.includes('eigentümer') || name.includes('versammlung')) {
    return 'etw_protokoll';
  }

  // Grundbuchauszug-Erkennung
  if (name.includes('grundbuch') || name.includes('auszug') || name.includes('land_register')) {
    return 'grundbuchauszug';
  }

  // Standard-Kategorie
  return 'sonstiges';
}

/**
 * Gibt die Standard-Sichtbarkeit für eine Dokumentkategorie zurück
 * Verwendet für KI-Auto-Kategorisierung beim Upload
 *
 * @param category - Die Dokumentkategorie
 * @param mode - Der Modus (create | edit | import)
 * @returns Die Standard-Sichtbarkeit für die Kategorie
 */
export function getDefaultVisibility(
  category: DocumentCategory,
  mode?: 'create' | 'edit' | 'import'
): DocumentVisibility {
  // Im Import-Modus: Alle Dokumente sind public (Käufer importiert vom Verkäufer)
  if (mode === 'import') {
    return 'public';
  }

  return CATEGORY_TO_DEFAULT_VISIBILITY[category] || 'public';
}

/**
 * Kürzt Dateinamen auf maxLength Zeichen + "..." + Endung
 */
export function truncateFilename(filename: string, maxLength: number = 10): string {
  if (filename.length <= maxLength + 3) return filename;

  const lastDotIndex = filename.lastIndexOf('.');
  const hasExtension = lastDotIndex > 0 && lastDotIndex < filename.length - 1;

  if (!hasExtension) {
    return `${filename.slice(0, maxLength)}...`;
  }

  const extension = filename.slice(lastDotIndex);
  const nameWithoutExt = filename.slice(0, lastDotIndex);

  if (nameWithoutExt.length <= maxLength) return filename;

  return `${nameWithoutExt.slice(0, maxLength)}...${extension}`;
}
