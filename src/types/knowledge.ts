export type Department =
  | 'marketing'
  | 'sales'
  | 'finance'
  | 'hr'
  | 'operations'
  | 'procurement'
  | 'compliance'
  | 'risk'
  | 'board'
  | 'it';

export type SourceType =
  | 'teams'
  | 'zoom'
  | 'slack'
  | 'email'
  | 'pdf'
  | 'powerbi'
  | 'sharepoint'
  | 'confluence'
  | 'jira';

export type TagType = '#learning' | '#agent';

export interface KnowledgeItem {
  id: string;
  content: string;
  summary: string;
  tag: TagType;
  source: SourceType;
  department: Department;
  author: string;
  authorAvatar?: string;
  timestamp: Date;
  meetingTitle?: string;
  citations: string[];
  keyTopics: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: { title: string; source: SourceType; department: Department }[];
  department?: Department | 'all';
}

export interface DepartmentStats {
  department: Department;
  label: string;
  color: string;
  bgColor: string;
  icon: string;
  learningCount: number;
  agentCount: number;
  lastActivity: Date;
  topTopics: string[];
}

export interface ConnectedSource {
  id: string;
  type: SourceType;
  label: string;
  status: 'connected' | 'pending' | 'disconnected';
  itemsTagged: number;
  lastSync: Date;
  tagInstruction: string;
}
