/**
 * Solve Kepler's equation: M = E - e * sin(E)
 * Using Newton-Raphson iteration.
 *
 * @param {number} M - Mean anomaly in radians
 * @param {number} e - Orbital eccentricity
 * @param {number} tolerance - Convergence tolerance (default 1e-12)
 * @returns {number} Eccentric anomaly E in radians
 */
export function solveKepler(M, e, tolerance = 1e-12) {
  // Normalize M to [0, 2π)
  M = ((M % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);

  // Initial guess (Danby's method for better convergence)
  let E = M + e * Math.sin(M) * (1 + e * Math.cos(M));

  for (let i = 0; i < 30; i++) {
    const sinE = Math.sin(E);
    const cosE = Math.cos(E);
    const f = E - e * sinE - M;
    const fPrime = 1 - e * cosE;

    const dE = f / fPrime;
    E -= dE;

    if (Math.abs(dE) < tolerance) break;
  }

  return E;
}

/**
 * Convert eccentric anomaly to true anomaly.
 *
 * @param {number} E - Eccentric anomaly in radians
 * @param {number} e - Orbital eccentricity
 * @returns {number} True anomaly in radians
 */
export function eccentricToTrue(E, e) {
  return 2 * Math.atan2(
    Math.sqrt(1 + e) * Math.sin(E / 2),
    Math.sqrt(1 - e) * Math.cos(E / 2)
  );
}

/**
 * Compute orbital radius from eccentric anomaly.
 *
 * @param {number} a - Semi-major axis
 * @param {number} e - Eccentricity
 * @param {number} E - Eccentric anomaly in radians
 * @returns {number} Distance from focus
 */
export function orbitalRadius(a, e, E) {
  return a * (1 - e * Math.cos(E));
}

/**
 * Compute 2D position in the orbital plane from orbital elements.
 *
 * @param {number} a - Semi-major axis
 * @param {number} e - Eccentricity
 * @param {number} M - Mean anomaly in radians
 * @returns {{ x: number, y: number, r: number, nu: number }}
 */
export function orbitalPosition2D(a, e, M) {
  const E = solveKepler(M, e);
  const nu = eccentricToTrue(E, e);
  const r = orbitalRadius(a, e, E);

  return {
    x: r * Math.cos(nu),
    y: r * Math.sin(nu),
    r,
    nu
  };
}
