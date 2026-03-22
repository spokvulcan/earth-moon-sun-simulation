// All physical constants in km and seconds unless noted
// Sources: NASA Fact Sheets, IAU, JPL

export const DEG = Math.PI / 180;

// === Sun ===
export const SUN_RADIUS = 695700;                    // km
export const AU = 149597870.7;                        // km (1 Astronomical Unit)
export const SUN_ANGULAR_DIAMETER = 0.5332;           // degrees from Earth

// === Earth ===
export const EARTH_EQUATORIAL_RADIUS = 6378.137;      // km
export const EARTH_POLAR_RADIUS = 6356.752;            // km
export const EARTH_MEAN_RADIUS = 6371.0;               // km
export const EARTH_OBLATENESS = EARTH_POLAR_RADIUS / EARTH_EQUATORIAL_RADIUS; // ~0.99665
export const EARTH_SIDEREAL_ROTATION = 86164.09053;   // seconds (23h 56m 4.09s)
export const EARTH_AXIAL_TILT = 23.44;                 // degrees
export const EARTH_SIDEREAL_YEAR = 365.256363004;      // days
export const EARTH_ORBITAL_ECCENTRICITY = 0.01671123;

// === Moon ===
export const MOON_MEAN_RADIUS = 1737.4;               // km
export const MOON_EQUATORIAL_RADIUS = 1738.139;        // km
export const EARTH_MOON_DISTANCE = 384400;             // km (semi-major axis)
export const MOON_SIDEREAL_PERIOD = 27.321661;         // days
export const MOON_ORBITAL_ECCENTRICITY = 0.0549;
export const MOON_ORBITAL_INCLINATION = 5.145;         // degrees to ecliptic
export const MOON_ANGULAR_DIAMETER = 0.52;             // degrees from Earth
export const EARTH_ANGULAR_DIAMETER_FROM_MOON = 1.90;  // degrees from Moon

// === Observer ===
export const HUMAN_EYE_HEIGHT = 0.0016;                // km (1.6 meters)

// === J2000 Epoch ===
// January 1, 2000, 12:00 TT = JD 2451545.0
export const J2000_JD = 2451545.0;
export const JULIAN_CENTURY = 36525.0;                 // days per Julian century

// === Earth Orbital Elements (J2000, rates per century) ===
// Source: NASA JPL Approximate Positions of Planets
export const EARTH_ORBIT = {
  a: 1.00000261,          // AU
  a_rate: 0.00000562,     // AU/century
  e: 0.01671123,
  e_rate: -0.00004392,    // /century
  I: -0.00001531,         // degrees
  I_rate: -0.01294668,    // deg/century
  L: 100.46457166,        // mean longitude, degrees
  L_rate: 35999.37244981, // deg/century
  w_bar: 102.93768193,    // longitude of perihelion, degrees
  w_bar_rate: 0.32327364, // deg/century
  omega: 0.0,             // longitude of ascending node
  omega_rate: 0.0
};

// === Moon Mean Elements (J2000) ===
// Source: Meeus "Astronomical Algorithms", NASA
export const MOON_ORBIT = {
  a: 384400,              // km (semi-major axis)
  e: 0.0549,              // eccentricity (mean)
  I: 5.145,               // inclination to ecliptic, degrees
  // Mean longitude at J2000
  L0: 218.3165,           // degrees
  L_rate: 13.17639648,    // degrees/day
  // Mean anomaly at J2000
  M0: 134.9634,           // degrees
  M_rate: 13.06499295,    // degrees/day
  // Mean argument of latitude at J2000
  F0: 93.2721,            // degrees
  F_rate: 13.22935027,    // degrees/day
  // Mean elongation at J2000
  D0: 297.8502,           // degrees
  D_rate: 12.19074912,    // degrees/day
  // Longitude of ascending node at J2000
  omega0: 125.0446,       // degrees
  omega_rate: -0.05295377 // degrees/day (18.6-year precession)
};

// === Rendering ===
export const SPHERE_SEGMENTS_HIGH = 128;
export const SPHERE_SEGMENTS_MED = 64;
export const SPHERE_SEGMENTS_LOW = 32;
