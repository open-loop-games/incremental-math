import Decimal from 'break_eternity.js';
import { Presets } from 'eternal_notations';

export { Decimal };
export type DecimalSource = Decimal | number | string;

const notation = Presets.Standard;

export function format(value: DecimalSource, precision = 2): string {
  const d = value instanceof Decimal ? value : new Decimal(value as number | string);
  if (isNaN(d.sign) || isNaN(d.layer) || isNaN(d.mag)) return 'NaN';
  if (d.sign < 0) return '-' + format(d.neg(), precision);
  if (d.mag === Number.POSITIVE_INFINITY) return 'Infinity';
  if (d.lt(1000)) return d.toNumber().toFixed(precision);
  return notation.format(d);
}
