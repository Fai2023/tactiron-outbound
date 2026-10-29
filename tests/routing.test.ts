import { describe, it, expect } from 'vitest';
import { getLanguageForCountry, COUNTRY_LANGUAGE_MAP } from '../src/config/country-language.map.js';
import { getIndustrySlug, INDUSTRY_SLUG_MAP } from '../src/config/industry-slug.map.js';
import { resolveRoute, CAMPAIGN_ROUTING_TABLE } from '../src/config/campaign-routing.config.js';
import { MockSmartLeadAdapter } from '../src/integrations/smartlead/adapter.js';

describe('Country → Language Mapping', () => {
  it('maps France and Francophone African countries to FR', () => {
    expect(getLanguageForCountry('France')).toBe('FR');
    expect(getLanguageForCountry('france')).toBe('FR');
    expect(getLanguageForCountry('Senegal')).toBe('FR');
    expect(getLanguageForCountry("Côte d'Ivoire")).toBe('FR');
    expect(getLanguageForCountry('Ivory Coast')).toBe('FR');
    expect(getLanguageForCountry('Morocco')).toBe('FR');
    expect(getLanguageForCountry('Tunisia')).toBe('FR');
  });

  it('maps GCC nations to AR', () => {
    expect(getLanguageForCountry('Saudi Arabia')).toBe('AR');
    expect(getLanguageForCountry('UAE')).toBe('AR');
    expect(getLanguageForCountry('United Arab Emirates')).toBe('AR');
    expect(getLanguageForCountry('Qatar')).toBe('AR');
    expect(getLanguageForCountry('Kuwait')).toBe('AR');
    expect(getLanguageForCountry('Oman')).toBe('AR');
  });

  it('maps European and Anglophone African countries to EN', () => {
    expect(getLanguageForCountry('Germany')).toBe('EN');
    expect(getLanguageForCountry('Netherlands')).toBe('EN');
    expect(getLanguageForCountry('Sweden')).toBe('EN');
    expect(getLanguageForCountry('United Kingdom')).toBe('EN');
    expect(getLanguageForCountry('Nigeria')).toBe('EN');
    expect(getLanguageForCountry('Kenya')).toBe('EN');
    expect(getLanguageForCountry('South Africa')).toBe('EN');
  });

  it('falls back to EN for unknown or unlisted countries', () => {
    expect(getLanguageForCountry('Atlantis')).toBe('EN');
    expect(getLanguageForCountry('')).toBe('EN');
  });
});

describe('Industry → Slug Mapping', () => {
  it('maps freight, spedition, haulage, logistics to logistics', () => {
    expect(getIndustrySlug('Freight and cargo services')).toBe('logistics');
    expect(getIndustrySlug('Spedition and Warehousing')).toBe('logistics');
    expect(getIndustrySlug('Third-party logistics (3PL)')).toBe('logistics');
  });

  it('maps security keywords to security', () => {
    expect(getIndustrySlug('Manned Guarding and Security Services')).toBe('security');
    expect(getIndustrySlug('Cash-in-transit Solutions')).toBe('security');
  });

  it('maps emergency, paramedic, ambulance to first_responders', () => {
    expect(getIndustrySlug('Private ambulance and emergency medical')).toBe('first_responders');
    expect(getIndustrySlug('Fire and rescue service')).toBe('first_responders');
  });

  it('maps airport, airline, ground handling to aviation', () => {
    expect(getIndustrySlug('Airport authorities and Ground handling')).toBe('aviation');
  });

  it('maps mining and construction to mining_construction', () => {
    expect(getIndustrySlug('Quarrying and civil engineering')).toBe('mining_construction');
  });

  it('falls back to general for unmapped industries or undefined input', () => {
    expect(getIndustrySlug(undefined)).toBe('general');
    expect(getIndustrySlug('Unknown Quantum Industry')).toBe('general');
  });
});

describe('Campaign Routing Resolution', () => {
  it('resolves an exact match with placeholder flag', () => {
    const route = resolveRoute('logistics', 'FR');
    expect(route.routingKey).toBe('logistics_FR');
    expect(route.industrySlug).toBe('logistics');
    expect(route.languageCode).toBe('FR');
    expect(route.isFallback).toBe(false);
    expect(route.isPlaceholder).toBe(true);
  });

  it('resolves GCC Arabic routes', () => {
    const route = resolveRoute('security', 'AR');
    expect(route.routingKey).toBe('security_AR');
    expect(route.isFallback).toBe(false);
  });

  it('falls back to general_{lang} when industry is unmapped', () => {
    const route = resolveRoute('general', 'FR');
    expect(route.routingKey).toBe('general_FR');
    expect(route.languageCode).toBe('FR');
  });
});

describe('MockSmartLeadAdapter', () => {
  it('successfully mocks adding a contact to a campaign', async () => {
    const adapter = new MockSmartLeadAdapter();
    const result = await adapter.addLeadToCampaign(12345, {
      email: 'contact@expresslogistics.fr',
      firstName: 'Jean',
      lastName: 'Dupont',
      companyName: 'Express Logistics France',
      country: 'France',
      industry: 'Logistics',
    });

    expect(result.success).toBe(true);
    expect(result.campaignId).toBe(12345);
    expect(result.leadId).toBe(99999);
  });
});
