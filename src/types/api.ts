export type Role = 'ADMIN' | 'OPERATOR';
export type SessionStatus = 'RUNNING' | 'COMPLETED' | 'STOPPED';

export interface User {
  id: number;
  username: string;
  fullName: string;
  role: Role;
  enabled: boolean;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInSeconds: number;
  user: User;
}

export interface Machine {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
}

export interface PropertyOption {
  id: number;
  value: string;
  displayOrder: number;
  active: boolean;
}

export interface ProductProperty {
  id: number;
  name: string;
  active: boolean;
  options: PropertyOption[];
}

export interface Product {
  id: number;
  code: string;
  name: string;
  description?: string | null;
  active: boolean;
  machineIds?: number[];
  machineNames?: string[];
  properties: ProductProperty[];
}

export interface ProductionReport {
  generatedAt: string;
  sessionCount: number;
  completedSessionCount: number;
  totalProduced: number;
  completionRate: number;
  byProduct: Record<string, number>;
  byMachine: Record<string, number>;
  byOperator: Record<string, number>;
  byStatus: Partial<Record<SessionStatus, number>>;
  sessions: ProductionSession[];
  sessionDetails: ProductionReportSessionDetail[];
}

export interface ProductionReportSessionDetail {
  session: ProductionSession;
  durationSeconds: number;
  completionPercentage: number;
  propertyDistribution: Record<string, Record<string, number>>;
}

export interface ProductionSession {
  id: number;
  operatorId: number;
  operatorName: string;
  machineId: number;
  machineCode: string;
  machineName: string;
  productId: number;
  productCode: string;
  productName: string;
  status: SessionStatus;
  targetCount: number;
  producedCount: number;
  startedAt: string;
  lastRecordAt?: string | null;
  endedAt?: string | null;
  archived?: boolean;
  archivedAt?: string | null;
}

export interface ProductionRecordValue {
  propertyId: number;
  propertyName: string;
  optionId: number;
  optionValue: string;
}

export interface ProductionRecord {
  id: number;
  sessionId: number;
  sequenceNumber: number;
  recordedAt: string;
  values: ProductionRecordValue[];
}

export interface ApiErrorBody {
  status?: number;
  message?: string;
  errors?: Record<string, string>;
}
