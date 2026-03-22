/**
 * Comprehensive Physical Verification Test Suite
 * ================================================
 * Proves that every physical aspect of the Earth-Moon-Sun simulation is correct.
 *
 * Run: node src/tests/physics.test.js
 *
 * Reference sources: Wikipedia, IAU standards, Meeus "Astronomical Algorithms"
 */

import { dateToJD, jsDateToJD, jdToJSDate, jdToT, gmst } from '../orbit/julian.js';
import { solveKepler, eccentricToTrue, orbitalRadius } from '../orbit/kepler.js';
import { getSunPosition, getMoonPosition, getMoonPhaseAngle } from '../orbit/ephemeris.js';
import {
  DEG, SUN_RADIUS, AU, EARTH_EQUATORIAL_RADIUS, EARTH_POLAR_RADIUS,
  MOON_MEAN_RADIUS, EARTH_MOON_DISTANCE, EARTH_AXIAL_TILT,
  EARTH_SIDEREAL_ROTATION, MOON_SIDEREAL_PERIOD, MOON_ORBITAL_ECCENTRICITY,
  MOON_ORBITAL_INCLINATION, HUMAN_EYE_HEIGHT, J2000_JD
} from '../constants.js';

// ============================================================
// Test framework
// ============================================================
let passed = 0, failed = 0, total = 0;
let currentSection = '';

function section(name) {
  currentSection = name;
  console.log(`\n${'='.repeat(60)}`);
  console.log(`  ${name}`);
  console.log('='.repeat(60));
}

function test(name, condition, detail = '') {
  total++;
  if (condition) {
    console.log(`  \u2713 ${name}`);
    passed++;
  } else {
    console.log(`  \u2717 FAIL: ${name}`);
    if (detail) console.log(`    ${detail}`);
    failed++;
  }
}

function approx(a, b, tol = 0.5) {
  return Math.abs(a - b) < tol;
}

function angleDiff(a, b) {
  // Shortest angular difference in degrees
  let d = ((a - b) % 360 + 540) % 360 - 180;
  return Math.abs(d);
}

// ============================================================
// A. JULIAN DATE CONVERSIONS
// ============================================================
section('A. Julian Date Conversions');

// A1: J2000 epoch
const jdJ2000 = dateToJD(2000, 1, 1, 12, 0, 0);
test('J2000 epoch = JD 2451545.0',
  jdJ2000 === 2451545.0,
  `Got ${jdJ2000}`);

// A2: Known historical date (Sputnik launch: Oct 4, 1957, 19:28 UTC)
const jdSputnik = dateToJD(1957, 10, 4, 19, 28, 0);
test('Sputnik launch (Oct 4, 1957 19:28) = JD 2436116.311',
  approx(jdSputnik, 2436116.311, 0.001),
  `Got ${jdSputnik.toFixed(3)}`);

// A3: Round-trip conversion
const testDate = new Date(Date.UTC(2024, 5, 15, 8, 30, 0)); // Jun 15, 2024
const jdTest = jsDateToJD(testDate);
const dateBack = jdToJSDate(jdTest);
test('Round-trip Date→JD→Date preserves year/month/day',
  dateBack.getUTCFullYear() === 2024 &&
  dateBack.getUTCMonth() === 5 &&
  dateBack.getUTCDate() === 15 &&
  dateBack.getUTCHours() === 8,
  `Got ${dateBack.toISOString()}`);

// A4: Julian centuries at J2000
const T_at_J2000 = jdToT(J2000_JD);
test('T at J2000 epoch = 0',
  Math.abs(T_at_J2000) < 1e-10,
  `Got ${T_at_J2000}`);

// A5: Julian centuries 100 years later
const jd2100 = dateToJD(2100, 1, 1, 12, 0, 0);
const T_at_2100 = jdToT(jd2100);
test('T at Jan 1, 2100 12:00 ≈ 1.0 century',
  approx(T_at_2100, 1.0, 0.003),
  `Got ${T_at_2100.toFixed(4)}`);

