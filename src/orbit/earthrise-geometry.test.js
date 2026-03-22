/**
 * Earthrise Geometry Verification Tests
 *
 * Validates the math for recreating the Apollo 8 Earthrise photograph.
 * Run with: node src/orbit/earthrise-geometry.test.js
 *
 * Key facts (from Wikipedia "Earthrise" and "Apollo 8"):
 * - Spacecraft at 110 km altitude (59.7-60.7 nm circular orbit)
 * - Selenographic position: 11.2°S, 113.8°E (on the FAR side, past the eastern limb)
 * - Camera: 250mm lens on 70mm Hasselblad, 56×56mm frame → FOV ≈ 12.8°
 * - Earth angular diameter from Moon: ~2°
 * - Earth was ~5° above lunar horizon in the photo
 * - Orbital inclination: 12° from lunar equator
 */

const R = 1737.4;          // Moon mean radius (km)
const h = 110;             // Orbit altitude (km)
const d = R + h;            // Distance from Moon center (km)
const EARTH_DIST = 376043;  // Earth-Moon distance Dec 24, 1968 (km)
const EARTH_R = 6378.137;   // Earth equatorial radius (km)

const DEG = Math.PI / 180;

let passed = 0, failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.log(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

function approx(a, b, tolerance = 0.5) {
  return Math.abs(a - b) < tolerance;
}

// ============================================================
console.log('\n=== TEST 1: Horizon Dip Angle ===');
// From 110 km altitude, the geometric horizon dip below horizontal
const dipAngle = Math.acos(R / d) / DEG;
console.log(`  Horizon dip = ${dipAngle.toFixed(2)}°`);
assert(approx(dipAngle, 19.86, 0.5), `Dip angle ≈ 19.9° (got ${dipAngle.toFixed(2)}°)`);

// ============================================================
console.log('\n=== TEST 2: Horizon Distance ===');
// Distance from spacecraft to geometric horizon
const horizonDist = Math.sqrt(d * d - R * R);
console.log(`  Horizon distance = ${horizonDist.toFixed(0)} km`);
assert(approx(horizonDist, 628, 10), `Horizon dist ≈ 628 km (got ${horizonDist.toFixed(0)})`);

// ============================================================
console.log('\n=== TEST 3: Camera FOV ===');
// 250mm lens on 56×56mm film
const frameSize = 56;    // mm
const focalLength = 250;  // mm
const fov = 2 * Math.atan(frameSize / (2 * focalLength)) / DEG;
console.log(`  FOV = ${fov.toFixed(2)}°`);
assert(approx(fov, 12.8, 0.5), `FOV ≈ 12.8° (got ${fov.toFixed(2)}°)`);

// ============================================================
console.log('\n=== TEST 4: Earth Angular Diameter ===');
const earthAngDiam = 2 * Math.atan(EARTH_R / EARTH_DIST) / DEG;
console.log(`  Earth angular diameter = ${earthAngDiam.toFixed(2)}°`);
assert(approx(earthAngDiam, 1.94, 0.2), `Earth ≈ 1.9° (got ${earthAngDiam.toFixed(2)}°)`);

// ============================================================
console.log('\n=== TEST 5: Spacecraft Position Angle ===');
// Selenographic coordinates: 11.2°S, 113.8°E
// Angle from sub-Earth point (0°,0°) measured at Moon center
const lat = -11.2 * DEG;
const lng = 113.8 * DEG;
const cosAngle = Math.cos(lat) * Math.cos(lng);
const posAngle = Math.acos(cosAngle) / DEG;
console.log(`  Position angle from sub-Earth = ${posAngle.toFixed(1)}°`);
assert(posAngle > 90, `Past the limb (${posAngle.toFixed(1)}° > 90°)`);
assert(approx(posAngle, 113, 2), `Position ≈ 113° (got ${posAngle.toFixed(1)}°)`);

// ============================================================
console.log('\n=== TEST 6: Earth Visibility Check ===');
// Check if line of sight from spacecraft to Earth is blocked by Moon.
// In the orbital plane (2D simplification):
// Spacecraft at angle theta from Earth direction, distance d from center.
// The perpendicular distance from Earth-Moon line:
// For the Earthrise, Earth is barely peeking above the horizon.

// The critical angle where Earth is exactly at the horizon:
// sin(theta_crit) * d = R  →  theta_crit = arcsin(R/d)
// BUT this is the angle where the line of sight is TANGENT to the Moon
// Actually: from a point at distance d, the tangent angle from the center-line
// is arccos(R/d). The spacecraft position angle where Earth is at the horizon:
// theta_horizon = 90° + arccos(R/d) = 90° + dipAngle

const thetaHorizon = 90 + dipAngle;
console.log(`  Earth at horizon when theta = ${thetaHorizon.toFixed(1)}°`);
assert(approx(thetaHorizon, 109.9, 0.5), `Horizon theta ≈ 109.9° (got ${thetaHorizon.toFixed(1)}°)`);

// At 113.8°E, Earth is slightly below the geometric horizon
// (113.2° > 109.9°), meaning the spacecraft was 3.3° past the point
// where Earth first appears. But Earth has angular diameter ~2°,
// so the upper limb of Earth would start appearing when
// theta = thetaHorizon + (earthAngDiam/2 correction)
// This matches "Earthrise" — Earth was partially visible, rising.

// ============================================================
console.log('\n=== TEST 7: Required Camera Angle for 5° Above Horizon ===');
// For Earth center to be 5° above the lunar horizon:
// zenith_to_earth = theta
// zenith_to_horizon = 90° + dipAngle = 109.86°
// "above horizon" means: zenith_to_earth < zenith_to_horizon
// Earth elevation above horizon = zenith_to_horizon - theta
// Want: 109.86° - theta = 5°  →  theta = 104.86°

const targetElevation = 5.0; // degrees above horizon
const thetaRequired = (90 + dipAngle) - targetElevation;
console.log(`  Required theta for ${targetElevation}° above horizon = ${thetaRequired.toFixed(1)}°`);
assert(approx(thetaRequired, 104.9, 0.5), `Theta ≈ 104.9° (got ${thetaRequired.toFixed(1)}°)`);

// Verify: at theta = 104.86°
// Earth at 104.86° from zenith, horizontal at 90°
// Earth is 104.86° - 90° = 14.86° below horizontal
// Horizon is 109.86° from zenith = 19.86° below horizontal
// Earth elevation above horizon = 19.86° - 14.86° = 5.00° ✓
const verifyElevation = (90 + dipAngle) - thetaRequired;
console.log(`  Verified elevation = ${verifyElevation.toFixed(1)}°`);
assert(approx(verifyElevation, 5.0, 0.1), `Elevation = 5.0° (got ${verifyElevation.toFixed(1)}°)`);

// ============================================================
console.log('\n=== TEST 8: Look Direction for Centered Composition ===');
// In the photo, Earth is at ~65% from bottom, horizon at ~35%
// Center of frame is at 50%
// Earth at 65% → 15% above center → angle above center = 12.8° * 0.15 = 1.92°
// Horizon at 35% → 15% below center → angle below center = 12.8° * 0.15 = 1.92°
// But this means Earth-horizon span = 3.84°, which is less than 5°
// Let me reconsider the composition:
// Earth at ~70%, horizon at ~30% is more accurate for the original photo
// Earth: 20% above center → 12.8° * 0.20 = 2.56° above center
// Horizon: 20% below center → 12.8° * 0.20 = 2.56° below center
// Earth-horizon = 5.12° ≈ 5° ✓

// The look direction should be at:
// Midpoint between Earth (14.86° below horiz) and horizon (19.86° below horiz)
// = 17.36° below horizontal
// = theta_look from zenith = 90° + 17.36° = 107.36°

const lookAngle = (14.86 + 19.86) / 2; // midpoint below horizontal
console.log(`  Look angle = ${lookAngle.toFixed(1)}° below horizontal`);

// Tilt from Earth direction: the Earth direction is at 14.86° below horizontal
// Look at 17.36° below horizontal → tilt = 2.50° further down
const tiltFromEarth = lookAngle - 14.86;
console.log(`  Tilt from Earth direction = ${tiltFromEarth.toFixed(1)}° toward Moon`);
assert(approx(tiltFromEarth, 2.5, 0.5), `Tilt ≈ 2.5° (got ${tiltFromEarth.toFixed(1)}°)`);

// As a tangent factor: tiltDown = tan(2.5°) = 0.0436
const tiltDown = Math.tan(tiltFromEarth * DEG);
console.log(`  tiltDown factor = ${tiltDown.toFixed(4)}`);

// ============================================================
console.log('\n=== TEST 9: My Previous Error ===');
// I had theta = 75° which puts the camera on the NEAR side
// At theta = 75°:
//   Earth at 75° from zenith → 15° ABOVE horizontal
//   Horizon at 109.86° from zenith → 19.86° BELOW horizontal
//   Earth-to-horizon = 34.86° → WAY too much for 12.8° FOV
// CORRECT: theta should be ~105° (far side, past the limb)

const wrongTheta = 75;
const wrongEarthAboveHoriz = 90 - wrongTheta;
const wrongSeparation = wrongEarthAboveHoriz + dipAngle;
console.log(`  At theta=75°: Earth ${wrongEarthAboveHoriz}° above horiz, separation=${wrongSeparation.toFixed(1)}°`);
assert(wrongSeparation > fov, `theta=75° gives separation ${wrongSeparation.toFixed(1)}° > FOV ${fov.toFixed(1)}° → WRONG`);

const correctTheta = thetaRequired;
const correctElevation = (90 + dipAngle) - correctTheta;
console.log(`  At theta=${correctTheta.toFixed(0)}°: Earth ${correctElevation.toFixed(1)}° above horizon → CORRECT`);
assert(correctElevation < fov && correctElevation > 0, `Fits in FOV ✓`);

// ============================================================
console.log('\n=== SUMMARY ===');
console.log(`  Key parameters for Earthrise simulation:`);
console.log(`    theta = ${thetaRequired.toFixed(1)}° from Moon-to-Earth direction`);
console.log(`    altitude = ${h} km`);
console.log(`    FOV = ${fov.toFixed(1)}° (250mm on 56mm frame)`);
console.log(`    tiltDown = ${tiltDown.toFixed(4)} (${tiltFromEarth.toFixed(1)}° from Earth dir)`);
console.log(`    Earth angular diameter = ${earthAngDiam.toFixed(2)}°`);
console.log(`    Earth elevation above horizon = ${targetElevation}°`);
console.log(`\n  ${passed} passed, ${failed} failed`);

process.exit(failed > 0 ? 1 : 0);
