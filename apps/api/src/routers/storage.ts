/**
 * Storage Router - tRPC
 * Handles file uploads using LocalStorageProvider (no Supabase!)
 */
import { router, publicProcedure, protectedProcedure } from '../trpc.js';
import { z } from 'zod';
import { getStorageProvider } from '../storage/index.js';

const storage = getStorageProvider();

export const storageRouter = router({
  /**
   * Get public URL for a filename
   */
  getPublicUrl: publicProcedure
    .input(
      z.object({
        filename: z.string(),
      })
    )
    .query(({ input }) => {
      return {
        url: storage.getPublicUrl(input.filename),
      };
    }),

  /**
   * Delete a file (protected - owner only)
   */
  deleteFile: protectedProcedure
    .input(
      z.object({
        url: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await storage.deleteFile(input.url);
      return { success: true };
    }),

  /**
   * Delete multiple files (protected - owner only)
   */
  deleteFiles: protectedProcedure
    .input(
      z.object({
        urls: z.array(z.string()),
      })
    )
    .mutation(async ({ input }) => {
      await storage.deleteFiles(input.urls);
      return { success: true };
    }),
});

// Note: File upload endpoints are implemented as Express routes in server.ts
// because tRPC doesn't handle multipart/form-data well
// See: POST /api/upload/image and POST /api/upload/images