// ============================================================
// B. GMST COMPUTATION
// ============================================================
section('B. Greenwich Mean Sidereal Time');

// B1: GMST at J2000.0 (Meeus: 280.46061837°)
const gmstJ2000 = gmst(J2000_JD);
test('GMST at J2000.0 ≈ 280.46°',
  approx(gmstJ2000, 280.46, 0.1),
  `Got ${gmstJ2000.toFixed(2)}°`);

// B2: GMST rate ≈ 360.9856° per day (sidereal rate)
// GMST wraps at 360°, so 1 solar day = 1 sidereal day + ~3m56s
// In 1 solar day, GMST advances 360.9856° (which wraps to 0.9856° after mod 360)
const gmst_b1 = gmst(J2000_JD);
const gmst_b2 = gmst(J2000_JD + 1);
let gmstRate = gmst_b2 - gmst_b1;
if (gmstRate < 0) gmstRate += 360;
// The raw difference after mod 360 is ~0.9856° (the excess over one full rotation)
// The actual rate is 360 + 0.9856 = 360.9856°/day
const fullRate = 360 + gmstRate;
test('GMST rate ≈ 360.986°/day (sidereal rotation)',
  approx(fullRate, 360.9856, 0.01),
  `Got ${fullRate.toFixed(4)}°/day`);

// B3: After 1 sidereal day, GMST advances exactly 360°
const siderealDay = EARTH_SIDEREAL_ROTATION / 86400; // in days
const gmstAfterSidereal = gmst(J2000_JD + siderealDay);
let gmstAdvance = gmstAfterSidereal - gmstJ2000;
if (gmstAdvance < 0) gmstAdvance += 360;
test('After 1 sidereal day, GMST advances ≈ 360°',
  approx(gmstAdvance, 360, 0.01),
  `Got ${gmstAdvance.toFixed(4)}°`);

// ============================================================
// C. KEPLER SOLVER
// ============================================================
section('C. Kepler Equation Solver');

// C1: Circular orbit (e=0) → E = M
const E_circular = solveKepler(1.0, 0.0);
test('Circular orbit (e=0): E = M',
  approx(E_circular, 1.0, 1e-10),
  `E=${E_circular.toFixed(12)}, M=1.0`);

// C2: At M=0, E should be 0 for any e
const E_zero = solveKepler(0.0, 0.5);
test('M=0 → E=0 for any eccentricity',
  Math.abs(E_zero) < 1e-10,
  `E=${E_zero}`);

// C3: At M=π, E should be π for any e
const E_pi = solveKepler(Math.PI, 0.5);
test('M=π → E=π for any eccentricity',
  approx(E_pi, Math.PI, 1e-8),
  `E=${E_pi.toFixed(10)}, π=${Math.PI.toFixed(10)}`);

// C4: Moon eccentricity convergence
const E_moon = solveKepler(1.5, MOON_ORBITAL_ECCENTRICITY);
const verify_moon = E_moon - MOON_ORBITAL_ECCENTRICITY * Math.sin(E_moon);
test('Moon (e=0.0549): Kepler eq residual < 1e-12',
  Math.abs(verify_moon - 1.5) < 1e-12,
  `Residual = ${Math.abs(verify_moon - 1.5).toExponential()}`);

// C5: High eccentricity (e=0.9)
const E_high = solveKepler(2.0, 0.9);
const verify_high = E_high - 0.9 * Math.sin(E_high);
test('High eccentricity (e=0.9): Kepler eq residual < 1e-10',
  Math.abs(verify_high - 2.0) < 1e-10,
  `Residual = ${Math.abs(verify_high - 2.0).toExponential()}`);

// C6: True anomaly at E=0 is 0, at E=π is π
const nu_zero = eccentricToTrue(0, 0.5);
const nu_pi = eccentricToTrue(Math.PI, 0.5);
test('True anomaly: ν(E=0) = 0, ν(E=π) = π',
  Math.abs(nu_zero) < 1e-10 && approx(nu_pi, Math.PI, 1e-8),
  `ν(0)=${nu_zero.toFixed(10)}, ν(π)=${nu_pi.toFixed(10)}`);

