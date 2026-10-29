/**
 * Campaign Routing Configuration
 * Maps industry × language routing keys to Smart Leads campaign IDs.
 */

import { IndustrySlug } from './industry-slug.map.js';
import { LanguageCode } from './country-language.map.js';

export type RoutingKey = string; // format: `${IndustrySlug}_${LanguageCode}`

/**
 * Campaign routing table: routing key → Smart Leads campaign ID
 * IDs are placeholders (0) until real campaign IDs are populated from Smart Leads dashboard.
 * Replace 0 values with actual campaign IDs once campaigns are created in Smart Leads.
 */
export const CAMPAIGN_ROUTING_TABLE: Record<RoutingKey, number> = {
  // ── Tier 1: Core verticals ──────────────────────────────────────────────
  // Logistics & Transportation
  logistics_EN: 0,
  logistics_FR: 0,
  logistics_AR: 0,
  // Private Security & Guarding
  security_EN: 0,
  security_FR: 0,
  security_AR: 0,
  // First Responders & Emergency Services
  first_responders_EN: 0,
  first_responders_FR: 0,
  first_responders_AR: 0,
  // Aviation & Airports
  aviation_EN: 0,
  aviation_FR: 0,
  aviation_AR: 0,
  // Mining, Construction & Heavy Industry
  mining_construction_EN: 0,
  mining_construction_FR: 0,
  mining_construction_AR: 0,
  // Energy, Utilities & Critical Infrastructure
  energy_utilities_EN: 0,
  energy_utilities_FR: 0,
  energy_utilities_AR: 0,

  // ── Tier 2: Secondary verticals ─────────────────────────────────────────
  passenger_transport_EN: 0,
  passenger_transport_FR: 0,
  passenger_transport_AR: 0,
  maritime_EN: 0,
  maritime_FR: 0,
  maritime_AR: 0,
  manufacturing_EN: 0,
  manufacturing_FR: 0,
  manufacturing_AR: 0,
  hospitality_EN: 0,
  hospitality_FR: 0,
  hospitality_AR: 0,
  healthcare_EN: 0,
  healthcare_FR: 0,
  healthcare_AR: 0,
  facilities_EN: 0,
  facilities_FR: 0,
  facilities_AR: 0,

  // ── Tier 3: Long-tail verticals ──────────────────────────────────────────
  agriculture_EN: 0,
  agriculture_FR: 0,
  agriculture_AR: 0,
  government_defence_EN: 0,
  government_defence_FR: 0,
  government_defence_AR: 0,
  ngo_field_EN: 0,
  ngo_field_FR: 0,
  ngo_field_AR: 0,

  // ── Fallback campaigns (required from day one) ───────────────────────────
  general_EN: 0,
  general_FR: 0,
  general_AR: 0,
};

export interface RouteResult {
  campaignId: number;
  routingKey: RoutingKey;
  industrySlug: IndustrySlug;
  languageCode: LanguageCode;
  isFallback: boolean;
  isPlaceholder: boolean; // true when campaignId === 0
}

/**
 * Resolves the campaign route for a given industry slug and language code.
 * Falls back to general_{languageCode} if the specific route is not found,
 * then to general_EN as the ultimate fallback.
 */
export function resolveRoute(industrySlug: IndustrySlug, languageCode: LanguageCode): RouteResult {
  const primaryKey: RoutingKey = `${industrySlug}_${languageCode}`;

  if (primaryKey in CAMPAIGN_ROUTING_TABLE) {
    const campaignId = CAMPAIGN_ROUTING_TABLE[primaryKey];
    return {
      campaignId,
      routingKey: primaryKey,
      industrySlug,
      languageCode,
      isFallback: false,
      isPlaceholder: campaignId === 0,
    };
  }

  const fallbackKey: RoutingKey = `general_${languageCode}`;
  if (fallbackKey in CAMPAIGN_ROUTING_TABLE) {
    const campaignId = CAMPAIGN_ROUTING_TABLE[fallbackKey];
    return {
      campaignId,
      routingKey: fallbackKey,
      industrySlug,
      languageCode,
      isFallback: true,
      isPlaceholder: campaignId === 0,
    };
  }

  // Ultimate fallback
  return {
    campaignId: 0,
    routingKey: 'general_EN',
    industrySlug,
    languageCode,
    isFallback: true,
    isPlaceholder: true,
  };
}
