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

/**
 * Production Apollo API Adapter
 * Documentation: https://apolloio.github.io/apollo-api-docs/
 */
export class ApolloApiAdapter implements IApolloAdapter {
  private apiKey: string;
  private baseUrl = 'https://api.apollo.io/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async searchPeople(params: ApolloSearchParams): Promise<ApolloSearchResponse> {
    if (!this.apiKey) {
      throw new Error('APOLLO_API_KEY is not configured.');
    }

    const payload = {
      api_key: this.apiKey,
      person_titles: params.personTitles,
      person_locations: params.personLocations,
      organization_locations: params.organizationLocations,
      organization_num_employees_ranges: params.organizationNumEmployeesRanges,
      organization_industries: params.organizationIndustries,
      q_organization_domains: params.qOrganizationDomains?.join('\n'),
      q_keywords: params.qKeywords,
      page: params.page || 1,
      per_page: params.perPage || 25
    };

    const response = await fetch(`${this.baseUrl}/mixed_people/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Apollo Search API Error (${response.status}): ${err}`);
    }

    const data = await response.json() as ApolloSearchResponse;
    return {
      people: data.people || [],
      pagination: data.pagination || { page: 1, per_page: 25, total_entries: 0, total_pages: 0 }
    };
  }

  public async enrichOrganization(domain: string): Promise<ApolloRawPerson['organization'] | null> {
    if (!this.apiKey) {
      throw new Error('APOLLO_API_KEY is not configured.');
    }

    const url = new URL(`${this.baseUrl}/organizations/enrich`);
    url.searchParams.set('api_key', this.apiKey);
    url.searchParams.set('domain', domain);

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const err = await response.text();
      throw new Error(`Apollo Organization Enrich API Error (${response.status}): ${err}`);
    }

    const data = await response.json() as { organization?: ApolloRawPerson['organization'] };
    return data.organization || null;
  }

  public async enrichPerson(params: ApolloPersonMatchParams): Promise<ApolloRawPerson | null> {
    if (!this.apiKey) {
      throw new Error('APOLLO_API_KEY is not configured.');
    }

    const payload: Record<string, unknown> = {
      api_key: this.apiKey
    };
    if (params.email) payload.email = params.email;
    if (params.firstName) payload.first_name = params.firstName;
    if (params.lastName) payload.last_name = params.lastName;
    if (params.domain) payload.domain = params.domain;
    if (params.organizationName) payload.organization_name = params.organizationName;

    const response = await fetch(`${this.baseUrl}/people/match`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      if (response.status === 404) return null;
      const err = await response.text();
      throw new Error(`Apollo People Match API Error (${response.status}): ${err}`);
    }

    const data = await response.json() as { person?: ApolloRawPerson };
    return data.person || null;
  }
}
