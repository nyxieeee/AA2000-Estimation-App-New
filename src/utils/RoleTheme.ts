// ─────────────────────────────────────────────
//  RoleTheme.ts — Central role-based color utility
//  Usage: const theme = getRoleTheme(user.role)
// ─────────────────────────────────────────────

export interface RoleTheme {
  role: 'TECHNICIAN' | 'SALES' | 'ADMIN';
  primary: string;
  primaryDark: string;
  primaryLight: string;
  secondary: string;
  accent: string;
  // Gradient strings
  heroGradient: string;
  sidebarGradient: string;
  buttonGradient: string;
  // Alpha / tint variants
  primaryAlpha08: string;
  primaryAlpha12: string;
  primaryAlpha20: string;
  primaryAlpha30: string;
  // Text colors on primary background
  onPrimary: string;
  // Badge / tag bg
  badgeBg: string;
  badgeText: string;
  // Sidebar bg
  sidebarBg: string;
  sidebarBorder: string;
  // Labels
  roleLabel: string;
  roleEmoji: string;
  // Dashboard hero copy
  heroSubtitle: string;
  // Quick action labels
  quickActions: { label: string; icon: string }[];
}

const TECHNICIAN_THEME: RoleTheme = {
  role: 'TECHNICIAN',
  primary: '#2563EB',
  primaryDark: '#1D4ED8',
  primaryLight: '#3B82F6',
  secondary: '#0EA5E9',
  accent: '#38BDF8',
  heroGradient: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 45%, #2563EB 100%)',
  sidebarGradient: 'linear-gradient(180deg, #EFF6FF 0%, #DBEAFE 100%)',
  buttonGradient: 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
  primaryAlpha08: 'rgba(37,99,235,0.08)',
  primaryAlpha12: 'rgba(37,99,235,0.12)',
  primaryAlpha20: 'rgba(37,99,235,0.20)',
  primaryAlpha30: 'rgba(37,99,235,0.30)',
  onPrimary: '#FFFFFF',
  badgeBg: 'rgba(37,99,235,0.10)',
  badgeText: '#1D4ED8',
  sidebarBg: '#EFF6FF',
  sidebarBorder: '#DBEAFE',
  roleLabel: 'Field Technician',
  roleEmoji: '',
  heroSubtitle:
    'Welcome to your field dispatch portal. Access your assigned sites, fill out security survey wizard modules, and submit hardware requirements directly from the field.',
  quickActions: [
    { label: 'Start Survey', icon: '' },
    { label: 'Open Workspace', icon: '' },
    { label: 'Missing Requirements', icon: '' },
    { label: 'Submit Requirements', icon: '' },
  ],
};

const SALES_THEME: RoleTheme = {
  role: 'SALES',
  primary: '#22C55E',
  primaryDark: '#16A34A',
  primaryLight: '#4ADE80',
  secondary: '#10B981',
  accent: '#34D399',
  heroGradient: 'linear-gradient(135deg, #14532D 0%, #16A34A 45%, #22C55E 100%)',
  sidebarGradient: 'linear-gradient(180deg, #F0FDF4 0%, #DCFCE7 100%)',
  buttonGradient: 'linear-gradient(135deg, #22C55E 0%, #16A34A 100%)',
  primaryAlpha08: 'rgba(34,197,94,0.08)',
  primaryAlpha12: 'rgba(34,197,94,0.12)',
  primaryAlpha20: 'rgba(34,197,94,0.20)',
  primaryAlpha30: 'rgba(34,197,94,0.30)',
  onPrimary: '#FFFFFF',
  badgeBg: 'rgba(34,197,94,0.10)',
  badgeText: '#16A34A',
  sidebarBg: '#F0FDF4',
  sidebarBorder: '#DCFCE7',
  roleLabel: 'Sales Representative',
  roleEmoji: '',
  heroSubtitle:
    'Welcome to your sales workspace. Initiate site survey requests, review completed specifications, and generate accurate pricing sheets for client proposals.',
  quickActions: [
    { label: 'New Survey', icon: '' },
    { label: 'View Pipeline', icon: '' },
    { label: 'Generate Quote', icon: '' },
    { label: 'Follow Up', icon: '' },
  ],
};

const ADMIN_THEME: RoleTheme = {
  role: 'ADMIN',
  primary: '#4F46E5',
  primaryDark: '#4338CA',
  primaryLight: '#6366F1',
  secondary: '#6366F1',
  accent: '#8B5CF6',
  heroGradient: 'linear-gradient(135deg, #1E1B4B 0%, #3730A3 45%, #4F46E5 100%)',
  sidebarGradient: 'linear-gradient(180deg, #EEF2FF 0%, #E0E7FF 100%)',
  buttonGradient: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
  primaryAlpha08: 'rgba(79,70,229,0.08)',
  primaryAlpha12: 'rgba(79,70,229,0.12)',
  primaryAlpha20: 'rgba(79,70,229,0.20)',
  primaryAlpha30: 'rgba(79,70,229,0.30)',
  onPrimary: '#FFFFFF',
  badgeBg: 'rgba(79,70,229,0.10)',
  badgeText: '#4338CA',
  sidebarBg: '#EEF2FF',
  sidebarBorder: '#E0E7FF',
  roleLabel: 'System Administrator',
  roleEmoji: '',
  heroSubtitle:
    'Welcome to the system control center. Create estimation projects, assign technical teams, review surveys, and approve final equipment pricing estimates.',
  quickActions: [
    { label: 'Assign Project', icon: '' },
    { label: 'Review Approvals', icon: '' },
    { label: 'Manage Teams', icon: '' },
    { label: 'Generate Reports', icon: '' },
  ],
};


export function getRoleTheme(role?: string): RoleTheme {
  switch (role) {
    case 'SALES':
      return SALES_THEME;
    case 'ADMIN':
      return ADMIN_THEME;
    case 'TECHNICIAN':
    default:
      return TECHNICIAN_THEME;
  }
}
