/**
 * Apollo.io Integration Adapter
 * Real documented API contracts for Apollo.io:
 * - /v1/mixed_people/search (Prospect Discovery)
 * - /v1/people/match (Contact Enrichment)
 * - /v1/organizations/enrich (Company Enrichment)
 */

export interface ApolloSearchParams {
  qOrganizationDomains?: string[];
  personTitles?: string[];
  personLocations?: string[];
  organizationLocations?: string[];
  organizationNumEmployeesRanges?: string[]; // E.g., ['20,50', '51,200', '201,500']
  organizationIndustries?: string[];          // E.g., ['logistics', 'transportation']
  qKeywords?: string;
  page?: number;
  perPage?: number;
}

export interface ApolloRawPerson {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  title?: string;
  email?: string;
  email_status?: 'verified' | 'extrapolated' | 'unavailable' | 'bounced';
  has_email?: boolean; // api_search only: Apollo holds an email it can reveal via bulk_match
  sanitized_phone?: string;
  country?: string;
  state?: string;
  city?: string;
  organization?: {
    id?: string;
    name?: string;
    website_url?: string;
    primary_domain?: string;
    estimated_num_employees?: number;
    industry?: string;
    country?: string;
    phone?: string;
  };
}

export interface ApolloSearchResponse {
  people: ApolloRawPerson[];
  pagination: {
    page: number;
    per_page: number;
    total_entries: number;
    total_pages: number;
  };
}

export interface ApolloPersonMatchParams {
  email?: string;
  firstName?: string;
  lastName?: string;
  domain?: string;
  organizationName?: string;
}

export interface IApolloAdapter {
  searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResponse>;
  enrichOrganization(domain: string): Promise<ApolloRawPerson['organization'] | null>;
  enrichPerson(params: ApolloPersonMatchParams): Promise<ApolloRawPerson | null>;
}

/**
 * Mock Apollo Adapter for Local Testing & Unit Tests
 */
export class MockApolloAdapter implements IApolloAdapter {
  private mockPeople: ApolloRawPerson[] = [
    {
      id: 'apol_101',
      first_name: 'Rashid',
      last_name: 'Al-Falasi',
      title: 'Operations & Fleet Director',
      email: 'rashid@emiratesdispatch.ae',
      email_status: 'verified',
      sanitized_phone: '+971501234567',
      country: 'United Arab Emirates',
      organization: {
        id: 'org_501',
        name: 'Emirates Dispatch LLC',
        primary_domain: 'emiratesdispatch.ae',
        estimated_num_employees: 48,
        industry: 'Logistics and Transportation',
        country: 'United Arab Emirates',
        phone: '+97142345678'
      }
    },
    {
      id: 'apol_102',
      first_name: 'David',
      last_name: 'Mwangi',
      title: 'Head of Logistics & Security',
      email: 'david.m@kenyafreight.co.ke',
      email_status: 'verified',
      sanitized_phone: '+254701234567',
      country: 'Kenya',
      organization: {
        id: 'org_502',
        name: 'Kenya Freight Services Ltd',
        primary_domain: 'kenyafreight.co.ke',
        estimated_num_employees: 75,
        industry: 'Freight & Logistics',
        country: 'Kenya',
        phone: '+254201234567'
      }
    },
    {
      id: 'apol_103',
      first_name: 'Klaus',
      last_name: 'Schmidt',
      title: 'Head of Transport Logistics',
      email: 'klaus.schmidt@berlin-spedition.de',
      email_status: 'verified',
      country: 'Germany',
      organization: {
        id: 'org_503',
        name: 'Berlin Spedition GmbH',
        primary_domain: 'berlin-spedition.de',
        estimated_num_employees: 120,
        industry: 'Transportation',
        country: 'Germany',
        phone: '+493012345678'
      }
    }
  ];

  public async searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResponse> {
    let filtered = [...this.mockPeople];

    if (params.personLocations?.length) {
      filtered = filtered.filter(p =>
        params.personLocations!.some(loc =>
          p.country?.toLowerCase().includes(loc.toLowerCase())
        )
      );
    }

    if (params.personTitles?.length) {
      filtered = filtered.filter(p =>
        params.personTitles!.some(t => {
          const pTitle = p.title?.toLowerCase() || '';
          const targetTitle = t.toLowerCase();
          return pTitle.includes(targetTitle) || targetTitle.includes(pTitle) ||
            targetTitle.split(' ').some(w => w.length > 3 && pTitle.includes(w));
        })
      );
    }

    if (params.organizationIndustries?.length) {
      filtered = filtered.filter(p =>
        params.organizationIndustries!.some(ind => {
          const orgIndustry = p.organization?.industry?.toLowerCase() || '';
          const targetIndustry = ind.toLowerCase();
          return orgIndustry.includes(targetIndustry) || targetIndustry.includes(orgIndustry) ||
            targetIndustry.split(/[\s&\/,]+/).some(w => w.length > 3 && orgIndustry.includes(w));
        })
      );
    }

    return {
      people: filtered,
      pagination: {
        page: params.page || 1,
        per_page: params.perPage || 10,
        total_entries: filtered.length,
        total_pages: 1
      }
    };
  }

  public async enrichOrganization(domain: string): Promise<ApolloRawPerson['organization'] | null> {
    const match = this.mockPeople.find(p => p.organization?.primary_domain?.toLowerCase() === domain.toLowerCase());
    return match?.organization || null;
  }

