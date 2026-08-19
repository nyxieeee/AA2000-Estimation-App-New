import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { User, Project, AIScanGroup } from '../../App';
import AIScanGroupDetail from '../ai-sidebar/AIScanGroupDetail';
import { getRoleTheme } from '../../utils/RoleTheme';
import { SkeletonCompanyRow } from '../utils/Skeleton';
import { StatBuilding, StatBolt, StatCalendar, StatPin, RoleWrench, RoleChart, RoleComputer, Folder, ExclamationTriangle, ArrowUpTray, Plus, ChartBar, Document, ChartBar as ViewPipeline, Document as GenerateQuote, SysPhone, User as UserIcon, Check, Users, StatClipboard } from '../../utils/Icons';

interface HomeProps {
  user: User;
  projects: Project[];
  categoryFilter?: string | null;
  onSelectProject: (project: Project) => void;
  onSelectCompany: (companyName: string) => void;
  onNewCompanyClick: () => void;
  onDeleteProject?: (projectId: string) => void;
  onUpdateProject?: (project: Project) => void;
  aiScans?: AIScanGroup[];
  onRenameAIScan?: (id: string, name: string) => void;
  onDeleteAIScan?: (id: string) => void;
  onUpdateAIScan?: (scan: AIScanGroup) => void;
}

const CATEGORY_SYS_TYPES: Record<string, string[]> = {
  CCTV: ['CCTV'],
  FIRE_ALARM: ['FDAS'],
  FIRE_PROTECTION: ['FIRE_PROTECTION'],
  ACCESS_CONTROL: ['ACCESS_CONTROL'],
  BURGLAR_ALARM: ['BURGLAR_ALARM'],
  OTHER: ['DOOR_LOCK', 'EAS_SYSTEM', 'FIXED_ARM_ELEVATOR', 'INTERCOM_NURSE_CALL', 'PABX_PAGING', 'PARKING_BARRIER', 'POS_SYSTEM', 'ROOM_ALERT', 'XRAY_SECURITY'],
};

