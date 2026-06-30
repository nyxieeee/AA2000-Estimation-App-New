// Constants for roles and permissions
export const ROLES = {
  TECHNICIAN: 'TECHNICIAN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  SALES: 'SALES',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

// User roles and their permissions
export const ROLE_PERMISSIONS: Record<Role, string[]> = {
  [ROLES.TECHNICIAN]: [
    'view_own_projects',
    'create_surveys',
    'edit_own_surveys',
    'submit_for_approval',
    'view_estimates',
  ],
  [ROLES.ADMIN]: [
    'view_all_projects',
    'create_projects',
    'edit_all_projects',
    'approve_estimates',
    'manage_users',
    'manage_surveys',
    'manage_settings',
  ],
  [ROLES.MANAGER]: [
    'view_all_projects',
    'create_projects',
    'edit_assigned_projects',
    'approve_estimates',
    'assign_technicians',
  ],
  [ROLES.SALES]: [
    'view_all_projects',
    'create_projects',
    'edit_assigned_projects',
    'view_estimates',
  ],
};

// Survey status states
export const SURVEY_STATUS = {
  DRAFT: 'Draft',
  SUBMITTED: 'Submitted',
  REVIEWING: 'Reviewing',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
} as const;

export type SurveyStatus = typeof SURVEY_STATUS[keyof typeof SURVEY_STATUS];

// Project status states
export const PROJECT_STATUS = {
  PENDING: 'Pending',
  IN_PROGRESS: 'In Progress',
  FINALIZED: 'Finalized',
  FINALIZED_APPROVED: 'Finalized - Approved',
  FINALIZED_REJECTED: 'Finalized - Rejected',
  COMPLETED: 'Completed',
} as const;

export type ProjectStatus = typeof PROJECT_STATUS[keyof typeof PROJECT_STATUS];

// User session status
export const SESSION_STATUS = {
  ACTIVE: 'Active',
  IDLE: 'Idle',
  EXPIRED: 'Expired',
  LOGGED_OUT: 'Logged Out',
} as const;

export type SessionStatus = typeof SESSION_STATUS[keyof typeof SESSION_STATUS];

// Material categories for estimation
export const MATERIAL_CATEGORIES = {
  HARDWARE: 'Hardware',
  WIRES_CABLES: 'Wires & Cables',
  MOUNTING_HARDWARE: 'Mounting Hardware',
  TOOLS: 'Tools',
  SAFETY_EQUIPMENT: 'Safety Equipment',
  LABELS_BRACKETS: 'Labels & Brackets',
  PROTECTIVE_COVERINGS: 'Protective Coverings',
  OTHER: 'Other',
} as const;

export type MaterialCategory = typeof MATERIAL_CATEGORIES[keyof typeof MATERIAL_CATEGORIES];

export const DEFAULT_TECHNICIANS = [
  { id: 'tech-1', fullName: 'John Technician', email: 'tech@aa2000.com' },
  { id: 'tech-1', fullName: 'Mike Wilson', email: 'mike@aa2000.com' },
  { id: 'tech-2', fullName: 'Sarah Johnson', email: 'sarah@aa2000.com' },
  { id: 'tech-3', fullName: 'David Chen', email: 'david@aa2000.com' },
];