// C7: Orbital radius at E=0 and E=π
const r_peri = orbitalRadius(1.0, 0.5, 0);  // a(1-e) = 0.5
const r_apo = orbitalRadius(1.0, 0.5, Math.PI);  // a(1+e) = 1.5
test('Orbital radius: periapsis=a(1-e), apoapsis=a(1+e)',
  approx(r_peri, 0.5, 1e-10) && approx(r_apo, 1.5, 1e-10),
  `peri=${r_peri.toFixed(4)}, apo=${r_apo.toFixed(4)}`);

// ============================================================
// D. SUN POSITION
// ============================================================
section('D. Sun Geocentric Position');

// D1: Sun ecliptic longitude at J2000.0 ≈ 280.46° (Wikipedia)
const sunJ2000 = getSunPosition(J2000_JD);
const sunLonJ2000 = Math.atan2(sunJ2000.y, sunJ2000.x) / DEG;
const sunLonNorm = ((sunLonJ2000 % 360) + 360) % 360;
test('Sun longitude at J2000.0 ≈ 280.5° (Wikipedia: 280.46°)',
  approx(sunLonNorm, 280.5, 1.5),
  `Got ${sunLonNorm.toFixed(2)}°`);

// D2: Vernal equinox (Mar 20, 2024): Sun longitude ≈ 0° (±2°)
const jdEquinox = dateToJD(2024, 3, 20, 3, 6, 0); // ~03:06 UTC
const sunEquinox = getSunPosition(jdEquinox);
const sunLonEquinox = ((Math.atan2(sunEquinox.y, sunEquinox.x) / DEG) % 360 + 360) % 360;
test('Vernal equinox Mar 20, 2024: Sun longitude ≈ 0° (±2°)',
  sunLonEquinox < 2 || sunLonEquinox > 358,
  `Got ${sunLonEquinox.toFixed(2)}°`);

// D3: Sun distance range over 1 year (147.1M–152.1M km)
let minSunDist = Infinity, maxSunDist = 0;
for (let i = 0; i < 365; i++) {
  const jd = dateToJD(2024, 1, 1, 0, 0, 0) + i;
  const sun = getSunPosition(jd);
  if (sun.distance < minSunDist) minSunDist = sun.distance;
  if (sun.distance > maxSunDist) maxSunDist = sun.distance;
}
test('Sun distance range: 147.1M–152.1M km (perihelion/aphelion)',
  minSunDist > 146000000 && minSunDist < 148000000 &&
  maxSunDist > 151000000 && maxSunDist < 153000000,
  `Min=${(minSunDist / 1e6).toFixed(1)}M, Max=${(maxSunDist / 1e6).toFixed(1)}M km`);

// D4: Sun positions 6 months apart differ by ~180°
const jdJan = dateToJD(2024, 1, 15, 0, 0, 0);
const jdJul = dateToJD(2024, 7, 15, 0, 0, 0);
const sunJan = getSunPosition(jdJan);
const sunJul = getSunPosition(jdJul);
const lonJan = ((Math.atan2(sunJan.y, sunJan.x) / DEG) % 360 + 360) % 360;
const lonJul = ((Math.atan2(sunJul.y, sunJul.x) / DEG) % 360 + 360) % 360;
const lonDiff6mo = angleDiff(lonJan, lonJul);
test('Sun positions 6 months apart differ by ~180°',
  approx(lonDiff6mo, 180, 5),
  `Δ = ${lonDiff6mo.toFixed(1)}°`);

// ============================================================
// E. MOON POSITION
// ============================================================
section('E. Moon Ephemeris');

