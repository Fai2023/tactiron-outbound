/**
 * Country → Language mapping for campaign routing.
 * Maps country name (title case, as returned by Apollo) to a language code.
 */

export type LanguageCode = 'EN' | 'FR' | 'AR';

export const COUNTRY_LANGUAGE_MAP: Record<string, LanguageCode> = {
  // ── French-speaking countries ──────────────────────────────────────────
  France: 'FR',
  Belgium: 'FR',
  Luxembourg: 'FR',
  Monaco: 'FR',
  Switzerland: 'FR',
  Senegal: 'FR',
  'Ivory Coast': 'FR',
  "Côte d'Ivoire": 'FR',
  Cameroon: 'FR',
  Mali: 'FR',
  'Burkina Faso': 'FR',
  Niger: 'FR',
  Guinea: 'FR',
  Gabon: 'FR',
  'Republic of Congo': 'FR',
  Congo: 'FR',
  DRC: 'FR',
  'Democratic Republic of the Congo': 'FR',
  Madagascar: 'FR',
  Togo: 'FR',
  Benin: 'FR',
  Rwanda: 'FR',
  Burundi: 'FR',
  Djibouti: 'FR',
  Chad: 'FR',
  'Central African Republic': 'FR',
  Comoros: 'FR',
  Mauritius: 'FR',
  Seychelles: 'FR',
  Morocco: 'FR',
  Tunisia: 'FR',
  Algeria: 'FR',

  // ── Arabic-speaking countries ──────────────────────────────────────────
  'Saudi Arabia': 'AR',
  UAE: 'AR',
  'United Arab Emirates': 'AR',
  Qatar: 'AR',
  Kuwait: 'AR',
  Bahrain: 'AR',
  Oman: 'AR',
  Egypt: 'AR',
  Libya: 'AR',
  Sudan: 'AR',

  // ── English-speaking countries ─────────────────────────────────────────
  'United Kingdom': 'EN',
  UK: 'EN',
  Ireland: 'EN',
  Netherlands: 'EN',
  Germany: 'EN',
  Austria: 'EN',
  Sweden: 'EN',
  Norway: 'EN',
  Denmark: 'EN',
  Finland: 'EN',
  Poland: 'EN',
  'Czech Republic': 'EN',
  Hungary: 'EN',
  Romania: 'EN',
  Portugal: 'EN',
  Spain: 'EN',
  Italy: 'EN',
  Greece: 'EN',
  Nigeria: 'EN',
  Kenya: 'EN',
  Ghana: 'EN',
  'South Africa': 'EN',
  Uganda: 'EN',
  Tanzania: 'EN',
  Ethiopia: 'EN',
  Zimbabwe: 'EN',
  Zambia: 'EN',
  Botswana: 'EN',
  Namibia: 'EN',
  'Sierra Leone': 'EN',
  Liberia: 'EN',
  Gambia: 'EN',
  Malawi: 'EN',
  Mozambique: 'EN',
  Lesotho: 'EN',
  Eswatini: 'EN',
  'United States': 'EN',
  USA: 'EN',
  Canada: 'EN',
  Australia: 'EN',
};

/**
 * Returns the language code for a given country name.
 * Performs a case-insensitive lookup; falls back to 'EN' if not found.
 */
export function getLanguageForCountry(country: string): LanguageCode {
  const lower = country.toLowerCase();
  for (const [key, value] of Object.entries(COUNTRY_LANGUAGE_MAP)) {
    if (key.toLowerCase() === lower) {
      return value;
    }
  }
  return 'EN';
}
