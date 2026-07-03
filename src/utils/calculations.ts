/**
 * Financial calculations for Manoj Associates Bilty and Dispatch Register
 */

// Helper to safely parse float values
export const safeFloat = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const parsed = parseFloat(val);
  return isNaN(parsed) ? 0 : parsed;
};

// Calculate freight total for a single goods row
export const calculateRowTotal = (weight: string | number, rate: string | number): number => {
  const w = safeFloat(weight);
  const r = safeFloat(rate);
  return Number((w * r).toFixed(2));
};

// Calculate totals for print bilty
export interface BiltyPrintTotals {
  goodsTotal: number;
  totalFreight: number;
  balancePay: number;
}

export const calculateBiltyPrintTotals = (
  rowTotals: number[],
  toPay: string | number,
  hamali: string | number,
  advance: string | number
): BiltyPrintTotals => {
  const goodsTotal = rowTotals.reduce((sum, val) => sum + val, 0);
  const toPayVal = safeFloat(toPay);
  const hamaliVal = safeFloat(hamali);
  const advVal = safeFloat(advance);

  const totalFreight = goodsTotal + toPayVal + hamaliVal;
  const balancePay = totalFreight - advVal;

  return {
    goodsTotal: Number(goodsTotal.toFixed(2)),
    totalFreight: Number(totalFreight.toFixed(2)),
    balancePay: Number(balancePay.toFixed(2)),
  };
};

// Calculate weight difference (Challan Wt - Recd Wt)
export const calculateWeightDiff = (challanWt: string | number, recdWt: string | number): number => {
  const cw = safeFloat(challanWt);
  const rw = safeFloat(recdWt);
  return cw > 0 ? Number((cw - rw).toFixed(2)) : 0;
};

// Calculate dispatch freight (Recd Wt * Dispatch Rate, or Challan Wt * Dispatch Rate if Recd Wt is blank)
export const calculateDispatchFreight = (
  challanWt: string | number,
  recdWt: string | number,
  dispatchRate: string | number
): number => {
  const cw = safeFloat(challanWt);
  const rw = safeFloat(recdWt);
  const rate = safeFloat(dispatchRate);
  
  // Use received weight if it exists, otherwise fall back to challan weight
  const weight = rw > 0 ? rw : cw;
  return Math.round(weight * rate);
};

// Calculate diesel cost for self vehicle (Fuel Ltr * Fuel Rate)
export const calculateDieselCost = (fuelLtr: string | number, fuelRate: string | number): number => {
  const ltr = safeFloat(fuelLtr);
  const rate = safeFloat(fuelRate);
  return Math.round(ltr * rate);
};

// Calculate balances based on vehicle type
export interface DispatchBalances {
  selfBalance: number;
  outBalance: number;
  actBalance: number;
}

export const calculateDispatchBalances = (params: {
  vehicleType: 'self' | 'outside';
  dispatchFreight: string | number;
  shortageAmt: string | number;
  biltyCharge: string | number;
  // Self fields
  vre?: string | number;
  paid?: string | number;
  dieselCost?: string | number;
  // Outside fields
  biltyCom?: string | number;
  vreAdv?: string | number;
  outDiesel?: string | number;
}): DispatchBalances => {
  const freight = safeFloat(params.dispatchFreight);
  const shortage = safeFloat(params.shortageAmt);
  const biltyCharge = safeFloat(params.biltyCharge);
  
  let selfBalance = 0;
  let outBalance = 0;
  let actBalance = 0;

  if (params.vehicleType === 'self') {
    const vre = safeFloat(params.vre);
    const paid = safeFloat(params.paid);
    const diesel = safeFloat(params.dieselCost);
    
    selfBalance = freight - shortage - biltyCharge - vre - paid - diesel;
    actBalance = selfBalance;
  } else {
    const biltyCom = safeFloat(params.biltyCom);
    const vreAdv = safeFloat(params.vreAdv);
    const outDiesel = safeFloat(params.outDiesel);
    
    outBalance = freight - biltyCom - vreAdv - outDiesel;
    actBalance = outBalance;
  }

  return {
    selfBalance,
    outBalance,
    actBalance,
  };
};