type SortMode = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const statusConfig: Record<string, { color: string; bg: string; bar: string; dot: string }> = {
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', bar: '#2563EB', dot: '#3B82F6' },
  'Pending': { color: '#CA8A04', bg: 'rgba(202,138,4,0.08)', bar: '#CA8A04', dot: '#EAB308' },
  'Completed': { color: '#16A34A', bg: 'rgba(22,163,74,0.08)', bar: '#16A34A', dot: '#22C55E' },
  'Finalized - Approved': { color: '#16A34A', bg: 'rgba(22,163,74,0.08)', bar: '#16A34A', dot: '#22C55E' },
  'Finalized - Rejected': { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', bar: '#DC2626', dot: '#EF4444' },
  'Finalized': { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', bar: '#7C3AED', dot: '#A78BFA' },
};

function StatusBadge({ status }: { status: string }) {
  const isSurvey = status === 'Pending' || status === 'In Progress' || status === 'Finalized - Rejected';
  const isReview = status === 'Finalized';
  const isApproved = status === 'Completed' || status === 'Finalized - Approved';

  const label = isReview ? 'Awaiting Approval' : isApproved ? 'Approved' : 'Survey In Progress';
  const cfg = isReview 
    ? { color: '#CA8A04', bg: 'rgba(202,138,4,0.08)', dot: '#EAB308' }
    : isApproved 
    ? { color: '#16A34A', bg: 'rgba(22,163,74,0.08)', dot: '#22C55E' }
    : { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', dot: '#3B82F6' };

  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      <span className="status-dot" style={{ background: cfg.dot }} />
      {label}
    </span>
  );
}

// Avatar with initials
function CompanyAvatar({ name, color }: { name: string; color: string }) {
  const initials = name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
  return (
    <div
      className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
      style={{ background: `linear-gradient(135deg, ${color}CC, ${color}99)` }}
    >
      {initials}
    </div>
  );
}

// Animated stat pill
function StatPill({
  label,
  value,
  icon,
  delay = 0,
}: {
  label: string;
  value: number | string;
  color?: string;
  icon: React.ReactNode;
  delay?: number;
}) {
  return (
    <div
      className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl animate-fade-in-up interactive"
      style={{
        background: 'rgba(255,255,255,0.14)',
        border: '1px solid rgba(255,255,255,0.22)',
        animationDelay: `${delay}ms`,
        backdropFilter: 'blur(8px)',
      }}
    >
      <span className="text-lg leading-none">{icon}</span>
      <div>
        <p className="text-[9px] font-semibold text-white/65 leading-none uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-black text-white leading-tight">{value}</p>
      </div>
    </div>
  );
}



export default function Home({
  user,
  projects,
  categoryFilter,
  onSelectProject,
  onSelectCompany,
  onNewCompanyClick,
  onDeleteProject,
  onUpdateProject,
  aiScans = [],
  onRenameAIScan,
  onDeleteAIScan,
  onUpdateAIScan,
}: HomeProps) {
  const [selectedScanGroup, setSelectedScanGroup] = useState<AIScanGroup | null>(null);
  const isAdmin = user.role === 'ADMIN';
  const isSales = user.role === 'SALES';
  const isTechnician = user.role === 'TECHNICIAN';
  const canManageCompanies = isAdmin;
  const theme = getRoleTheme(user.role);

  // Table & Action States
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try {
      const s = localStorage.getItem('aa2000_pinned');
      return s ? new Set(JSON.parse(s)) : new Set();
    } catch {
      return new Set();
    }
  });

  // Sync projects prop to local state
  useEffect(() => {
    setProjectList(projects);
    // Simulate brief loading state for skeleton
    const t = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(t);
  }, [projects]);

  // Sync pinned set to localStorage
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    localStorage.setItem('aa2000_pinned', JSON.stringify([...pinned]));
  }, [pinned]);

  const roleDisplayName = useMemo(() => {
    if (isAdmin) return 'System Administrator';
    if (isSales) return 'Sales Representative';
    if (user.role === 'MANAGER') return 'Project Manager';
    if (isTechnician) return 'Field Technician';
    return 'User';
  }, [user.role]);

  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Today's date label
  const todayLabel = useMemo(() => {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  }, []);

  // Filter projects by relevance to the user role
  const userProjects = useMemo(() => {
    const companyFoldersOnly = projectList.filter(p => p.buildingType === 'Other');
    return companyFoldersOnly;
  }, [projectList, user]);

  // Filter companies by selected system category
  const categoryFiltered = useMemo(() => {
    if (!categoryFilter) return userProjects;
    const sysTypes = CATEGORY_SYS_TYPES[categoryFilter];
    if (!sysTypes) return userProjects;
    const actualProjects = projectList.filter(p => p.buildingType !== 'Other');
    return userProjects.filter(folder => {
      if (folder.systemTypes && folder.systemTypes.length > 0) {
        if (folder.systemTypes.some(sys => sysTypes.includes(sys))) return true;
      }
      const clean = (s?: string) => (s || '').trim().toLowerCase();
      const folderName = clean(folder.name);
      const folderClientName = clean(folder.clientName);
      const childProjects = actualProjects.filter(
        p => clean(p.clientName) === folderName || clean(p.clientName) === folderClientName
      );
      if (childProjects.length === 0) return false;
      return childProjects.some(p => {
        if (!p.systemTypes || p.systemTypes.length === 0) return true;
        return p.systemTypes.some(sys => sysTypes.includes(sys));
      });
    });
  }, [categoryFilter, userProjects, projectList]);

  // Compute KPI stats for hero
  const actualProjects = projectList.filter(p => p.buildingType !== 'Other');

  // Derive display status for each company folder (matching company list badges)
  const folderStatusMap: Record<string, string> = {};
  const clean = (s?: string) => (s || '').trim().toLowerCase();
  for (const folder of userProjects) {
    const folderName = clean(folder.name);
    const folderClientName = clean(folder.clientName);
    const children = actualProjects.filter(
      p => clean(p.clientName) === folderName || clean(p.clientName) === folderClientName
    );
    if (children.length === 0) {
      folderStatusMap[folder.id] = folder.status;
    } else {
      const priority = ['Completed', 'Finalized - Approved', 'Finalized', 'Finalized - Rejected', 'In Progress', 'Pending'];
      let found = folder.status;
      for (const s of priority) {
        if (children.some(c => c.status === s)) { found = s; break; }
      }
      folderStatusMap[folder.id] = found;
    }
  }

  const pendingCount = categoryFiltered.filter(p => (folderStatusMap[p.id] || p.status) === 'Pending').length;
  const inProgressCount = categoryFiltered.filter(p => (folderStatusMap[p.id] || p.status) === 'In Progress').length;
  const completedCount = categoryFiltered.filter(p => {
    const s = folderStatusMap[p.id] || p.status;
    return s === 'Completed' || s.includes('Finalized');
  }).length;
  const today = new Date().toISOString().split('T')[0];
  const todayCount = actualProjects.filter(p => p.startDate === today).length;

  // Pending projects for Start Survey modal
  const pendingByCompany = useMemo(() => {
    const norm = (s?: string) => (s || '').trim().toLowerCase();

    const folders = projectList.filter(p => p.buildingType === 'Other');
    const pending = actualProjects.filter(
      p => p.status === 'Pending' || p.status === 'In Progress'
    );

    const folderByClient = new Map<string, Project>();
    for (const f of folders) {
      if (f.name) folderByClient.set(norm(f.name), f);
      if (f.clientName) folderByClient.set(norm(f.clientName), f);
    }

    const findFolder = (p: Project): Project | undefined => {
      const byClient = folderByClient.get(norm(p.clientName));
      if (byClient) return byClient;
      // Try matching project name against folder name/clientName
      const byName = folders.find(
        f => norm(p.name) === norm(f.name) || norm(p.name) === norm(f.clientName)
      );
      if (byName) return byName;
      // Broader fallback: check if clientName partially matches any folder name
      const nc = norm(p.clientName);
      return folders.find(f => {
        const fn = norm(f.name);
        const fc = norm(f.clientName || '');
        return (nc && fn && (nc.includes(fn) || fn.includes(nc))) ||
               (nc && fc && (nc.includes(fc) || fc.includes(nc)));
      });
    };

    const map = new Map<string, { company: Project; projects: Project[] }>();
    for (const p of pending) {
      const folder = findFolder(p);
      const resolvedName = folder?.name || p.clientName || 'Unknown Company';
      const normName = norm(resolvedName);
      const key = folder ? norm(folder.name) : (map.has(normName) ? normName : `unmatched:${normName}`);

      if (!map.has(key)) {
        map.set(key, {
          company:
            folder ||
            ({
              id: key,
              name: resolvedName,
              clientName: p.clientName,
              location: p.location,
              status: p.status,
              assignedTechnicians: [],
              createdAt: '',
            } as Project),
          projects: [],
        });
      }
      map.get(key)!.projects.push(p);
    }
    return [...map.values()];
  }, [projectList]);

  const totalPendingCount = useMemo(() => {
    return pendingByCompany.reduce((sum, g) => sum + g.projects.length, 0);
  }, [pendingByCompany]);

  // Search & Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const sorted = [...categoryFiltered];
    if (sort === 'newest') sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    else if (sort === 'oldest') sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else if (sort === 'name-asc') sorted.sort((a, b) => a.name.localeCompare(b.name));
    else if (sort === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name));
    return sorted.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
    );
  }, [categoryFiltered, search, sort]);

  const pinnedItems = filtered.filter(p => pinned.has(p.id));
  const unpinnedItems = filtered.filter(p => !pinned.has(p.id));
  const ordered = [...pinnedItems, ...unpinnedItems];

  const handleDelete = (id: string) => {
    setProjectList(prev => prev.filter(p => p.id !== id));
    if (onDeleteProject) onDeleteProject(id);
    setDeleteConfirm(null);
    setMenuOpen(null);
  };

  const handleSaveEdit = (updated: Project) => {
    setProjectList(prev => prev.map(p => (p.id === updated.id ? updated : p)));
    if (onUpdateProject) onUpdateProject(updated);
    setEditProject(null);
  };

  const handlePin = (id: string) => {
    setPinned(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
    setMenuOpen(null);
  };

  // Avatar colors for companies (cycle through role-adjacent colors)
  const avatarColors = [
    theme.primary, theme.primaryDark, theme.accent, theme.secondary,
    '#8B5CF6', '#EC4899', '#F59E0B', '#14B8A6',
  ];

  // If viewing an AI scan folder
  if (selectedScanGroup) {
    // Find active up-to-date scan from aiScans prop to ensure renames are reflected live
    const activeScan = aiScans.find(s => s.id === selectedScanGroup.id) || selectedScanGroup;
    return (
      <AIScanGroupDetail
        scan={activeScan}
        onBack={() => setSelectedScanGroup(null)}
        onRename={(id, name) => {
          if (onRenameAIScan) onRenameAIScan(id, name);
        }}
        onDelete={(id) => {
          if (onDeleteAIScan) onDeleteAIScan(id);
          setSelectedScanGroup(null);
        }}
        onUpdateScan={(updated) => {
          if (onUpdateAIScan) onUpdateAIScan(updated);
          setSelectedScanGroup(updated);
        }}
      />
    );
  }

  return (
    <div className="px-6 pt-6 pb-10 space-y-6 max-w-7xl mx-auto w-full">

      {/* ══════════════════════════════════════════
          HERO SECTION (Role-Adaptive)
      ══════════════════════════════════════════ */}
      <div
        className="relative overflow-hidden rounded-3xl text-white shadow-lg animate-fade-in-up"
        style={{ background: theme.heroGradient }}
      >
        {/* Decorative mesh/grid */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
        {/* Floating blobs */}
        <div
          className="absolute animate-float-a pointer-events-none"
          style={{
            width: 220, height: 220, right: -40, top: -40,
            borderRadius: '38% 62% 63% 37% / 41% 44% 56% 59%',
            background: 'rgba(255,255,255,0.08)',
          }}
        />
        <div
          className="absolute animate-float-b pointer-events-none"
          style={{
            width: 120, height: 120, right: 80, bottom: -20,
            borderRadius: '63% 37% 37% 63% / 43% 37% 63% 57%',
            background: 'rgba(255,255,255,0.06)',
          }}
        />

        <div className="relative z-10 p-7 flex flex-col md:flex-row md:items-start justify-between gap-6">
          {/* Left: greeting + copy */}
          <div className="space-y-3 max-w-xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-white/20 inline-flex items-center gap-1.5">
                {user.role === 'ADMIN' ? <RoleComputer className="w-3.5 h-3.5" /> : user.role === 'SALES' ? <RoleChart className="w-3.5 h-3.5" /> : <RoleWrench className="w-3.5 h-3.5" />}
                <span>{roleDisplayName}</span>
              </span>
              <span className="text-[10px] text-white/60 font-medium">• {todayLabel}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight" style={{ fontFamily: 'Manrope, Inter, sans-serif' }}>
              {greeting},{' '}
              <span className="text-white/90">{user.fullName?.split(' ')[0] || user.email}!</span>
            </h1>
            <p className="text-xs text-white/70 leading-relaxed font-medium max-w-md">
              {theme.heroSubtitle}
            </p>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap gap-2 pt-1">
              {theme.quickActions.map(({ label }) => (
                <button
                  key={label}
                  onClick={() => {
                    if (label === 'Start Survey') setShowPendingModal(true);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all btn-press"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: '1px solid rgba(255,255,255,0.25)',
                    color: '#fff',
                  }}
                  onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.25)')}
                  onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.15)')}
                >
                  {label === 'Start Survey' || label === 'New Survey' ? <Plus className="w-3.5 h-3.5" /> : label === 'Open Workspace' ? <Folder className="w-3.5 h-3.5" /> : label === 'Missing Requirements' ? <ExclamationTriangle className="w-3.5 h-3.5" /> : label === 'Submit Requirements' ? <ArrowUpTray className="w-3.5 h-3.5" /> : label === 'View Pipeline' ? <ChartBar className="w-3.5 h-3.5" /> : label === 'Generate Quote' ? <Document className="w-3.5 h-3.5" /> : label === 'Follow Up' ? <SysPhone className="w-3.5 h-3.5" /> : label === 'Assign Project' ? <UserIcon className="w-3.5 h-3.5" /> : label === 'Review Approvals' ? <Check className="w-3.5 h-3.5" /> : label === 'Manage Teams' ? <Users className="w-3.5 h-3.5" /> : label === 'Generate Reports' ? <StatClipboard className="w-3.5 h-3.5" /> : null}
                  {label}
                  {label === 'Start Survey' && totalPendingCount > 0 && (
                    <span
                      className="ml-0.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full text-[9px] font-bold"
                      style={{ background: 'rgba(255,255,255,0.35)', color: '#fff' }}
                    >
                      {totalPendingCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right: KPI pills */}
          <div className="flex flex-row md:flex-col flex-wrap gap-2 shrink-0">
            <StatPill label="Total Companies" value={userProjects.length} color={theme.primary} icon={<StatBuilding className="w-4 h-4" />} delay={50} />
            <StatPill label="In Progress" value={inProgressCount} color={theme.primary} icon={<StatBolt className="w-4 h-4" />} delay={100} />
            <StatPill label="Pending" value={pendingCount} color={theme.primary} icon={<StatCalendar className="w-4 h-4" />} delay={150} />
            {todayCount > 0 && (
              <StatPill label="Surveys Today" value={todayCount} color={theme.primary} icon={<StatPin className="w-4 h-4" />} delay={200} />
            )}
          </div>
        </div>
      </div>



      {/* ══════════════════════════════════════════
          COMPANY LIST CARD
      ══════════════════════════════════════════ */}
      <div
        className="bg-white rounded-3xl shadow-sm animate-fade-in-up delay-150"
        style={{ border: '1px solid #E2E8F0' }}
      >
        {/* Controls row */}
        <div
          className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4"
          style={{ borderBottom: '1px solid #F1F5F9' }}
        >
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
              All Companies
            </span>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: theme.primaryAlpha08, color: theme.primary }}
            >
              {ordered.length}
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search companies..."
                className="search-input w-full pl-9 pr-8 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:bg-white transition-all"
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>

            {/* Sort */}
            <select
              value={sort}
              onChange={e => setSort(e.target.value as SortMode)}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-600 outline-none cursor-pointer"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name-asc">Name A–Z</option>
              <option value="name-desc">Name Z–A</option>
            </select>

            {/* New Company Button — Admin / GM only */}
            {canManageCompanies && (
              <button
                onClick={onNewCompanyClick}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white btn-press shrink-0"
                style={{
                  background: theme.buttonGradient,
                  boxShadow: `0 2px 10px ${theme.primary}30`,
                }}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                New Company
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="px-4 py-3">
          {isLoading ? (
            <div className="space-y-1 py-1">
              {[0, 1, 2, 3].map(i => (
                <SkeletonCompanyRow key={i} delay={i * 60} />
              ))}
            </div>
          ) : ordered.length === 0 ? (
            /* ── Premium Empty State ── */
            <div className="empty-state">
              <div
                className="empty-state-icon animate-float-a"
                style={{ background: theme.primaryAlpha08 }}
              >
                <StatBuilding className="w-6 h-6" style={{ color: theme.primary }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  {search ? 'No companies match your search' : 'No companies assigned yet'}
                </p>
                <p className="text-xs mt-1.5 max-w-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                  {search
                    ? 'Try a different search term or clear the filter.'
                    : canManageCompanies
                      ? 'Create a new company folder to start organizing projects.'
                      : 'Once your administrator assigns projects, they\'ll appear here.'}
                </p>
              </div>
              {search ? (
                <button
                  onClick={() => setSearch('')}
                  className="px-4 py-2 rounded-xl text-xs font-bold border transition-all btn-press"
                  style={{ borderColor: theme.primary, color: theme.primary }}
                >
                  Clear Search
                </button>
              ) : canManageCompanies ? (
                <button
                  onClick={onNewCompanyClick}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white transition-all btn-press"
                  style={{ background: theme.buttonGradient, boxShadow: `0 4px 12px ${theme.primary}30` }}
                >
                  + Create First Company
                </button>
              ) : null}
            </div>
          ) : (
            <div className="space-y-1.5">
              {ordered.map((project, i) => {
                const isPinned = pinned.has(project.id);
                const isOpen = menuOpen === project.id;
                const avatarColor = avatarColors[i % avatarColors.length];
                const clean = (s?: string) => (s || '').trim().toLowerCase();
                const folderName = clean(project.name);
                const folderClientName = clean(project.clientName);
                const childProjects = projectList.filter(
                  p => p.buildingType !== 'Other' && (clean(p.clientName) === folderName || clean(p.clientName) === folderClientName)
                );
                const progressPct =
                  childProjects.length > 0
                    ? Math.round(
                      (childProjects.filter(p => p.status === 'Completed' || p.status?.includes('Finalized'))
                        .length /
                        childProjects.length) *
                      100
                    )
                    : 0;
                const displayStatus = (() => {
                  if (childProjects.length === 0) return project.status;
                  const priority = ['Completed', 'Finalized - Approved', 'Finalized', 'Finalized - Rejected', 'In Progress', 'Pending'];
                  for (const s of priority) {
                    if (childProjects.some(c => c.status === s)) return s;
                  }
                  return project.status;
                })();

                return (
                  <div
                    key={project.id}
                    onClick={() => onSelectCompany(project.name)}
                    className={`flex items-center justify-between p-3 rounded-2xl border border-transparent hover:border-slate-200 hover:bg-slate-50/70 transition-all duration-200 cursor-pointer group hover-lift animate-fade-in-up ${isOpen ? 'relative z-20' : ''}`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <CompanyAvatar name={project.name} color={avatarColor} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-slate-800 truncate group-hover:text-slate-900">
                            {project.name}
                          </span>
                          {isPinned && (
                            <span
                              className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide shrink-0"
                              style={{ background: theme.primaryAlpha08, color: theme.primary }}
                            >
                              Pinned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[10px] text-slate-400 truncate">{project.location || '—'}</p>
                          {childProjects.length > 0 && (
                            <span className="text-[9px] text-slate-300 shrink-0">
                              · {childProjects.length} project{childProjects.length !== 1 ? 's' : ''}
                            </span>
                          )}
                        </div>
                        {/* Progress bar */}
                        {childProjects.length > 0 && (
                          <div className="mt-1.5 flex items-center gap-2">
                            <div className="flex-1 h-1 rounded-full bg-slate-100 overflow-hidden max-w-[80px]">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${progressPct}%`, background: avatarColor }}
                              />
                            </div>
                            <span className="text-[9px] text-slate-400 font-medium shrink-0">{progressPct}%</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <StatusBadge status={displayStatus} />
                      {/* Context menu */}
                      <div className="relative" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuOpen(isOpen ? null : project.id)}
                          className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />
                          </svg>
                        </button>

                        {isOpen && (
                          <>
                            <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
                            <div className="absolute right-0 top-8 z-30 w-44 rounded-xl bg-white border border-slate-200 py-1.5 shadow-lg text-left animate-scale-in">
                              <button
                                onClick={() => { setEditProject(project); setMenuOpen(null); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                Edit Project
                              </button>
                              <button
                                onClick={() => handlePin(project.id)}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                </svg>
                                {isPinned ? 'Unpin' : 'Pin Company'}
                              </button>
                              <button
                                onClick={() => { setMenuOpen(null); onSelectCompany(project.name); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                </svg>
                                View Details
                              </button>
                              <div className="border-t border-slate-100 my-1" />
                              <button
                                onClick={() => { setDeleteConfirm(project.id); setMenuOpen(null); }}
                                className="w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                Delete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Pending Projects Modal ── */}
      {showPendingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h2 className="text-sm font-black text-slate-800">Pending Projects</h2>
              <button onClick={() => setShowPendingModal(false)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4 max-h-[60vh] overflow-y-auto">
              {pendingByCompany.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-sm font-bold text-slate-500">No pending projects</p>
                  <p className="text-xs text-slate-400 mt-1">All assigned projects have been completed.</p>
                </div>
              ) : (
                <PendingCompanyList groups={pendingByCompany} onSelect={(p) => { setShowPendingModal(false); onSelectProject(p); }} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editProject && (
        <EditCompanyModal project={editProject} onClose={() => setEditProject(null)} onSave={handleSaveEdit} />
      )}

      {/* ── Delete Confirm ── */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white shadow-2xl border border-slate-100 text-center animate-scale-in">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-50">
              <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-black text-slate-800 text-base mb-1">Delete Company?</h3>
            <p className="text-xs text-slate-400 mb-5">This action cannot be undone. All associated projects will also be removed.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 btn-press"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-500 shadow-md shadow-red-100 btn-press"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Pending Company List ──
function PendingCompanyList({
  groups,
  onSelect,
}: {
  groups: { company: Project; projects: Project[] }[];
  onSelect: (p: Project) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const theme = getRoleTheme('TECHNICIAN');
  return (
    <div className="space-y-1.5">
      {groups.map(({ company, projects }) => {
        const isOpen = expanded === company.id;
        return (
          <div key={company.id} className="rounded-2xl border border-slate-200 overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : company.id)}
              className="w-full flex items-center gap-3 p-3 hover:bg-slate-50 transition-all text-left"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-sm shrink-0"
                style={{ background: `linear-gradient(135deg, ${theme.primary}CC, ${theme.primary}99)` }}
              >
                {company.name.trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 truncate">{company.name}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  {projects.length} pending project{projects.length !== 1 ? 's' : ''}
                  {company.location ? ` · ${company.location}` : ''}
                </p>
              </div>
              <span
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-bold shrink-0"
                style={{ color: theme.primary, background: theme.primaryAlpha08 }}
              >
                {projects.length}
              </span>
              <svg
                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {isOpen && (
              <div className="border-t border-slate-100">
                {projects.map(project => {
                  const typeLabels = (project.systemTypes || []).map(t => {
                    const map: Record<string, string> = {
                      CCTV: 'CCTV', FDAS: 'Fire Alarm', ACCESS_CONTROL: 'Access Control',
                      BURGLAR_ALARM: 'Burglar Alarm', DOOR_LOCK: 'Door Lock',
                      EAS_SYSTEM: 'EAS', FIRE_PROTECTION: 'Fire Protection',
                      FIXED_ARM_ELEVATOR: 'Elevator', INTERCOM_NURSE_CALL: 'Intercom/Nurse',
                      PABX_PAGING: 'PABX/Paging', PARKING_BARRIER: 'Parking Barrier',
                      POS_SYSTEM: 'POS', ROOM_ALERT: 'Room Alert', XRAY_SECURITY: 'X-Ray',
                    };
                    return map[t] || t;
                  });
                  return (
                    <button
                      key={project.id}
                      onClick={() => onSelect(project)}
                      className="w-full flex items-center gap-3 px-4 py-3 pl-14 hover:bg-blue-50/50 transition-all text-left border-b border-slate-50 last:border-b-0 group"
                    >
                      <div className="w-1.5 h-full min-h-[32px] rounded-full shrink-0 self-stretch" style={{ background: project.status === 'Pending' ? '#EAB308' : theme.primary }} />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-slate-800 truncate group-hover:text-blue-700 transition-colors">
                          {project.name || project.systemTypes?.join(', ') || project.buildingType || 'Survey'}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {typeLabels.length > 0 && (
                            <span className="text-[9px] font-semibold text-slate-400 truncate">
                              {typeLabels.join(', ')}
                            </span>
                          )}
                          <span className="text-[9px] text-slate-300">·</span>
                          <span className="text-[9px] text-slate-400 truncate">{project.location || '—'}</span>
                        </div>
                      </div>
                      <span
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-bold uppercase tracking-wide shrink-0"
                        style={{
                          color: project.status === 'Pending' ? '#CA8A04' : theme.primary,
                          background: project.status === 'Pending' ? 'rgba(202,138,4,0.08)' : theme.primaryAlpha08,
                        }}
                      >
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: project.status === 'Pending' ? '#EAB308' : theme.primary }} />
                        {project.status}
                      </span>
                      <svg className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-500 transition-colors shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Edit Company Modal (unchanged logic) ──
function EditCompanyModal({
  project,
  onClose,
  onSave,
}: {
  project: Project;
  onClose: () => void;
  onSave: (p: Project) => void;
}) {
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.clientName);
  const [location, setLocation] = useState(project.location);
  const [status, setStatus] = useState(project.status);
  const [buildingType, setBuildingType] = useState(project.buildingType || '');
  const [floors, setFloors] = useState<number | string>(project.floors ?? '');

  const inputCls =
    'w-full px-3.5 py-2.5 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 outline-none focus:border-blue-400 transition-colors font-medium';
  const labelCls = 'block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-2xl overflow-hidden animate-scale-in">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-sm font-black text-slate-800">Edit Company</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ ...project, name, clientName, location, status, buildingType, floors: floors !== '' && !isNaN(Number(floors)) ? Number(floors) : undefined });
            onClose();
          }}
          className="p-5 space-y-4"
        >
          <div>
            <label className={labelCls}>Company Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Client / Contact Name</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} className={inputCls} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option>Pending</option><option>In Progress</option><option>Completed</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Building Type</label>
              <select value={buildingType} onChange={e => setBuildingType(e.target.value)} className={`${inputCls} cursor-pointer`}>
                <option value="">Select...</option>
                <option>Office</option><option>Retail</option><option>Warehouse</option>
                <option>School</option><option>Hospital</option><option>Residential</option>
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Floors</label>
            <input type="number" min={1} placeholder="e.g. 3" value={floors === 0 ? '' : floors} onChange={e => setFloors(e.target.value === '' ? '' : e.target.value)} className={inputCls} />
          </div>
          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200 btn-press">
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white btn-press"
              style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 12px rgba(37,99,235,0.25)' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
