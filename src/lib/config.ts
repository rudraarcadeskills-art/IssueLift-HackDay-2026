export const ISSUELIFT_REPO_URL = 'https://github.com/rudraarcadeskills-art/IssueLift-HackDay-2026';
export const ISSUELIFT_CANONICAL_URL = 'https://issue-lift.vercel.app/';

export const CONFIG = {
  GEMMA_API_KEY: process.env.GEMMA_API_KEY || '',
  GEMMA_MODEL: process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it',
  GITHUB_TOKEN: process.env.GITHUB_TOKEN || '',
  NODE_ENV: process.env.NODE_ENV || 'development',
  REPO_URL: ISSUELIFT_REPO_URL,
  CANONICAL_URL: ISSUELIFT_CANONICAL_URL,
};

export function isGemmaConfigured(): boolean {
  return Boolean(process.env.GEMMA_API_KEY && process.env.GEMMA_API_KEY.trim().length > 0);
}

export function getGemmaModel(): string {
  return process.env.GEMMA_MODEL || 'gemma-4-26b-a4b-it';
}

export interface AppHealthStatus {
  status: 'ready' | 'partially_configured' | 'missing_key';
  app_name: 'IssueLift';
  version: '1.3.0';
  gemma: {
    configured: boolean;
    model: string;
    target_tier: 'Google AI Studio Free Tier';
  };
  github: {
    authenticated_rate_limit: boolean;
    endpoint: 'https://api.github.com';
  };
  timestamp: string;
}

export function getHealthStatus(): AppHealthStatus {
  const gemmaConfigured = isGemmaConfigured();
  return {
    status: gemmaConfigured ? 'ready' : 'missing_key',
    app_name: 'IssueLift',
    version: '1.3.0',
    gemma: {
      configured: gemmaConfigured,
      model: getGemmaModel(),
      target_tier: 'Google AI Studio Free Tier',
    },
    github: {
      authenticated_rate_limit: Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_TOKEN.trim().length > 0),
      endpoint: 'https://api.github.com',
    },
    timestamp: new Date().toISOString(),
  };
}
