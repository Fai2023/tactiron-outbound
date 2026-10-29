/**
 * SmartLead Integration Adapter
 * Provides an interface for adding leads to Smart Leads campaigns.
 */

export interface SmartLeadContact {
  email: string;
  firstName?: string;
  lastName?: string;
  companyName?: string;
  phone?: string;
  jobTitle?: string;
  country?: string;
  industry?: string;
  customFields?: Record<string, string>;
}

export interface SmartLeadAddResult {
  success: boolean;
  leadId?: number;
  campaignId: number;
  alreadyExists?: boolean;
  error?: string;
}

export interface ISmartLeadAdapter {
  addLeadToCampaign(campaignId: number, lead: SmartLeadContact): Promise<SmartLeadAddResult>;
}

/**
 * Mock / Sandbox SmartLead Adapter for Unit and Integration Testing.
 * Always returns a successful response without calling the real API.
 */
export class MockSmartLeadAdapter implements ISmartLeadAdapter {
  public async addLeadToCampaign(campaignId: number, _lead: SmartLeadContact): Promise<SmartLeadAddResult> {
    return { success: true, leadId: 99999, campaignId, alreadyExists: false };
  }
}

/**
 * Production SmartLead API Adapter
 * Calls the SmartLead REST API to enrol leads into campaigns.
 */
export class SmartLeadApiAdapter implements ISmartLeadAdapter {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  public async addLeadToCampaign(campaignId: number, lead: SmartLeadContact): Promise<SmartLeadAddResult> {
    try {
      const { email, firstName, lastName, companyName, phone, jobTitle, country, industry, customFields } = lead;

      const response = await fetch(
        `https://server.smartlead.ai/api/v1/campaigns/${campaignId}/leads?api_key=${this.apiKey}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            lead_list: [
              {
                email,
                first_name: firstName,
                last_name: lastName,
                company_name: companyName,
                phone_number: phone,
                linkedin_profile: '',
                custom_fields: {
                  job_title: jobTitle,
                  country,
                  industry,
                  ...customFields,
                },
              },
            ],
          }),
        }
      );

      if (response.status === 409) {
        return { success: true, campaignId, alreadyExists: true };
      }

      if (response.ok) {
        const json = await response.json() as { id?: number };
        return { success: true, leadId: json.id ?? undefined, campaignId };
      }

      return { success: false, campaignId, error: `SmartLead API error: ${response.status}` };
    } catch (err: any) {
      return { success: false, campaignId, error: err.message };
    }
  }
}
