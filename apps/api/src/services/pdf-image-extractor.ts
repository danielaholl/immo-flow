/**
 * PDF Image Extractor Service
 * Extracts embedded images from PDF files
 */
import { PDFDocument } from 'pdf-lib';

/**
 * Extract embedded images from PDF
 * @param pdfBuffer - PDF file buffer
 * @param maxImages - Maximum number of images to extract (default: 10)
 * @returns Array of base64 encoded images (data URLs)
 */
export async function extractImagesFromPdf(
  pdfBuffer: Buffer,
  maxImages: number = 10
): Promise<string[]> {
  try {
    console.log(`🖼️  Extracting embedded images from PDF...`);

    const pdfDoc = await PDFDocument.load(pdfBuffer);
    const images: string[] = [];

    // Get all pages
    const pages = pdfDoc.getPages();
    console.log(`📄 PDF has ${pages.length} pages`);

    // Iterate through all pages and extract images
    for (let pageIndex = 0; pageIndex < pages.length && images.length < maxImages; pageIndex++) {
      try {
        const page = pages[pageIndex];

        // Get the resources dictionary for the page
        const resources = page.node.Resources();
        if (!resources) continue;

        // Get XObject dictionary (contains images)
        const xObjects = resources.lookup(pdfDoc.context.obj('XObject'));
        if (!xObjects) continue;

        // Extract images from XObjects
        const xObjectKeys = xObjects.entries();
        for (const [key, xObject] of xObjectKeys) {
          if (images.length >= maxImages) break;

          try {
            // Check if this is an image
            const subtype = xObject.lookup(pdfDoc.context.obj('Subtype'));
            if (subtype?.toString() !== '/Image') continue;

            // Get the image bytes
            const stream = xObject as any;
            if (!stream.contents) continue;

            const imageBytes = stream.contents;

            // Get image format
            const filter = xObject.lookup(pdfDoc.context.obj('Filter'));
            const filterStr = filter?.toString() || '';

            // Determine image format
            let mimeType = 'image/jpeg';
            if (filterStr.includes('DCTDecode')) {
              mimeType = 'image/jpeg';
            } else if (filterStr.includes('FlateDecode')) {
              mimeType = 'image/png';
            } else if (filterStr.includes('JPXDecode')) {
              mimeType = 'image/jp2';
            }

            // Convert to base64
            const base64 = Buffer.from(imageBytes).toString('base64');
            const dataUrl = `data:${mimeType};base64,${base64}`;

            images.push(dataUrl);
            console.log(`✅ Extracted image ${images.length} from page ${pageIndex + 1} (${mimeType})`);
          } catch (imgError) {
            console.log(`⚠️  Could not extract image from page ${pageIndex + 1}:`, imgError);
            // Continue with next image
          }
        }
      } catch (pageError) {
        console.log(`⚠️  Error processing page ${pageIndex + 1}:`, pageError);
        // Continue with next page
      }
    }

    console.log(`✅ Total embedded images extracted: ${images.length}`);

    // If no embedded images found, return empty array
    if (images.length === 0) {
      console.log('⚠️  No embedded images found in PDF');
    }

    return images;
  } catch (error) {
    console.error('PDF image extraction error:', error);
    // Return empty array instead of throwing - continue without images
    return [];
  }
}

/**
 * Extract only the first embedded image as a thumbnail
 */
export async function extractThumbnailFromPdf(pdfBuffer: Buffer): Promise<string> {
  const images = await extractImagesFromPdf(pdfBuffer, 1);
  if (images.length === 0) {
    throw new Error('Keine Bilder in der PDF gefunden');
  }
  return images[0];
}
