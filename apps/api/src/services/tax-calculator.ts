/**
 * Tax Optimizer Calculator Service
 *
 * Implements the "Reverse Calculator" logic to determine how much
 * real estate investment is needed to reduce tax burden to zero.
 *
 * Mathematical Foundation:
 * ------------------------
 * Step 1: Calculate income to offset (Y)
 *   Y = T / r
 *   Where: T = paid tax, r = marginal tax rate
 *
 * Step 2: Calculate tax-leverage factor (F)
 *   F = (LTV × i) + (B × a) + k - y
 *   Where:
 *     LTV = Loan-to-value ratio (e.g., 1.0 for 100% financing)
 *     i = Interest rate (e.g., 4%)
 *     B = Building portion (e.g., 0.8 = 80%)
 *     a = AfA depreciation rate (2% / 5% / 9%)
 *     k = Non-transferable costs (e.g., 0.5% for maintenance)
 *     y = Rental yield (e.g., 3%)
 *
 * Step 3: Calculate target property price (P)
 *   P = Y / F
 */

// AfA Strategy Constants
export const AFA_STRATEGIES = {
  bestand: {
    rate: 0.02, // 2% linear AfA
    buildingRatio: 0.80, // 80% building portion
    label: 'Bestand (2% AfA)',
    description: 'Konservative Strategie für Bestandsimmobilien',
  },
  neubau: {
    rate: 0.04, // ~4% durchschnittliche degressive AfA über 10 Jahre (5% degressiv = Ø 4,01% p.a.)
    buildingRatio: 0.85, // 85% building portion (typically higher for new builds)
    label: 'Neubau (5% degr. AfA)',
    description: 'Aggressive Strategie für Neubauten mit degressiver AfA',
  },
  denkmal: {
    rate: 0.09, // 9% for Denkmal-AfA on renovation costs (12 years)
    buildingRatio: 0.35, // ~35% of purchase price as typical renovation costs
    label: 'Denkmal-AfA (9%)',
    description: 'Steuerersparnis durch Denkmalschutz-Sanierung (9% auf ~35% Sanierungskosten)',
  },
} as const;

export type AfaStrategy = keyof typeof AFA_STRATEGIES;

// Default values for calculation
export const DEFAULT_PARAMS = {
  ltvRatio: 1.0, // 100% financing
  interestRate: 0.04, // 4%
  rentalYield: 0.03, // 3%
  maintenanceRate: 0.005, // 0.5%
  marginalTaxRate: 0.42, // 42% (Spitzensteuersatz)
} as const;

export interface TaxCalculatorParams {
  annualTaxPaid: number; // Gezahlte Lohnsteuer p.a.
  marginalTaxRate: number; // Grenzsteuersatz (e.g., 0.42)
  strategy: AfaStrategy; // AfA strategy
  ltvRatio?: number; // Loan-to-value ratio
  interestRate?: number; // Zinssatz
  rentalYield?: number; // Mietrendite
  maintenanceRate?: number; // Instandhaltungskosten
  customAfaRate?: number; // Optional: Benutzerdefinierter AfA-Satz (z.B. 0.042 für 4.2%)
}

export interface TaxCalculatorResult {
  // Core Results
  targetPortfolioValue: number; // Ziel-Portfolio-Wert
  incomeToOffset: number; // Zu offsettendes Einkommen (Y)
  factorF: number; // Steuer-Hebel-Faktor (F)

  // Tax Savings
  annualTaxSavings: number; // Jährliche Steuerersparnis
  monthlyTaxSavings: number; // Monatliche Steuerersparnis

  // Breakdown
  breakdown: {
    interestDeduction: number; // Zinsabzug p.a.
    depreciationDeduction: number; // AfA-Abschreibung p.a.
    maintenanceDeduction: number; // Instandhaltung p.a.
    rentalIncome: number; // Mieteinnahmen p.a.
    netTaxLoss: number; // Steuerlicher Netto-Verlust p.a.
  };

  // Strategy Info
  strategy: AfaStrategy;
  strategyDetails: (typeof AFA_STRATEGIES)[AfaStrategy];

  // Input Echo
  params: Omit<Required<TaxCalculatorParams>, 'customAfaRate'> & { customAfaRate?: number };
}

