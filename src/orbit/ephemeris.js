import { DEG, AU, EARTH_ORBIT } from '../constants.js';
import { jdToT } from './julian.js';
import { solveKepler, eccentricToTrue, orbitalRadius } from './kepler.js';

/**
 * Compute the Sun's geocentric position (i.e., where the Sun appears from Earth).
 * Uses Earth's orbital elements to find Earth's heliocentric position,
 * then negates it to get the Sun's geocentric ecliptic position.
 *
 * @param {number} jd - Julian Date
 * @returns {{ x: number, y: number, z: number, distance: number }} Position in km, geocentric ecliptic
 */
export function getSunPosition(jd) {
  const T = jdToT(jd);

  // Compute Earth orbital elements at time T
  const a_au = EARTH_ORBIT.a + EARTH_ORBIT.a_rate * T;
  const e = EARTH_ORBIT.e + EARTH_ORBIT.e_rate * T;
  const I = (EARTH_ORBIT.I + EARTH_ORBIT.I_rate * T) * DEG;
  const L = (EARTH_ORBIT.L + EARTH_ORBIT.L_rate * T) * DEG;
  const w_bar = (EARTH_ORBIT.w_bar + EARTH_ORBIT.w_bar_rate * T) * DEG;
  const omega = (EARTH_ORBIT.omega + EARTH_ORBIT.omega_rate * T) * DEG;

  const a = a_au * AU; // Convert AU to km

  // Mean anomaly
  const M = L - w_bar;

  // Argument of perihelion
  const w = w_bar - omega;

  // Solve Kepler
  const E = solveKepler(M, e);
  const nu = eccentricToTrue(E, e);
  const r = orbitalRadius(a, e, E);

  // Position in orbital plane
  const xOrb = r * Math.cos(nu);
  const yOrb = r * Math.sin(nu);

  // Rotate to ecliptic coordinates
  // Rotation by argument of perihelion (w), then inclination (I), then ascending node (omega)
  const cosW = Math.cos(w), sinW = Math.sin(w);
  const cosI = Math.cos(I), sinI = Math.sin(I);
  const cosO = Math.cos(omega), sinO = Math.sin(omega);

  // Earth heliocentric position
  const xEarth = (cosO * cosW - sinO * sinW * cosI) * xOrb +
                 (-cosO * sinW - sinO * cosW * cosI) * yOrb;
  const yEarth = (sinO * cosW + cosO * sinW * cosI) * xOrb +
                 (-sinO * sinW + cosO * cosW * cosI) * yOrb;
  const zEarth = (sinW * sinI) * xOrb + (cosW * sinI) * yOrb;

  // Sun geocentric = negative of Earth heliocentric
  return {
    x: -xEarth,
    y: -yEarth,
    z: -zEarth,
    distance: r
  };
}

/**
 * Compute Moon's geocentric ecliptic position using simplified Meeus algorithm.
 * Based on "Astronomical Algorithms" by Jean Meeus, Chapter 47.
 * Uses the principal periodic terms of the ELP-2000/82 lunar theory.
 *
 * @param {number} jd - Julian Date
 * @returns {{ x: number, y: number, z: number, distance: number, longitude: number, latitude: number }}
 */
