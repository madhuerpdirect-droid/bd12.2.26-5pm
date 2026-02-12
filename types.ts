
export enum UserRole {
  ADMIN = 'admin',
  COLLECTOR = 'collector',
  VIEWER = 'viewer',
  MEMBER = 'member'
}

export enum ChitStatus {
  ACTIVE = 'active',
  CLOSED = 'closed'
}

export enum PaymentStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue'
}

export enum PaymentMode {
  CASH = 'cash',
  UPI = 'upi',
  BANK_TRANSFER = 'bank_transfer'
}

export interface User {
  userId: string;
  name: string;
  role: UserRole;
  username: string;
  passwordHash: string;
  isActive: boolean;
  memberId?: string; // Links to member record for member login
}

export interface ChitGroup {
  chitGroupId: string;
  name: string;
  chitValue: number;
  totalMonths: number;
  monthlyInstallmentRegular: number;
  monthlyInstallmentAllotted: number;
  startMonth: string;
  status: ChitStatus;
  upiId: string;
  maxMembers: number;
  whatsappGroupLink?: string; // New field for group sync
}

export interface Member {
  memberId: string;
  name: string;
  mobile: string;
  address: string;
  idProofType: string;
  idProofNumber: string;
  isActive: boolean;
}

export interface GroupMembership {
  groupMembershipId: string;
  chitGroupId: string;
  memberId: string;
  tokenNo: number;
  joinedOn: string;
}

export interface InstallmentSchedule {
  scheduleId: string;
  chitGroupId: string;
  memberId: string;
  monthNo: number;
  dueDate: string;
  dueAmount: number;
  paidAmount: number;
  paidDate?: string;
  status: PaymentStatus;
  isPrizeMonth: boolean;
  remarks?: string;
}

export interface Allotment {
  allotmentId: string;
  chitGroupId: string;
  monthNo: number;
  memberId: string;
  allottedAmount: number;
  isConfirmed: boolean;
  createdAt: string;
  createdBy: string;
  revoked?: boolean;
  revokedAt?: string;
  revokedBy?: string;
}

export interface Payment {
  paymentId: string;
  chitGroupId: string;
  memberId: string;
  monthNo: number;
  paidAmount: number;
  paymentDate: string;
  paymentMode: PaymentMode;
  referenceNo: string;
  collectedBy: string;
}

export interface PaymentRequest {
  paymentRequestId: string;
  chitGroupId: string;
  memberId: string;
  monthNo: number;
  amount: number;
  paymentLinkUrl: string;
  status: 'created' | 'sent' | 'paid' | 'expired';
  createdAt: string;
  sentAt?: string;
}

export interface MasterSettings {
  mastersPasswordHash: string;
  lateFeeRules: any;
  receiptTemplateConfig: any;
  whatsappConfig: {
    apiKey?: string;
    gatewayUrl?: string;
  };
}
