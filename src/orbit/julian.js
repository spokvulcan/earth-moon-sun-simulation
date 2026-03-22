import { J2000_JD, JULIAN_CENTURY } from '../constants.js';

/**
 * Convert a calendar date (UTC) to Julian Date.
 * Valid for dates from 1 March 4801 BC onward (Gregorian calendar).
 * Formula from Meeus, "Astronomical Algorithms", Ch. 7.
 */
export function dateToJD(year, month, day, hour = 0, minute = 0, second = 0) {
  const dayFraction = day + (hour + minute / 60 + second / 3600) / 24;

  let Y = year;
  let M = month;
  if (M <= 2) {
    Y -= 1;
    M += 12;
  }

  const A = Math.floor(Y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (Y + 4716)) +
         Math.floor(30.6001 * (M + 1)) +
         dayFraction + B - 1524.5;
}

/**
 * Convert a JavaScript Date object to Julian Date.
 */
export function jsDateToJD(date) {
  return dateToJD(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours(),
    date.getUTCMinutes(),
    date.getUTCSeconds() + date.getUTCMilliseconds() / 1000
  );
}

/**
 * Convert Julian Date to a JavaScript Date object.
 */
export function jdToJSDate(jd) {
  // Algorithm from Meeus, Ch. 7
  const Z = Math.floor(jd + 0.5);
  const F = (jd + 0.5) - Z;

  let A;
  if (Z < 2299161) {
    A = Z;
  } else {
    const alpha = Math.floor((Z - 1867216.25) / 36524.25);
    A = Z + 1 + alpha - Math.floor(alpha / 4);
  }

  const B = A + 1524;
  const C = Math.floor((B - 122.1) / 365.25);
  const D = Math.floor(365.25 * C);
  const E = Math.floor((B - D) / 30.6001);

  const day = B - D - Math.floor(30.6001 * E) + F;
  const month = E < 14 ? E - 1 : E - 13;
  const year = month > 2 ? C - 4716 : C - 4715;

  const dayInt = Math.floor(day);
  const dayFrac = day - dayInt;
  const hours = dayFrac * 24;
  const hourInt = Math.floor(hours);
  const minutes = (hours - hourInt) * 60;
  const minuteInt = Math.floor(minutes);
  const seconds = (minutes - minuteInt) * 60;
  const secondInt = Math.floor(seconds);
  const ms = Math.round((seconds - secondInt) * 1000);

  return new Date(Date.UTC(year, month - 1, dayInt, hourInt, minuteInt, secondInt, ms));
}

/**
 * Compute Julian centuries since J2000.0 epoch.
 * T is the standard variable used in astronomical algorithms.
 */
export function jdToT(jd) {
  return (jd - J2000_JD) / JULIAN_CENTURY;
}

/**
 * Compute days since J2000.0 epoch.
 */
export function jdToDaysSinceJ2000(jd) {
  return jd - J2000_JD;
}

/**
 * Greenwich Mean Sidereal Time in degrees.
 * Gives Earth's rotation angle for any Julian Date.
 * Source: Meeus, Ch. 12.
 */
export function gmst(jd) {
  const T = jdToT(jd);
  // GMST at 0h UT1 in degrees
  let theta = 280.46061837 +
              360.98564736629 * (jd - J2000_JD) +
              0.000387933 * T * T -
              T * T * T / 38710000;
  // Normalize to 0-360
  theta = ((theta % 360) + 360) % 360;
  return theta;
}
