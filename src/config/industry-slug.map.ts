/**
 * Industry → Slug mapping for campaign routing.
 * Maps Apollo's industry strings to Tactiron's 16 internal slugs.
 */

export type IndustrySlug =
  | 'logistics'
  | 'security'
  | 'first_responders'
  | 'aviation'
  | 'mining_construction'
  | 'energy_utilities'
  | 'passenger_transport'
  | 'maritime'
  | 'manufacturing'
  | 'hospitality'
  | 'healthcare'
  | 'facilities'
  | 'agriculture'
  | 'government_defence'
  | 'ngo_field'
  | 'general';

export const INDUSTRY_SLUG_MAP: Array<{ patterns: string[]; slug: IndustrySlug }> = [
  {
    slug: 'logistics',
    patterns: ['freight', 'logistics', 'trucking', 'haulage', 'courier', 'shipping', '3pl', 'warehousing', 'transport', 'cargo', 'postal', 'parcel', 'spedition'],
  },
  {
    slug: 'security',
    patterns: ['security', 'guarding', 'guard service', 'private investigation', 'cash-in-transit', 'armed response', 'patrol'],
  },
  {
    slug: 'first_responders',
    patterns: ['ambulance', 'emergency medical', 'fire', 'rescue', 'paramedic', 'first responder', 'disaster response'],
  },
  {
    slug: 'aviation',
    patterns: ['aviation', 'airline', 'airport', 'ground handling', 'air cargo', 'aircraft maintenance', 'fixed-base operator'],
  },
  {
    slug: 'mining_construction',
    patterns: ['mining', 'quarry', 'construction', 'civil engineering', 'road building', 'infrastructure', 'tunnelling', 'cement', 'building material', 'epc'],
  },
  {
    slug: 'energy_utilities',
    patterns: ['energy', 'utilities', 'oil and gas', 'oil & gas', 'power generation', 'electricity', 'hydroelectric', 'solar', 'wind farm', 'pipeline', 'refinery', 'water utility', 'waste management', 'telecom infrastructure', 'data centre', 'data center'],
  },
  {
    slug: 'passenger_transport',
    patterns: ['bus', 'taxi', 'ride-hailing', 'shuttle', 'coach', 'railway', 'metro', 'ferry', 'car rental', 'mobility'],
  },
  {
    slug: 'maritime',
    patterns: ['port', 'maritime', 'vessel', 'stevedoring', 'container terminal', 'inland container depot', 'offshore', 'shipyard', 'tugboat', 'pilotage'],
  },
  {
    slug: 'manufacturing',
    patterns: ['manufacturing', 'automotive', 'chemical', 'petrochemical', 'pharmaceutical', 'steel', 'textile', 'garment', 'packaging', 'industrial park', 'factory'],
  },
  {
    slug: 'hospitality',
    patterns: ['hotel', 'resort', 'casino', 'safari lodge', 'theme park', 'convention centre', 'stadium', 'sports arena', 'shopping mall', 'cruise terminal', 'leisure', 'tourism', 'hospitality'],
  },
  {
    slug: 'healthcare',
    patterns: ['hospital', 'clinic', 'medical', 'healthcare', 'health system', 'health service', 'trauma'],
  },
  {
    slug: 'facilities',
    patterns: ['facilities management', 'facility management', 'property management', 'building management', 'cleaning', 'maintenance contractor', 'campus management', 'smart building'],
  },
  {
    slug: 'agriculture',
    patterns: ['farm', 'farming', 'plantation', 'horticulture', 'agribusiness', 'livestock', 'forestry', 'timber', 'tea estate', 'coffee estate', 'sugar'],
  },
  {
    slug: 'government_defence',
    patterns: ['government', 'defence', 'defense', 'military', 'police', 'border protection', 'gendarmerie', 'coast guard', 'civil protection', 'prison', 'correctional', 'customs', 'immigration', 'national park', 'wildlife protection'],
  },
  {
    slug: 'ngo_field',
    patterns: ['ngo', 'humanitarian', 'non-profit', 'nonprofit', 'relief organization', 'conservation', 'development agency', 'field inspection'],
  },
];

/**
 * Returns the industry slug for a given Apollo industry string.
 * Uses case-insensitive substring matching; returns 'general' as fallback.
 */
export function getIndustrySlug(apolloIndustry: string | undefined): IndustrySlug {
  if (!apolloIndustry) return 'general';

  const lower = apolloIndustry.toLowerCase();
  for (const { patterns, slug } of INDUSTRY_SLUG_MAP) {
    for (const pattern of patterns) {
      if (lower.includes(pattern.toLowerCase())) {
        return slug;
      }
    }
  }
  return 'general';
}