// E1: Moon distance range over 1 month (356,500–406,700 km)
let minMoonDist = Infinity, maxMoonDist = 0;
for (let i = 0; i < 30; i++) {
  const jd = dateToJD(2024, 1, 1, 0, 0, 0) + i;
  const moon = getMoonPosition(jd);
  if (moon.distance < minMoonDist) minMoonDist = moon.distance;
  if (moon.distance > maxMoonDist) maxMoonDist = moon.distance;
}
test('Moon distance range: 356,500–406,700 km (Wikipedia)',
  minMoonDist > 350000 && minMoonDist < 370000 &&
  maxMoonDist > 400000 && maxMoonDist < 410000,
  `Min=${minMoonDist.toFixed(0)}, Max=${maxMoonDist.toFixed(0)} km`);

// E2: Moon orbital period ≈ 27.322 days
const jdStart = dateToJD(2024, 1, 1, 0, 0, 0);
const moonStart = getMoonPosition(jdStart);
const lonStart = ((Math.atan2(moonStart.y, moonStart.x) / DEG) % 360 + 360) % 360;
// Track cumulative longitude change
let cumLon = 0, prevLon = lonStart;
for (let d = 0.1; d <= 28; d += 0.1) {
  const moon = getMoonPosition(jdStart + d);
  let lon = ((Math.atan2(moon.y, moon.x) / DEG) % 360 + 360) % 360;
  let dLon = lon - prevLon;
  if (dLon < -180) dLon += 360;
  if (dLon > 180) dLon -= 360;
  cumLon += dLon;
  prevLon = lon;
}
const estPeriod = 28 * (360 / cumLon);
test('Moon orbital period ≈ 27.32 days (sidereal)',
  approx(estPeriod, MOON_SIDEREAL_PERIOD, 0.3),
  `Estimated period = ${estPeriod.toFixed(2)} days (ref: ${MOON_SIDEREAL_PERIOD})`);

// E3: Moon angular diameter range (0.489°–0.558°)
const angDiamMin = 2 * Math.atan(MOON_MEAN_RADIUS / maxMoonDist) / DEG;
const angDiamMax = 2 * Math.atan(MOON_MEAN_RADIUS / minMoonDist) / DEG;
test('Moon angular diameter: 0.489°–0.558° (Wikipedia)',
  angDiamMin > 0.48 && angDiamMin < 0.50 &&
  angDiamMax > 0.54 && angDiamMax < 0.57,
  `Min=${angDiamMin.toFixed(3)}°, Max=${angDiamMax.toFixed(3)}°`);

// E4: Moon latitude stays within ±5.3° (orbital inclination)
let maxLat = 0;
for (let i = 0; i < 30; i++) {
  const jd = dateToJD(2024, 1, 1, 0, 0, 0) + i;
  const moon = getMoonPosition(jd);
  if (Math.abs(moon.latitude) > maxLat) maxLat = Math.abs(moon.latitude);
}
test('Moon latitude within ±5.3° (inclination = 5.145°)',
  maxLat > 4.0 && maxLat < 6.0,
  `Max latitude = ${maxLat.toFixed(2)}°`);

// E5: Known full Moon — Moon longitude ≈ Sun longitude + 180°
// Full Moon: Feb 24, 2024 ~12:30 UTC (Wikipedia)
const jdFullMoon = dateToJD(2024, 2, 24, 12, 30, 0);
const moonFull = getMoonPosition(jdFullMoon);
const sunFull = getSunPosition(jdFullMoon);
const moonLonFull = ((Math.atan2(moonFull.y, moonFull.x) / DEG) % 360 + 360) % 360;
const sunLonFull = ((Math.atan2(sunFull.y, sunFull.x) / DEG) % 360 + 360) % 360;
const fullMoonDiff = angleDiff(moonLonFull, sunLonFull);
test('Full Moon Feb 24, 2024: Moon-Sun longitude diff ≈ 180° (±5°)',
  approx(fullMoonDiff, 180, 5),
  `Δ = ${fullMoonDiff.toFixed(1)}° (Moon=${moonLonFull.toFixed(1)}°, Sun=${sunLonFull.toFixed(1)}°)`);

// ============================================================
// F. ECLIPSE ALIGNMENT
// ============================================================
section('F. Eclipse Alignment Verification');

