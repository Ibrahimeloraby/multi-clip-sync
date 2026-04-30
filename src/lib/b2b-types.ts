export type CompanySize = 'startup' | 'sme' | 'enterprise';
export type DealStage = 'prospecting' | 'qualified' | 'proposal' | 'negotiation' | 'closed_won' | 'closed_lost';
export type ProposalStatus = 'draft' | 'sent' | 'viewed' | 'approved' | 'rejected';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'skipped';
export type OutreachStatus = 'draft' | 'sent' | 'opened' | 'replied' | 'bounced';
export type PricingModel = 'fixed' | 'per_seat' | 'usage' | 'custom';

export interface Company {
  id: string;
  name: string;
  industry: string;
  size: CompanySize;
  website: string;
  logo: string;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  country: string;
  annualRevenue: number;
  tags: string[];
  createdAt: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  pricingModel: PricingModel;
  category: string;
  features: string[];
  minSeats?: number;
  isActive: boolean;
}

export interface ApprovalStep {
  id: string;
  approverName: string;
  approverEmail: string;
  approverRole: string;
  status: ApprovalStatus;
  comment: string;
  decidedAt: string | null;
  order: number;
}

export interface Proposal {
  id: string;
  dealId: string;
  companyId: string;
  title: string;
  status: ProposalStatus;
  executiveSummary: string;
  content: string;
  validUntil: string;
  totalValue: number;
  currency: string;
  lineItems: ProposalLineItem[];
  approvalSteps: ApprovalStep[];
  currentApprovalStep: number;
  createdAt: string;
  sentAt: string | null;
  viewedAt: string | null;
}

export interface ProposalLineItem {
  id: string;
  productId: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
}

export interface Deal {
  id: string;
  title: string;
  companyId: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability: number;
  ownerId: string;
  ownerName: string;
  productIds: string[];
  notes: string;
  nextAction: string;
  nextActionDate: string;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
  aiScore: number;
  aiInsight: string;
}

export interface OutreachMessage {
  id: string;
  companyId: string;
  dealId: string | null;
  subject: string;
  body: string;
  tone: 'formal' | 'consultative' | 'friendly' | 'urgent';
  status: OutreachStatus;
  createdAt: string;
  sentAt: string | null;
  openedAt: string | null;
  repliedAt: string | null;
}

export interface Activity {
  id: string;
  type: 'deal_created' | 'proposal_sent' | 'approval_granted' | 'approval_rejected' | 'deal_closed' | 'outreach_replied' | 'proposal_viewed';
  title: string;
  description: string;
  companyName: string;
  timestamp: string;
  dealId?: string;
  proposalId?: string;
}

export interface DashboardMetrics {
  totalDeals: number;
  totalPipelineValue: number;
  proposalsSent: number;
  proposalsApproved: number;
  avgDealCycle: number;
  winRate: number;
  pendingApprovals: number;
  openOutreach: number;
}
