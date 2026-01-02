/**
 * Calculator Defaults Router (tRPC)
 *
 * Verwaltet die Berechnungs-Standardwerte für Web-App Benutzer.
 * Ermöglicht das Abrufen von globalen Defaults und User-spezifischen Überschreibungen.
 */
import { z } from 'zod';
import { router, protectedProcedure, publicProcedure } from '../trpc.js';
import {
  getGlobalDefaults,
  getEffectiveDefaults,
  getUserPreferences,
  upsertUserPreferences,
  resetUserPreferences,
  getBuildingRatioForYear,
  getHausgeldPerSqmForYear,
  calculateMonthlyMaintenanceCost,
  calculateNonAllocableHausgeld,
  type EffectiveDefaults,
} from '../services/calculator-defaults-service.js';

// Validation schemas
const userPreferencesSchema = z.object({
  buildingRatio: z.number().min(0.1).max(1).nullish(),
  maintenanceCostPerSqm: z.number().min(0).max(100).nullish(),
  nonAllocableHausgeldRatio: z.number().min(0).max(1).nullish(),
  costIncreaseRate: z.number().min(0).max(0.5).nullish(),
  rentIncreaseRate: z.number().min(0).max(0.5).nullish(),
  valueAppreciationRate: z.number().min(-0.2).max(0.5).nullish(),
});

export const calculatorDefaultsRouter = router({
  /**
   * Lädt die effektiven Defaults für den aktuellen User
   * Merged globale Defaults mit User-Überschreibungen
   */
  getDefaults: publicProcedure.query(async ({ ctx }) => {
    // Wenn User eingeloggt, merged Defaults zurückgeben
    const userId = ctx.user?.id;
    return await getEffectiveDefaults(userId);
  }),

  /**
   * Lädt nur die globalen Defaults (ohne User-Merge)
   */
  getGlobalDefaults: publicProcedure.query(async () => {
    return await getGlobalDefaults();
  }),

  /**
   * Lädt die User-spezifischen Überschreibungen
   */
  getUserPreferences: protectedProcedure.query(async ({ ctx }) => {
    return await getUserPreferences(ctx.user.id);
  }),

  /**
   * Speichert User-spezifische Überschreibungen
   */
  updateUserPreferences: protectedProcedure
    .input(userPreferencesSchema)
    .mutation(async ({ ctx, input }) => {
      return await upsertUserPreferences(ctx.user.id, {
        buildingRatio: input.buildingRatio ?? null,
        maintenanceCostPerSqm: input.maintenanceCostPerSqm ?? null,
        nonAllocableHausgeldRatio: input.nonAllocableHausgeldRatio ?? null,
        costIncreaseRate: input.costIncreaseRate ?? null,
        rentIncreaseRate: input.rentIncreaseRate ?? null,
        valueAppreciationRate: input.valueAppreciationRate ?? null,
      });
    }),

  /**
   * Setzt alle User-Überschreibungen zurück auf globale Defaults
   */
  resetUserPreferences: protectedProcedure.mutation(async ({ ctx }) => {
    await resetUserPreferences(ctx.user.id);
    return { success: true };
  }),

  /**
   * Hilfsfunktion: Berechnet den Gebäudeanteil basierend auf Baujahr
   */
  getBuildingRatio: publicProcedure
    .input(z.object({ yearBuilt: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const defaults = await getEffectiveDefaults(ctx.user?.id);
      return getBuildingRatioForYear(defaults, input.yearBuilt);
    }),

  /**
   * Hilfsfunktion: Berechnet das geschätzte Hausgeld pro m² basierend auf Baujahr
   */
  getHausgeldPerSqm: publicProcedure
    .input(z.object({ yearBuilt: z.number().optional() }))
    .query(async ({ ctx, input }) => {
      const defaults = await getEffectiveDefaults(ctx.user?.id);
      return getHausgeldPerSqmForYear(defaults, input.yearBuilt);
    }),

  /**
   * Hilfsfunktion: Berechnet monatliche Instandhaltungskosten
   */
  calculateMaintenanceCost: publicProcedure
    .input(z.object({ sqm: z.number().min(1) }))
    .query(async ({ ctx, input }) => {
      const defaults = await getEffectiveDefaults(ctx.user?.id);
      return calculateMonthlyMaintenanceCost(defaults, input.sqm);
    }),

  /**
   * Hilfsfunktion: Berechnet nicht-umlagefähiges Hausgeld
   */
  calculateNonAllocableHausgeld: publicProcedure
    .input(z.object({ totalHausgeld: z.number().min(0) }))
    .query(async ({ ctx, input }) => {
      const defaults = await getEffectiveDefaults(ctx.user?.id);
      return calculateNonAllocableHausgeld(defaults, input.totalHausgeld);
    }),

  /**
   * Komplette Berechnungshilfe für eine Immobilie
   * Gibt alle relevanten berechneten Werte auf einmal zurück
   */
  calculatePropertyDefaults: publicProcedure
    .input(
      z.object({
        sqm: z.number().min(1),
        yearBuilt: z.number().optional(),
        hausgeld: z.number().optional(), // Wenn bekannt, sonst wird geschätzt
      })
    )
    .query(async ({ ctx, input }) => {
      const defaults = await getEffectiveDefaults(ctx.user?.id);

      // Gebäudeanteil
      const buildingRatio = getBuildingRatioForYear(defaults, input.yearBuilt);

      // Hausgeld (geschätzt wenn nicht angegeben)
      const hausgeldPerSqm = getHausgeldPerSqmForYear(defaults, input.yearBuilt);
      const estimatedHausgeld = input.hausgeld ?? Math.ceil(input.sqm * hausgeldPerSqm);

      // Nicht-umlagefähiger Anteil
      const nonAllocableHausgeld = calculateNonAllocableHausgeld(defaults, estimatedHausgeld);

      // Instandhaltungskosten
      const monthlyMaintenanceCost = calculateMonthlyMaintenanceCost(defaults, input.sqm);

      return {
        // Berechnete Werte
        buildingRatio,
        estimatedHausgeld,
        nonAllocableHausgeld,
        monthlyMaintenanceCost,
        hausgeldPerSqm,

        // Steigerungsraten für Prognosen
        costIncreaseRate: defaults.costIncreaseRate,
        rentIncreaseRate: defaults.rentIncreaseRate,
        valueAppreciationRate: defaults.valueAppreciationRate,

        // Alle Defaults
        defaults,
      };
    }),
});
