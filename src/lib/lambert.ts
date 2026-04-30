// Principal branch of the Lambert W function: W₀(x) where W·e^W = x.
// Defined for x ≥ -1/e. Halley iteration; converges quadratically from a coarse seed.
// Real-valued, scalar. JS Number precision; not a Decimal-aware variant.

const EM1 = -1 / Math.E;

export function lambertW0(x: number): number {
  if (Number.isNaN(x)) return NaN;
  if (x < EM1) return NaN;
  if (x === EM1) return -1;
  if (x === 0) return 0;

  // Seed selection — accurate enough that 4–5 Halley steps suffice.
  let w: number;
  if (x < 1) {
    // Series for x near 0: W ≈ x - x² + 3x³/2 ...
    w = x * (1 - x);
  } else if (x < 10) {
    w = Math.log(1 + x);
  } else {
    // Asymptotic: W(x) ≈ ln x - ln ln x for large x.
    const L1 = Math.log(x);
    const L2 = Math.log(L1);
    w = L1 - L2 + L2 / L1;
  }

  for (let i = 0; i < 16; i++) {
    const ew = Math.exp(w);
    const wew = w * ew;
    const num = wew - x;
    if (Math.abs(num) < Math.abs(x) * 1e-15) return w;
    const denom = ew * (w + 1) - ((w + 2) * num) / (2 * w + 2);
    w -= num / denom;
  }
  return w;
}