  public async enrichPerson(params: ApolloPersonMatchParams): Promise<ApolloRawPerson | null> {
    if (params.email) {
      const match = this.mockPeople.find(p => p.email?.toLowerCase() === params.email?.toLowerCase());
      if (match) return match;
    }
    if (params.domain) {
      const match = this.mockPeople.find(p => p.organization?.primary_domain?.toLowerCase() === params.domain?.toLowerCase());
      if (match) return match;
    }
    return null;
  }
}

const NAMED_ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };

/** Apollo returns some text HTML-encoded ("logistics &amp; supply chain"); decode it before it reaches the CRM */
export function decodeHtmlEntities<T>(value: T): T {
  if (typeof value === 'string') {
    return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
      if (entity[0] === '#') {
        const code = entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
        return Number.isNaN(code) ? match : String.fromCodePoint(code);
      }
      return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
    }) as T;
  }
  if (Array.isArray(value)) return value.map(decodeHtmlEntities) as T;
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, decodeHtmlEntities(v)])) as T;
  }
  return value;
}

/**
 * Production Apollo API Adapter
 * Documentation: https://docs.apollo.io/reference
 *
 * People search (/mixed_people/api_search) is free but returns no emails or phones,
 * so matched people are revealed through /people/bulk_match (10 per call, consumes credits).
 */
export class ApolloApiAdapter implements IApolloAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.apollo.io/api/v1';
  private static readonly BULK_MATCH_SIZE = 10;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    if (!this.apiKey) {
      throw new Error('APOLLO_API_KEY is not configured.');
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
        'X-Api-Key': this.apiKey
      },
      body: body === undefined ? undefined : JSON.stringify(body)
    });

    if (!response.ok) {
      const err = await response.text();
      const error = new Error(`Apollo API Error ${method} ${path} (${response.status}): ${err}`);
      (error as Error & { status?: number }).status = response.status;
      throw error;
    }

    return await response.json() as T;
  }

  public async searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResponse> {
    const payload = {
      person_titles: params.personTitles,
      person_locations: params.personLocations,
      organization_locations: params.organizationLocations,
      organization_num_employees_ranges: params.organizationNumEmployeesRanges,
      // Apollo has no free-text industry filter; industries are matched as organization keyword tags
      q_organization_keyword_tags: params.organizationIndustries,
      q_organization_domains_list: params.qOrganizationDomains,
      q_keywords: params.qKeywords,
      page: params.page || 1,
      per_page: params.perPage || 25
    };

    const data = await this.request<Partial<ApolloSearchResponse> & { total_entries?: number }>(
      'POST',
      '/mixed_people/api_search',
      payload
    );
    const found = data.people || [];

    // Reveal emails only for people Apollo says it has an email for, to avoid spending credits on misses
    const toReveal = found.filter(p => p.has_email !== false).map(p => p.id);
    const revealed = await this.revealPeople(toReveal);

    const people = found.map(p => {
      const match = revealed.get(p.id);
      return decodeHtmlEntities(match ? { ...p, ...match, organization: { ...p.organization, ...match.organization } } : p);
    });

    return {
      people,
      pagination: data.pagination || {
        page: params.page || 1,
        per_page: params.perPage || 25,
        total_entries: data.total_entries ?? people.length,
        total_pages: Math.ceil((data.total_entries ?? people.length) / (params.perPage || 25))
      }
    };
  }

  private async revealPeople(ids: string[]): Promise<Map<string, ApolloRawPerson>> {
    const revealed = new Map<string, ApolloRawPerson>();

    for (let i = 0; i < ids.length; i += ApolloApiAdapter.BULK_MATCH_SIZE) {
      const batch = ids.slice(i, i + ApolloApiAdapter.BULK_MATCH_SIZE);
      const data = await this.request<{ matches?: (ApolloRawPerson | null)[] }>(
        'POST',
        '/people/bulk_match',
        { details: batch.map(id => ({ id })) }
      );
      for (const match of data.matches || []) {
        if (match?.id) revealed.set(match.id, match);
      }
    }

    return revealed;
  }

  public async enrichOrganization(domain: string): Promise<ApolloRawPerson['organization'] | null> {
    try {
      const data = await this.request<{ organization?: ApolloRawPerson['organization'] }>(
        'GET',
        `/organizations/enrich?domain=${encodeURIComponent(domain)}`
      );
      return data.organization ? decodeHtmlEntities(data.organization) : null;
    } catch (err) {
      if ((err as Error & { status?: number }).status === 404) return null;
      throw err;
    }
  }

  public async enrichPerson(params: ApolloPersonMatchParams): Promise<ApolloRawPerson | null> {
    const payload: Record<string, unknown> = {};
    if (params.email) payload.email = params.email;
    if (params.firstName) payload.first_name = params.firstName;
    if (params.lastName) payload.last_name = params.lastName;
    if (params.domain) payload.domain = params.domain;
    if (params.organizationName) payload.organization_name = params.organizationName;

    try {
      const data = await this.request<{ person?: ApolloRawPerson }>('POST', '/people/match', payload);
      return data.person ? decodeHtmlEntities(data.person) : null;
    } catch (err) {
      if ((err as Error & { status?: number }).status === 404) return null;
      throw err;
    }
  }
}
