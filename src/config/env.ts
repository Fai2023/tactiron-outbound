import { existsSync } from 'node:fs';
import { z } from 'zod';

// Load a local .env for dev/prod runs; tests run on defaults so they never hit live APIs
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST && existsSync('.env')) {
  process.loadEnvFile('.env');
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/tactiron_outbound?schema=public'),
  
  // Emergency Kill Switch
  KILL_SWITCH_ACTIVE: z.enum(['true', 'false']).transform(v => v === 'true').default('false'),

  // Review Mode: 'STRICT_MONTH_1' (100% human review of drafts) vs 'STANDARD_SAMPLE' (10-20% sample review)
  REVIEW_MODE: z.enum(['STRICT_MONTH_1', 'STANDARD_SAMPLE']).default('STRICT_MONTH_1'),

  // Minimum team size threshold (default 20, as in the Excel sheet placeholder)
  POLICY_MIN_TEAM_SIZE: z.coerce.number().default(20),

  // Optional integration credentials (validated if provided, clearly flagged if absent)
  SMARTLEAD_API_KEY: z.string().optional(),
  APOLLO_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-opus-5-5'),
  
  // Odoo CRM configuration
  ODOO_URL: z.string().url().optional(),
  ODOO_DB: z.string().optional(),
  ODOO_USERNAME: z.string().optional(),
  ODOO_API_KEY: z.string().optional(),
  // Where warm handovers land: looked up by name so the same values work on test and live Odoo
  ODOO_TEAM_NAME: z.string().optional(),
  ODOO_STAGE_NAME: z.string().optional(),
  
  // Operational Alerts
  SLACK_WEBHOOK_URL: z.string().url().optional(),
  COMPLIANCE_OFFICER_EMAIL: z.string().email().default('compliance@tactiron.com'),
  SALES_ESCALATION_EMAIL: z.string().email().default('sales-escalations@tactiron.com')
});

export type EnvConfig = z.infer<typeof envSchema>;

export function loadEnv(envInput: Record<string, string | undefined> = process.env): EnvConfig {
  // Treat blank entries (e.g. `SLACK_WEBHOOK_URL=` copied from .env.example) as unset
  const present = Object.fromEntries(Object.entries(envInput).filter(([, v]) => v !== ''));
  const result = envSchema.safeParse(present);
  if (!result.success) {
    console.error('Invalid environment configuration:', result.error.format());
    throw new Error('Environment configuration validation failed');
  }
  return result.data;
}

export const config = loadEnv();