export function getMoonPosition(jd) {
  const T = jdToT(jd);
  const T2 = T * T;
  const T3 = T2 * T;
  const T4 = T3 * T;

  // Fundamental arguments (degrees)
  // L' - Moon's mean longitude (mean equinox of date)
  const Lp = 218.3164477 + 481267.88123421 * T
             - 0.0015786 * T2 + T3 / 538841 - T4 / 65194000;

  // D - Mean elongation of Moon
  const D = 297.8501921 + 445267.1114034 * T
            - 0.0018819 * T2 + T3 / 545868 - T4 / 113065000;

  // M - Sun's mean anomaly
  const M = 357.5291092 + 35999.0502909 * T
            - 0.0001536 * T2 + T3 / 24490000;

  // M' - Moon's mean anomaly
  const Mp = 134.9633964 + 477198.8675055 * T
             + 0.0087414 * T2 + T3 / 69699 - T4 / 14712000;

  // F - Moon's argument of latitude
  const F = 93.2720950 + 483202.0175233 * T
            - 0.0036539 * T2 - T3 / 3526000 + T4 / 863310000;

  // Additional arguments
  const A1 = 119.75 + 131.849 * T;
  const A2 = 53.09 + 479264.290 * T;
  const A3 = 313.45 + 481266.484 * T;

  // Convert to radians for trig functions
  const Lr = Lp * DEG;
  const Dr = D * DEG;
  const Mr = M * DEG;
  const Mpr = Mp * DEG;
  const Fr = F * DEG;
  const A1r = A1 * DEG;
  const A2r = A2 * DEG;
  const A3r = A3 * DEG;

  // Eccentricity correction factor
  const E = 1 - 0.002516 * T - 0.0000074 * T2;
  const E2 = E * E;

  // Sum of longitude terms (Σl) in units of 0.000001 degrees
  // Main periodic terms for longitude
  let sumL = 0;
  sumL += 6288774 * Math.sin(Mpr);
  sumL += 1274027 * Math.sin(2 * Dr - Mpr);
  sumL += 658314 * Math.sin(2 * Dr);
  sumL += 213618 * Math.sin(2 * Mpr);
  sumL += -185116 * E * Math.sin(Mr);
  sumL += -114332 * Math.sin(2 * Fr);
  sumL += 58793 * Math.sin(2 * Dr - 2 * Mpr);
  sumL += 57066 * E * Math.sin(2 * Dr - Mr - Mpr);
  sumL += 53322 * Math.sin(2 * Dr + Mpr);
  sumL += 45758 * E * Math.sin(2 * Dr - Mr);
  sumL += -40923 * E * Math.sin(Mr - Mpr);
  sumL += -34720 * Math.sin(Dr);
  sumL += -30383 * E * Math.sin(Mr + Mpr);
  sumL += 15327 * Math.sin(2 * Dr - 2 * Fr);
  sumL += -12528 * Math.sin(Mpr + 2 * Fr);
  sumL += 10980 * Math.sin(Mpr - 2 * Fr);
  sumL += 10675 * Math.sin(4 * Dr - Mpr);
  sumL += 10034 * Math.sin(3 * Mpr);
  sumL += 8548 * Math.sin(4 * Dr - 2 * Mpr);
  sumL += -7888 * E * Math.sin(2 * Dr + Mr - Mpr);
  sumL += -6766 * E * Math.sin(2 * Dr + Mr);
  sumL += -5163 * Math.sin(Dr - Mpr);
  sumL += 4987 * E * Math.sin(Dr + Mr);
  sumL += 4036 * E * Math.sin(2 * Dr - Mr + Mpr);
  sumL += 3994 * Math.sin(2 * Dr + 2 * Mpr);
  sumL += 3861 * Math.sin(4 * Dr);
  sumL += 3665 * Math.sin(2 * Dr - 3 * Mpr);
  sumL += -2689 * E * Math.sin(Mr - 2 * Mpr);
  sumL += -2602 * Math.sin(2 * Dr - Mpr + 2 * Fr);
  sumL += 2390 * E * Math.sin(2 * Dr - Mr - 2 * Mpr);
  sumL += -2348 * Math.sin(Dr + Mpr);
  sumL += 2236 * E2 * Math.sin(2 * Dr - 2 * Mr);
  sumL += -2120 * E * Math.sin(Mr + 2 * Mpr);
  sumL += -2069 * E2 * Math.sin(2 * Mr);
  sumL += 2048 * E2 * Math.sin(2 * Dr - 2 * Mr - Mpr);
  sumL += -1773 * Math.sin(2 * Dr + Mpr - 2 * Fr);
  sumL += -1595 * Math.sin(2 * Dr + 2 * Fr);
  sumL += 1215 * E * Math.sin(4 * Dr - Mr - Mpr);
  sumL += -1110 * Math.sin(2 * Mpr + 2 * Fr);
  sumL += -892 * Math.sin(3 * Dr - Mpr);
  sumL += -810 * E * Math.sin(2 * Dr + Mr + Mpr);
  sumL += 759 * E * Math.sin(4 * Dr - Mr - 2 * Mpr);
  sumL += -713 * E2 * Math.sin(2 * Mr - Mpr);
  sumL += -700 * E2 * Math.sin(2 * Dr + 2 * Mr - Mpr);
  sumL += 691 * E * Math.sin(2 * Dr + Mr - 2 * Mpr);
  sumL += 596 * E * Math.sin(2 * Dr - Mr - 2 * Fr);
  sumL += 549 * Math.sin(4 * Dr + Mpr);
  sumL += 537 * Math.sin(4 * Mpr);
  sumL += 520 * E * Math.sin(4 * Dr - Mr);
  sumL += -487 * Math.sin(Dr - 2 * Mpr);
  sumL += -399 * E * Math.sin(2 * Dr + Mr - 2 * Fr);
  sumL += -381 * Math.sin(2 * Mpr - 2 * Fr);
  sumL += 351 * E * Math.sin(Dr + Mr + Mpr);
  sumL += -340 * Math.sin(3 * Dr - 2 * Mpr);
  sumL += 330 * Math.sin(4 * Dr - 3 * Mpr);
  sumL += 327 * E * Math.sin(2 * Dr - Mr + 2 * Mpr);
  sumL += -323 * E2 * Math.sin(2 * Mr + Mpr);
  sumL += 299 * E * Math.sin(Dr + Mr - Mpr);
  sumL += 294 * Math.sin(2 * Dr + 3 * Mpr);

  // Additional corrections
  sumL += 3958 * Math.sin(A1r);
  sumL += 1962 * Math.sin(Lr - Fr);
  sumL += 318 * Math.sin(A2r);

  // Sum of latitude terms (Σb) in units of 0.000001 degrees
  let sumB = 0;
  sumB += 5128122 * Math.sin(Fr);
  sumB += 280602 * Math.sin(Mpr + Fr);
  sumB += 277693 * Math.sin(Mpr - Fr);
  sumB += 173237 * Math.sin(2 * Dr - Fr);
  sumB += 55413 * Math.sin(2 * Dr - Mpr + Fr);
  sumB += 46271 * Math.sin(2 * Dr - Mpr - Fr);
  sumB += 32573 * Math.sin(2 * Dr + Fr);
  sumB += 17198 * Math.sin(2 * Mpr + Fr);
  sumB += 9266 * Math.sin(2 * Dr + Mpr - Fr);
  sumB += 8822 * Math.sin(2 * Mpr - Fr);
  sumB += -8143 * E * Math.sin(2 * Dr - Mr - Fr);
  sumB += 4120 * Math.sin(2 * Dr - 2 * Mpr - Fr); // corrected sign/term
  sumB += -3999 * E * Math.sin(2 * Dr + Mr - Fr);
  sumB += 3203 * E * Math.sin(2 * Dr - Mr + Fr); // corrected sign
  sumB += 2942 * Math.sin(2 * Dr - 2 * Mpr + Fr); // corrected
  sumB += 2731 * E * Math.sin(2 * Dr + Mr + Fr); // corrected
  // These terms are smaller but improve accuracy. Using select terms:
  sumB += -2299 * Math.sin(2 * Mpr + Fr - 2 * Dr); // corrected
  sumB += 1834 * Math.sin(4 * Dr - Fr); // corrected

  // Additional corrections for latitude
  sumB += -2235 * Math.sin(Lr);
  sumB += 382 * Math.sin(A3r);
  sumB += 175 * Math.sin(A1r - Fr);
  sumB += 175 * Math.sin(A1r + Fr);
  sumB += 127 * Math.sin(Lr - Mpr);
  sumB += -115 * Math.sin(Lr + Mpr);

  // Sum of distance terms (Σr) in units of 0.001 km
  let sumR = 0;
  sumR += -20905355 * Math.cos(Mpr);
  sumR += -3699111 * Math.cos(2 * Dr - Mpr);
  sumR += -2955968 * Math.cos(2 * Dr);
  sumR += -569925 * Math.cos(2 * Mpr);
  sumR += 48888 * E * Math.cos(Mr);
  sumR += -3149 * Math.cos(2 * Fr);
  sumR += 246158 * Math.cos(2 * Dr - 2 * Mpr);
  sumR += -152138 * E * Math.cos(2 * Dr - Mr - Mpr);
  sumR += -170733 * Math.cos(2 * Dr + Mpr);
  sumR += -204586 * E * Math.cos(2 * Dr - Mr);
  sumR += -129620 * E * Math.cos(Mr - Mpr);
  sumR += 108743 * Math.cos(Dr);
  sumR += 104755 * E * Math.cos(Mr + Mpr);
  sumR += 10321 * Math.cos(2 * Dr - 2 * Fr);
  sumR += 79661 * Math.cos(Mpr - 2 * Fr);
  sumR += -34782 * Math.cos(4 * Dr - Mpr);
  sumR += -23210 * Math.cos(3 * Mpr);
  sumR += -21636 * Math.cos(4 * Dr - 2 * Mpr);
  sumR += 24208 * E * Math.cos(2 * Dr + Mr - Mpr);
  sumR += 30824 * E * Math.cos(2 * Dr + Mr);
  sumR += -8379 * Math.cos(Dr - Mpr);
  sumR += -16675 * E * Math.cos(Dr + Mr);
  sumR += -12831 * E * Math.cos(2 * Dr - Mr + Mpr);
  sumR += -10445 * Math.cos(2 * Dr + 2 * Mpr);
  sumR += -11650 * Math.cos(4 * Dr);
  sumR += 14403 * Math.cos(2 * Dr - 3 * Mpr);
  sumR += -7003 * E * Math.cos(Mr - 2 * Mpr);
  sumR += 10056 * E * Math.cos(2 * Dr - Mr - 2 * Mpr);
  sumR += 6322 * Math.cos(Dr + Mpr);
  sumR += -9884 * E2 * Math.cos(2 * Dr - 2 * Mr);
  sumR += 5751 * E * Math.cos(Mr + 2 * Mpr);

  // Geocentric ecliptic longitude (degrees)
  const lambda = Lp + sumL / 1000000;
  // Geocentric ecliptic latitude (degrees)
  const beta = sumB / 1000000;
  // Distance (km)
  const distance = 385000.56 + sumR / 1000;

  // Convert to Cartesian (geocentric ecliptic, km)
  const lambdaRad = lambda * DEG;
  const betaRad = beta * DEG;
  const cosB = Math.cos(betaRad);

  return {
    x: distance * cosB * Math.cos(lambdaRad),
    y: distance * cosB * Math.sin(lambdaRad),
    z: distance * Math.sin(betaRad),
    distance,
    longitude: lambda,
    latitude: beta
  };
}

/**
 * Compute Moon's ecliptic longitude (for phase calculation).
 */
export function getMoonPhaseAngle(jd) {
  const sun = getSunPosition(jd);
  const moon = getMoonPosition(jd);

  const sunLon = Math.atan2(sun.y, sun.x);
  const moonLon = Math.atan2(moon.y, moon.x);

  let elongation = moonLon - sunLon;
  elongation = ((elongation % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return elongation; // 0 = new moon, π = full moon
}