export interface PropertyTaxEffect {
  propertyPrice: number;
  annualTaxSavings: number;
  monthlyTaxSavings: number;
  taxReductionPercent: number; // How much of total tax is saved
  breakdown: {
    interestDeduction: number;
    depreciationDeduction: number;
    maintenanceDeduction: number;
    rentalIncome: number;
    netTaxLoss: number;
  };
}

/**
 * Calculate the income that needs to be offset to reduce tax to zero
 * Y = T / r
 */
export function calculateIncomeToOffset(
  taxPaid: number,
  marginalRate: number
): number {
  if (marginalRate <= 0 || marginalRate > 1) {
    throw new Error('Marginal tax rate must be between 0 and 1');
  }
  return taxPaid / marginalRate;
}

/**
 * Calculate the tax-leverage factor (F)
 * F = (LTV × i) + (B × a) + k - y
 *
 * This factor represents the net tax loss per Euro of property value
 */
export function calculateFactorF(params: {
  ltvRatio: number;
  interestRate: number;
  buildingRatio: number;
  afaRate: number;
  maintenanceRate: number;
  rentalYield: number;
}): number {
  const {
    ltvRatio,
    interestRate,
    buildingRatio,
    afaRate,
    maintenanceRate,
    rentalYield,
  } = params;

  // Interest component: (LTV × i)
  const interestComponent = ltvRatio * interestRate;

  // Depreciation component: (B × a)
  const depreciationComponent = buildingRatio * afaRate;

  // Maintenance component: k
  const maintenanceComponent = maintenanceRate;

  // Rental yield (reduces tax loss): y
  const yieldComponent = rentalYield;

  // F = (LTV × i) + (B × a) + k - y
  const factorF =
    interestComponent +
    depreciationComponent +
    maintenanceComponent -
    yieldComponent;

  return factorF;
}

/**
 * Calculate the target property portfolio value
 * P = Y / F
 */
export function calculateTargetPropertyPrice(
  params: TaxCalculatorParams
): TaxCalculatorResult {
  // Fill in defaults
  const fullParams = {
    annualTaxPaid: params.annualTaxPaid,
    marginalTaxRate: params.marginalTaxRate,
    strategy: params.strategy,
    ltvRatio: params.ltvRatio ?? DEFAULT_PARAMS.ltvRatio,
    interestRate: params.interestRate ?? DEFAULT_PARAMS.interestRate,
    rentalYield: params.rentalYield ?? DEFAULT_PARAMS.rentalYield,
    maintenanceRate: params.maintenanceRate ?? DEFAULT_PARAMS.maintenanceRate,
    customAfaRate: params.customAfaRate,
  };

  const strategyDetails = AFA_STRATEGIES[fullParams.strategy];

  // Use custom AfA rate if provided, otherwise use strategy default
  const effectiveAfaRate = fullParams.customAfaRate ?? strategyDetails.rate;

  // Step 1: Calculate income to offset (Y)
  const incomeToOffset = calculateIncomeToOffset(
    fullParams.annualTaxPaid,
    fullParams.marginalTaxRate
  );

  // Step 2: Calculate factor F
  const factorF = calculateFactorF({
    ltvRatio: fullParams.ltvRatio,
    interestRate: fullParams.interestRate,
    buildingRatio: strategyDetails.buildingRatio,
    afaRate: effectiveAfaRate,
    maintenanceRate: fullParams.maintenanceRate,
    rentalYield: fullParams.rentalYield,
  });

  // Step 3: Calculate target portfolio value (P)
  // P = Y / F
  let targetPortfolioValue = 0;
  if (factorF > 0) {
    targetPortfolioValue = incomeToOffset / factorF;
  }

  // Calculate breakdown for the target portfolio
  const interestDeduction =
    targetPortfolioValue * fullParams.ltvRatio * fullParams.interestRate;
  const depreciationDeduction =
    targetPortfolioValue * strategyDetails.buildingRatio * effectiveAfaRate;
  const maintenanceDeduction =
    targetPortfolioValue * fullParams.maintenanceRate;
  const rentalIncome = targetPortfolioValue * fullParams.rentalYield;
  const netTaxLoss =
    interestDeduction +
    depreciationDeduction +
    maintenanceDeduction -
    rentalIncome;

  // Tax savings
  const annualTaxSavings = fullParams.annualTaxPaid; // By definition, we're offsetting all tax
  const monthlyTaxSavings = annualTaxSavings / 12;

  return {
    targetPortfolioValue: Math.round(targetPortfolioValue),
    incomeToOffset: Math.round(incomeToOffset),
    factorF,
    annualTaxSavings: Math.round(annualTaxSavings),
    monthlyTaxSavings: Math.round(monthlyTaxSavings),
    breakdown: {
      interestDeduction: Math.round(interestDeduction),
      depreciationDeduction: Math.round(depreciationDeduction),
      maintenanceDeduction: Math.round(maintenanceDeduction),
      rentalIncome: Math.round(rentalIncome),
      netTaxLoss: Math.round(netTaxLoss),
    },
    strategy: fullParams.strategy,
    strategyDetails,
    params: fullParams,
  };
}