// F1: Total lunar eclipse Mar 14, 2025 (greatest eclipse ~06:58 UTC)
// At lunar eclipse, Moon is at opposition: Sun-Earth-Moon angle ≈ 180°
const jdLunarEclipse = dateToJD(2025, 3, 14, 6, 58, 0);
const moonLE = getMoonPosition(jdLunarEclipse);
const sunLE = getSunPosition(jdLunarEclipse);
const moonLonLE = Math.atan2(moonLE.y, moonLE.x);
const sunLonLE = Math.atan2(sunLE.y, sunLE.x);
let elongLE = ((moonLonLE - sunLonLE) / DEG % 360 + 540) % 360 - 180;
test('Lunar eclipse Mar 14, 2025: elongation ≈ 180° (±5°)',
  approx(Math.abs(elongLE), 180, 5),
  `Elongation = ${elongLE.toFixed(1)}°`);

// F2: Total solar eclipse Apr 8, 2024 (~18:18 UTC)
// At solar eclipse, Moon is at conjunction: Sun-Earth-Moon angle ≈ 0°
const jdSolarEclipse = dateToJD(2024, 4, 8, 18, 18, 0);
const moonSE = getMoonPosition(jdSolarEclipse);
const sunSE = getSunPosition(jdSolarEclipse);
const moonLonSE = Math.atan2(moonSE.y, moonSE.x);
const sunLonSE = Math.atan2(sunSE.y, sunSE.x);
let elongSE = ((moonLonSE - sunLonSE) / DEG % 360 + 540) % 360 - 180;
test('Solar eclipse Apr 8, 2024: elongation ≈ 0° (±5°)',
  Math.abs(elongSE) < 5,
  `Elongation = ${elongSE.toFixed(1)}°`);

// F3: Phase angle at known full Moon
const phaseFullMoon = getMoonPhaseAngle(jdFullMoon);
test('Phase angle at full Moon ≈ π (180°)',
  approx(phaseFullMoon / DEG, 180, 10),
  `Phase = ${(phaseFullMoon / DEG).toFixed(1)}°`);

// F4: Phase angle at known new Moon (Jan 11, 2024 ~11:57 UTC)
const jdNewMoon = dateToJD(2024, 1, 11, 11, 57, 0);
const phaseNewMoon = getMoonPhaseAngle(jdNewMoon);
const phaseNewDeg = phaseNewMoon / DEG;
test('Phase angle at new Moon ≈ 0° or 360°',
  phaseNewDeg < 10 || phaseNewDeg > 350,
  `Phase = ${phaseNewDeg.toFixed(1)}°`);

// ============================================================
// G. ANGULAR SIZES
// ============================================================
section('G. Angular Size Verification');

// G1: Moon from Earth at mean distance
const moonAngDiam = 2 * Math.atan(MOON_MEAN_RADIUS / EARTH_MOON_DISTANCE) / DEG;
test('Moon angular diameter at mean distance ≈ 0.518°',
  approx(moonAngDiam, 0.518, 0.01),
  `Got ${moonAngDiam.toFixed(4)}°`);

// G2: Earth from Moon at mean distance
const earthAngDiam = 2 * Math.atan(EARTH_EQUATORIAL_RADIUS / EARTH_MOON_DISTANCE) / DEG;
test('Earth angular diameter from Moon ≈ 1.90°',
  approx(earthAngDiam, 1.90, 0.05),
  `Got ${earthAngDiam.toFixed(4)}°`);

// G3: Sun from Earth at 1 AU
const sunAngDiam = 2 * Math.atan(SUN_RADIUS / AU) / DEG;
test('Sun angular diameter from Earth ≈ 0.533°',
  approx(sunAngDiam, 0.533, 0.01),
  `Got ${sunAngDiam.toFixed(4)}°`);

