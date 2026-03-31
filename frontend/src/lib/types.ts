/**
 * TypeScript type definitions for the application.
 */

export interface User {
  id: string;
  email: string;
  username: string;
  is_active: boolean;
  tier?: 'free' | 'pro';
  stripe_customer_id?: string;
  stripe_subscription_id?: string;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  repo_url: string | null;
  source_type: string;
  detected_stack: string | null;
  subdomain: string | null;
  status: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ProjectListResponse {
  projects: Project[];
  total: number;
}

export interface Deployment {
  id: string;
  project_id: string;
  status: string;
  container_id: string | null;
  container_name: string | null;
  image_name: string | null;
  port: number | null;
  public_url: string | null;
  dockerfile_content: string | null;
  error_message: string | null;
  retry_count: number;
  created_at: string;
  finished_at: string | null;
}

export interface LogEntry {
  id: string;
  level: string;
  source: string;
  message: string;
  timestamp: string;
}

export interface DeploymentLogsResponse {
  deployment_id: string;
  status: string;
  logs: LogEntry[];
  total: number;
}

export interface AISuggestion {
  id: string;
  deployment_id: string;
  root_cause: string;
  fix_suggestion: string;
  commands: string | null;
  confidence: string;
  is_applied: boolean;
  applied_result: string | null;
  created_at: string;
}

export interface AIAnalyzeResponse {
  suggestion: AISuggestion;
  logs_analyzed: number;
}

export type DeploymentStatus =
  | 'pending'
  | 'cloning'
  | 'building'
  | 'running'
  | 'deployed'
  | 'failed'
  | 'stopped';

export type ProjectStatus =
  | 'created'
  | 'deploying'
  | 'deployed'
  | 'failed'
  | 'stopped';

export interface AIArchitectRecommendation {
  category: string;
  suggestion: string;
  impact: 'High' | 'Medium' | 'Low';
}

export interface AIArchitectResponse {
  score: number;
  archetype: string;
  recommendations: AIArchitectRecommendation[];
  blueprint_summary: string;
}
