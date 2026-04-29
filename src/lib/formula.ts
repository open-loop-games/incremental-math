import Decimal from 'break_eternity.js';
import type { DecimalSource } from './decimal';

// cost(level) = base * growth^level
export function exponentialCost(level: number, base: number, growth: number): Decimal {
  return new Decimal(base).mul(new Decimal(growth).pow(level));
}

// continuous integral of base * growth^x = base * growth^x / ln(growth)
function integral(level: number, base: number, growth: number): Decimal {
  return new Decimal(base).mul(new Decimal(growth).pow(level)).div(Math.log(growth));
}

// sum of n costs starting at fromLevel, via integral approximation
export function exponentialCostSum(
  fromLevel: number,
  n: number,
  base: number,
  growth: number,
): Decimal {
  return integral(fromLevel + n, base, growth).sub(integral(fromLevel, base, growth));
}

// max whole items affordable from fromLevel given cash, via integral inversion
export function exponentialMaxAffordable(
  fromLevel: number,
  cash: DecimalSource,
  base: number,
  growth: number,
): number {
  const lnGrowth = Math.log(growth);
  const target = integral(fromLevel, base, growth).add(cash);
  const xMax = target.mul(lnGrowth).div(base).ln().div(lnGrowth);
  const n = xMax.sub(fromLevel).floor().toNumber();
  return Number.isFinite(n) && n > 0 ? n : 0;
}