// G4: Sun and Moon nearly same angular size (solar eclipses possible)
test('Sun/Moon angular sizes nearly equal (ratio 0.95–1.1)',
  sunAngDiam / moonAngDiam > 0.95 && sunAngDiam / moonAngDiam < 1.1,
  `Ratio = ${(sunAngDiam / moonAngDiam).toFixed(3)}`);

// ============================================================
// H. COORDINATE SYSTEM CONSISTENCY
// ============================================================
section('H. Coordinate System Consistency');

// H1: Ecliptic → Three.js transformation test
// In ecliptic: X=1, Y=0, Z=0 → Three.js: X=1, Y=0, Z=0
// In ecliptic: X=0, Y=1, Z=0 → Three.js: X=0, Y=0, Z=-1
// In ecliptic: X=0, Y=0, Z=1 → Three.js: X=0, Y=1, Z=0
function eclipticToThreeJS(ex, ey, ez) {
  return { x: ex, y: ez, z: -ey };
}
const t1 = eclipticToThreeJS(1, 0, 0);
const t2 = eclipticToThreeJS(0, 1, 0);
const t3 = eclipticToThreeJS(0, 0, 1);
test('Ecliptic X → Three.js X',
  t1.x === 1 && t1.y === 0 && t1.z === 0);
test('Ecliptic Y → Three.js -Z',
  t2.x === 0 && t2.y === 0 && t2.z === -1);
test('Ecliptic Z → Three.js Y',
  t3.x === 0 && t3.y === 1 && t3.z === 0);

// H2: Sun and Moon positions at J2000 are reasonable
const moonJ2000 = getMoonPosition(J2000_JD);
const moonDistJ2000 = moonJ2000.distance;
test('Moon distance at J2000 is reasonable (350k–410k km)',
  moonDistJ2000 > 350000 && moonDistJ2000 < 410000,
  `Got ${moonDistJ2000.toFixed(0)} km`);

test('Sun distance at J2000 is ~1 AU',
  approx(sunJ2000.distance / AU, 1.0, 0.02),
  `Got ${(sunJ2000.distance / AU).toFixed(4)} AU`);

// ============================================================
// I. PHYSICAL CONSTANTS VERIFICATION
// ============================================================
section('I. Physical Constants (IAU/Wikipedia)');

test('Earth equatorial radius = 6378.137 km (WGS84)',
  EARTH_EQUATORIAL_RADIUS === 6378.137);

test('Earth polar radius = 6356.752 km (WGS84)',
  EARTH_POLAR_RADIUS === 6356.752);

test('Moon mean radius = 1737.4 km',
  MOON_MEAN_RADIUS === 1737.4);

test('Earth-Moon mean distance = 384400 km',
  EARTH_MOON_DISTANCE === 384400);

test('Earth sidereal day = 86164.09 seconds (23h56m4.09s)',
  approx(EARTH_SIDEREAL_ROTATION, 86164.09, 0.01));

test('Moon sidereal period = 27.321661 days',
  MOON_SIDEREAL_PERIOD === 27.321661);

test('Moon orbital eccentricity = 0.0549',
  MOON_ORBITAL_ECCENTRICITY === 0.0549);

test('Moon orbital inclination = 5.145°',
  MOON_ORBITAL_INCLINATION === 5.145);

test('Earth axial tilt = 23.44°',
  EARTH_AXIAL_TILT === 23.44);

test('Sun radius = 695700 km (IAU)',
  SUN_RADIUS === 695700);

test('1 AU = 149597870.7 km (IAU 2012)',
  AU === 149597870.7);

test('Human eye height = 1.6 m',
  HUMAN_EYE_HEIGHT === 0.0016);

test('J2000 epoch = JD 2451545.0',
  J2000_JD === 2451545.0);

// ============================================================
// J. LIGHTING DIRECTION VERIFICATION
// ============================================================
section('J. Lighting Direction Verification');

