// Shared types for calculator cards

export interface UserParams {
  equity_percentage?: number | null;
  interest_rate?: number | null;
  amortization_rate?: number | null;
  broker_commission?: number | null;
  monthly_rent?: number | null;
  monthly_fee?: number | null;
  purchase_price?: number | null;
  renovation_costs?: number | null;
}

export interface SavedParams {
  equityPercentage?: number | null;
  interestRate?: number | null;
  amortizationRate?: number | null;
  brokerCommission?: number | null;
  monthlyRent?: number | null;
  monthlyFee?: number | null;
  purchasePrice?: number | null;
  renovationCosts?: number | null;
  calculatedGrossYield?: number | null;
  calculatedRentMultiplier?: number | null;
  calculatedMonthlyCashflow?: number | null;
}

export interface CalculatorProps {
  purchasePrice: number;
  location?: string;
  commissionRate?: number;
  equityPercentage?: number;
  interestRate?: number;
  amortizationRate?: number;
  monthlyFee?: number;
  sqm?: number;
  yearBuilt?: number;
  mode: 'investor' | 'eigennutzer';
  monthlyRent?: number;
  estimatedRentPerSqm?: number;
  renovationCosts?: number;
  marketRent?: number;
  userParams?: UserParams | null;
  onSaveParams?: (params: SavedParams) => void;
  isSavingParams?: boolean;
  onPurchasePriceChange?: (price: number) => void;
  canEdit?: boolean;
}

export interface EditState {
  purchasePrice: number | null;
  equityPercent: number | null;
  interestRate: number | null;
  amortizationRate: number | null;
  brokerCommission: number | null;
  renovationCosts: number | null;
  monthlyFee: number | null;
  monthlyRent: number | null;
  maintenanceCosts: number | null;
  afaRate: number | null;
  grenzsteuersatz: number | null;
}

export interface CalculatedValues {
  // Kaufnebenkosten
  grunderwerbsteuerRate: number;
  detectedState: string | null;
  grunderwerbsteuer: number;
  notarkosten: number;
  grundbuchkosten: number;
  maklergebuehren: number;
  kaufnebenkosten: number;
  gesamtinvestition: number;

  // Finanzierung
  eigenkapital: number;
  darlehensbetrag: number;
  monatlicheZinsen: number;
  monatlicheTilgung: number;
  monatlicheRate: number;

  // Ausgaben
  hausgeld: number;
  isHausgeldEstimated: boolean;
  instandhaltungskosten: number;
  hausgeldNichtUmlegbar: number;
  monatlicheAusgabenOhneKredit: number;
  monatlicheAusgabenOhneKreditEffektiv: number;

  // Cashflow
  mieteinnahmen: number;
  calculatedCashflow: number;

  // Break-Even
  breakEvenEK: { amount: number; percentage: number } | null;
  breakEvenYears: number | null;

  // Steuer
  steuereffekt: {
    monatlich: number;
    jaehrlich: number;
    afaJaehrlich: number;
    afaMonatlich: number;
    gebaeudewert: number;
    steuerlichesErgebnis: number;
    grenzsteuersatz: number;
    afaRate: number;
    buildingRatio: number;
  } | null;

  // Effektive Werte
  effectivePurchasePrice: number;
  effectiveEquityPercent: number;
  effectiveInterestRate: number;
  effectiveAmortizationRate: number;
  effectiveBrokerCommission: number;
  effectiveRenovationCosts: number;
  effectiveAfaRate: number;
  effectiveGrenzsteuersatz: number;
  defaultAfaRate: number;
  defaultGrenzsteuersatz: number;
}

export interface CalculatorContextValue {
  // Props
  props: CalculatorProps;

  // Edit state
  isEditMode: boolean;
  setIsEditMode: (value: boolean) => void;
  editState: EditState;
  setEditState: React.Dispatch<React.SetStateAction<EditState>>;

  // Calculated values
  values: CalculatedValues;

  // Actions
  handleReset: () => void;
  handleSave: () => void;
  startSimulation: () => void;

  // Utilities
  formatCurrency: (value: number) => string;
}

// Card common props
export interface CardProps {
  className?: string;
}
