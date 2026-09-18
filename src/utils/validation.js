// Lightweight, location-aware validation helpers for the client account form.
// The salon is based in the USA, so US numbers are the default format, but any
// supported international country code (starting with +) is accepted too and is
// validated against that country's expected national number length.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const isValidEmail = (value) => {
  return EMAIL_REGEX.test((value || '').trim());
};

// Map of <bridged country code> -> { min, max } national number length
// (leading zeros removed). Kept intentionally small but practical for this
// salon's audience.
const COUNTRY_RULES = {
  '1':   { name: 'US/Canada',        min: 10, max: 10 },
  '27':  { name: 'South Africa',     min: 9,  max: 9 },
  '32':  { name: 'Belgium',          min: 8,  max: 8 },
  '33':  { name: 'France',           min: 9,  max: 9 },
  '34':  { name: 'Spain',            min: 9,  max: 9 },
  '39':  { name: 'Italy',            min: 9,  max: 10 },
  '44':  { name: 'UK',               min: 9,  max: 10 },
  '49':  { name: 'Germany',          min: 10, max: 11 },
  '52':  { name: 'Mexico',           min: 10, max: 10 },
  '55':  { name: 'Brazil',           min: 10, max: 11 },
  '61':  { name: 'Australia',        min: 9,  max: 9 },
  '81':  { name: 'Japan',            min: 9,  max: 10 },
  '86':  { name: 'China',            min: 11, max: 11 },
  '90':  { name: 'Turkey',           min: 10, max: 10 },
  '212': { name: 'Morocco',          min: 9,  max: 9 },
  '213': { name: 'Algeria',          min: 9,  max: 9 },
  '216': { name: 'Tunisia',          min: 8,  max: 8 },
  '221': { name: 'Senegal',          min: 9,  max: 9 },
  '224': { name: 'Guinea',           min: 8,  max: 8 },
  '225': { name: "Côte d'Ivoire",    min: 8,  max: 8 },
  '226': { name: 'Burkina Faso',     min: 8,  max: 8 },
  '227': { name: 'Niger',            min: 8,  max: 8 },
  '229': { name: 'Benin',            min: 8,  max: 8 },
  '232': { name: 'Sierra Leone',     min: 8,  max: 8 },
  '234': { name: 'Nigeria',          min: 10, max: 10 },
  '237': { name: 'Cameroon',         min: 9,  max: 9 },
  '242': { name: 'DR Congo',         min: 9,  max: 9 },
  '244': { name: 'Angola',           min: 9,  max: 9 },
  '255': { name: 'Tanzania',         min: 9,  max: 9 },
  '254': { name: 'Kenya',            min: 9,  max: 9 }
};

// Longest code first so 3-digit codes win over 2/1-digit prefixes.
const SORTED_CODES = Object.keys(COUNTRY_RULES).sort((a, b) => b.length - a.length);

/**
 * Validates a phone number. Returns { isValid, code, formatted, country }.
 * codes:
 *   'phone_empty'            - nothing entered
 *   'phone_invalid_chars'    - unexpected characters
 *   'phone_us_invalid'       - US default format is wrong
 *   'phone_country_invalid'  - known country code but wrong national length
 *   'phone_unknown_country'  - "+<code>" unknown with bad E.164 length
 */
export const validateClientPhone = (value) => {
  const raw = (value || '').trim();
  if (!raw) return { isValid: false, code: 'phone_empty', formatted: '', country: null };

  if (/[^0-9+()\s\-.]/.test(raw)) {
    return { isValid: false, code: 'phone_invalid_chars', formatted: '', country: null };
  }

  const s = raw.replace(/[()\s\-.]/g, '');
  if (!/^\+?\d+$/.test(s)) {
    return { isValid: false, code: 'phone_invalid_chars', formatted: '', country: null };
  }

  const isInternational = s.startsWith('+');
  const digits = isInternational ? s.slice(1) : s;

  if (isInternational) {
    for (const code of SORTED_CODES) {
      if (digits.startsWith(code)) {
        const nationalClean = digits.slice(code.length).replace(/^0+/, '');
        const rule = COUNTRY_RULES[code];
        if (nationalClean.length >= rule.min && nationalClean.length <= rule.max) {
          return {
            isValid: true,
            code: 'phone_valid',
            formatted: `+${code} ${nationalClean}`,
            country: rule.name
          };
        }
        return {
          isValid: false,
          code: 'phone_country_invalid',
          formatted: `+${code} ${nationalClean}`,
          country: rule.name
        };
      }
    }
    if (digits.length >= 7 && digits.length <= 15) {
      return { isValid: true, code: 'phone_valid', formatted: `+${digits}`, country: null };
    }
    return { isValid: false, code: 'phone_unknown_country', formatted: `+${digits}`, country: null };
  }

  // Default: US / North America (10 digits, optional leading "1")
  const n = digits.length === 11 && digits.startsWith('1') ? digits.slice(1) : digits;
  if (n.length === 10) {
    const area = n.slice(0, 3);
    const mid = n.slice(3, 6);
    const last = n.slice(6);
    return {
      isValid: true,
      code: 'phone_valid',
      formatted: `+1 (${area}) ${mid}-${last}`,
      country: 'US/Canada'
    };
  }
  return { isValid: false, code: 'phone_us_invalid', formatted: '', country: 'US/Canada' };
};