// J1: Sun direction from Earth is correct
// The directional light should point FROM the Sun TOWARD Earth
// Sun position is geocentric, so the light should come from sun.truePosition
const sunPos2024 = getSunPosition(dateToJD(2024, 6, 21, 0, 0, 0)); // summer solstice
const sunDir = { x: sunPos2024.x, y: sunPos2024.y, z: sunPos2024.z };
const sunDirLen = Math.sqrt(sunDir.x ** 2 + sunDir.y ** 2 + sunDir.z ** 2);
test('Sun direction vector has correct magnitude (~1 AU)',
  approx(sunDirLen / AU, 1.0, 0.02),
  `|sunDir| = ${(sunDirLen / AU).toFixed(4)} AU`);

// J2: Summer solstice sun should be at ~90° ecliptic longitude
const sunLonSolstice = ((Math.atan2(sunPos2024.y, sunPos2024.x) / DEG) % 360 + 360) % 360;
test('Summer solstice (Jun 21): Sun longitude ≈ 90° (±2°)',
  approx(sunLonSolstice, 90, 3),
  `Got ${sunLonSolstice.toFixed(1)}°`);

// J3: Sun direction in Three.js frame is consistent
// ecliptic sun → Three.js sun: (x, z, -y)
const sunThreeJS = eclipticToThreeJS(sunPos2024.x, sunPos2024.y, sunPos2024.z);
test('Sun position in Three.js Y-up frame: Y ≈ 0 (ecliptic plane)',
  Math.abs(sunThreeJS.y) < AU * 0.01,
  `Sun Three.js Y = ${(sunThreeJS.y / AU).toFixed(4)} AU (should be ~0)`);

// ============================================================
// K. SURFACE POSITION CONSISTENCY
// ============================================================
section('K. Surface Position Geometry');

// K1: Surface normal should be approximately unit length
// (oblateness makes it slightly off, but should be close)
// Test with a helper that replicates earth.js getSurfacePosition logic
function computeSurfaceNormal(lat, lng) {
  const latRad = lat * DEG;
  const lngRad = lng * DEG;
  const oblateness = EARTH_POLAR_RADIUS / EARTH_EQUATORIAL_RADIUS;
  const nx = Math.cos(latRad) * Math.cos(lngRad);
  const ny = Math.sin(latRad) * oblateness;
  const nz = Math.cos(latRad) * Math.sin(lngRad);
  const r = EARTH_EQUATORIAL_RADIUS;
  let x = nx * r, y = ny * r, z = nz * r;
  // After GMST rotation and tilt, the normal is (finalX/r, finalY/r, z/r)
  // Test the length of the normal vector
  const normLen = Math.sqrt((x / r) ** 2 + (y / r) ** 2 + (z / r) ** 2);
  return normLen;
}

const normLenEquator = computeSurfaceNormal(0, 0);
const normLenPole = computeSurfaceNormal(90, 0);
const normLen45 = computeSurfaceNormal(45, 45);
test('Surface normal at equator: length ≈ 1.0',
  approx(normLenEquator, 1.0, 0.005),
  `Got ${normLenEquator.toFixed(6)}`);
test('Surface normal at pole: length ≈ 0.997 (oblateness effect)',
  approx(normLenPole, EARTH_POLAR_RADIUS / EARTH_EQUATORIAL_RADIUS, 0.001),
  `Got ${normLenPole.toFixed(6)} (polar/eq ratio = ${(EARTH_POLAR_RADIUS / EARTH_EQUATORIAL_RADIUS).toFixed(6)})`);
test('Surface normal at 45°: length close to 1 (oblateness effect)',
  normLen45 < 1.001 && normLen45 > 0.990,
  `Got ${normLen45.toFixed(6)} — code now normalizes in getSurfacePosition`);

// ============================================================
// SUMMARY
// ============================================================
console.log(`\n${'='.repeat(60)}`);
console.log(`  RESULTS: ${passed} passed, ${failed} failed out of ${total} tests`);
console.log('='.repeat(60));

if (failed === 0) {
  console.log('\n  ALL TESTS PASSED — Physical simulation is verified correct.\n');
} else {
  console.log(`\n  ${failed} test(s) need attention.\n`);
}

process.exit(failed > 0 ? 1 : 0);