/**
 * Calculate the tax effect for a specific property
 * Used in PropertyPreview to show "Steuer-Ersparnis mit diesem Objekt"
 */
export function calculatePropertyTaxEffect(
  propertyPrice: number,
  params: Omit<TaxCalculatorParams, 'annualTaxPaid'> & {
    annualTaxPaid?: number;
  }
): PropertyTaxEffect {
  const fullParams = {
    ltvRatio: params.ltvRatio ?? DEFAULT_PARAMS.ltvRatio,
    interestRate: params.interestRate ?? DEFAULT_PARAMS.interestRate,
    rentalYield: params.rentalYield ?? DEFAULT_PARAMS.rentalYield,
    maintenanceRate: params.maintenanceRate ?? DEFAULT_PARAMS.maintenanceRate,
    marginalTaxRate: params.marginalTaxRate ?? DEFAULT_PARAMS.marginalTaxRate,
    strategy: params.strategy,
  };

  const strategyDetails = AFA_STRATEGIES[fullParams.strategy];

  // Calculate deductions for this property
  const interestDeduction =
    propertyPrice * fullParams.ltvRatio * fullParams.interestRate;
  const depreciationDeduction =
    propertyPrice * strategyDetails.buildingRatio * strategyDetails.rate;
  const maintenanceDeduction = propertyPrice * fullParams.maintenanceRate;
  const rentalIncome = propertyPrice * fullParams.rentalYield;

  // Net tax loss from this property
  const netTaxLoss =
    interestDeduction +
    depreciationDeduction +
    maintenanceDeduction -
    rentalIncome;

  // Tax savings = loss × marginal rate
  const annualTaxSavings = netTaxLoss * fullParams.marginalTaxRate;
  const monthlyTaxSavings = annualTaxSavings / 12;

  // Calculate reduction percentage (if user provided their tax)
  let taxReductionPercent = 0;
  if (params.annualTaxPaid && params.annualTaxPaid > 0) {
    taxReductionPercent = (annualTaxSavings / params.annualTaxPaid) * 100;
  }

  return {
    propertyPrice,
    annualTaxSavings: Math.round(annualTaxSavings),
    monthlyTaxSavings: Math.round(monthlyTaxSavings),
    taxReductionPercent: Math.round(taxReductionPercent * 10) / 10,
    breakdown: {
      interestDeduction: Math.round(interestDeduction),
      depreciationDeduction: Math.round(depreciationDeduction),
      maintenanceDeduction: Math.round(maintenanceDeduction),
      rentalIncome: Math.round(rentalIncome),
      netTaxLoss: Math.round(netTaxLoss),
    },
  };
}

/**
 * Calculate monthly cashflow improvement scenarios
 */
export function calculateCashflowScenarios(
  params: TaxCalculatorParams,
  portfolioValues: number[]
): Array<{
  portfolioValue: number;
  annualTaxSavings: number;
  monthlyTaxSavings: number;
  percentOfTarget: number;
}> {
  const targetResult = calculateTargetPropertyPrice(params);

  return portfolioValues.map((portfolioValue) => {
    const effect = calculatePropertyTaxEffect(portfolioValue, {
      ...params,
      annualTaxPaid: params.annualTaxPaid,
    });

    return {
      portfolioValue,
      annualTaxSavings: effect.annualTaxSavings,
      monthlyTaxSavings: effect.monthlyTaxSavings,
      percentOfTarget:
        targetResult.targetPortfolioValue > 0
          ? Math.round(
              (portfolioValue / targetResult.targetPortfolioValue) * 100
            )
          : 0,
    };
  });
}
