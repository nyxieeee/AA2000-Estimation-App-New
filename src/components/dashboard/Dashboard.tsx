import { useState, useMemo, useEffect, useRef } from 'react';
import type { User, Project, AIScanGroup } from '../../App';
import CreateProjectModal from '../projects/CreateProjectModal';
import Sidebar from './Sidebar';
import type { View } from './Sidebar';
import NotificationBell from '../notifications/NotificationBell';
import type { Notification } from '../notifications/NotificationBell';
import Home from './Home';
import CompanyDetail from '../projects/CompanyDetail';
import AccountDropdown from './AccountDropdown';
import { getRoleTheme } from '../../utils/RoleTheme';
import CalendarView from './CalendarView';
import { SkeletonStatCard, SkeletonProjectRow, SkeletonTable } from '../utils/Skeleton';
import { StatBuilding, StatClipboard, StatBolt, StatCalendar, StatCheckCircle, ChartBar, Bell, RoleWrench, RoleChart, RoleComputer } from '../../utils/Icons';
import AISidebar from '../ai-sidebar/AISidebar';
import FloorPlanView from '../floor-plan/FloorPlanView';
import EstimationHub from '../estimation/EstimationHub';
import SavedBOQsView from '../floor-plan/SavedBOQsView';
import SavedEstimationsView from '../estimation/SavedEstimationsView';
import SavedFoldersView from '../ai-sidebar/SavedFoldersView';
import { AIChatbotFloating } from '../chatbot/AIChatbotFloating';

interface Props {
  user: User;
  onLogout: () => void;
  projects: Project[];
  notifications: Notification[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (project: Project, keepOnHome?: boolean) => void;
  onSettings: () => void;
  onNavigateToCreate: () => void;
  selectedCompanyProject: Project | null;
  setSelectedCompanyProject: (project: Project | null) => void;
  onMarkNotificationsAsRead?: (type: string) => void;
  onDeleteProject?: (projectId: string) => void;
  onUpdateProject?: (project: Project) => void;
  aiScans?: AIScanGroup[];
  onSaveAIScan?: (scan: AIScanGroup) => void;
  onRenameAIScan?: (id: string, name: string) => void;
  onDeleteAIScan?: (id: string) => void;
  onUpdateAIScan?: (scan: AIScanGroup) => void;
  contentOverride?: React.ReactNode;
  activeViewOverride?: View;
  onExitOverride?: () => void;
}

type SortMode = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const CATEGORY_VIEW_TO_KEY: Record<string, string> = {
  cctv: 'CCTV',
  fire_alarm: 'FIRE_ALARM',
  fire_protection: 'FIRE_PROTECTION',
  access_control: 'ACCESS_CONTROL',
  burglar_alarm: 'BURGLAR_ALARM',
  other: 'OTHER',
};

const categoryViews = ['cctv', 'fire_alarm', 'fire_protection', 'access_control', 'burglar_alarm', 'other'];

const viewTitles: Record<string, string> = {
  home: 'Home', dashboard: 'Dashboard', workspace: 'Workspace', todo: 'To-do',
  assignment: 'All Projects', missing: 'Missing Requirements', done: 'Done',
  history: 'History / Archive', approval: 'Approval Pipeline', finalize: 'Finalize Review',
  ongoing: 'Ongoing Surveys', upcoming: 'Upcoming Surveys', 'missing-notif': 'Missing Alerts',
  'approval-notif': 'Approval Alerts', 'finalize-notif': 'Finalize Alerts',
  notifications: 'All Notifications',
  'ai-reader': 'AI Document Reader',
  'estimation-hub': 'Estimation Hub',
  'floor-plan': 'Floor Plan AI',
  'saved-folders': 'AI Scan Folders',
  'saved-boqs': 'Saved Floor Plan BOQs',
  'saved-estimations': 'Saved Project Estimations',
};

function filterProjects(projects: Project[], view: string): Project[] {
  const actualProjects = projects.filter(p => p.buildingType !== 'Other');
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  switch (view) {
    case 'workspace': case 'todo': case 'manual-survey':
      return actualProjects.filter(p => p.status === 'Pending' || p.status === 'In Progress');
    case 'assignment': case 'floor-plan': return actualProjects;
    case 'missing': return actualProjects.filter(p => {
      const isCompleted = p.status === 'Completed' || p.status?.includes('Finalized');
      return !isCompleted && (!p.startDate || p.startDate < today);
    });
    case 'done': return actualProjects.filter(p => p.status === 'Completed' || p.status?.includes('Finalized'));
    case 'history': return actualProjects.filter(p => p.status === 'Completed' || p.status?.includes('Finalized'));
    case 'ongoing':
      return actualProjects.filter(p => {
        const isCompleted = p.status === 'Completed' || p.status?.includes('Finalized');
        return !isCompleted && p.startDate === today;
      });
    case 'upcoming':
      return actualProjects.filter(p => {
        const isCompleted = p.status === 'Completed' || p.status?.includes('Finalized');
        return !isCompleted && !!p.startDate && p.startDate > today;
      });
    case 'missing-notif':
      return actualProjects.filter(p => {
        const isCompleted = p.status === 'Completed' || p.status?.includes('Finalized');
        return !isCompleted && (!p.startDate || p.startDate < today);
      });
    case 'approval': case 'approval-notif':
      return actualProjects.filter(p => p.status === 'Finalized');
    case 'finalize': case 'finalize-notif':
      return actualProjects.filter(
        p => p.status === 'Finalized - Approved' || p.status === 'Finalized - Rejected' || p.status === 'Completed'
      );
    default: return actualProjects;
  }
}

function sortProjects(projects: Project[], sort: SortMode): Project[] {
  const s = [...projects];
  switch (sort) {
    case 'newest': return s.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case 'oldest': return s.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case 'name-asc': return s.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc': return s.sort((a, b) => b.name.localeCompare(a.name));
  }
}

const statusConfig: Record<string, { color: string; bg: string; bar: string }> = {
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', bar: '#2563EB' },
  'Pending': { color: '#D97706', bg: 'rgba(217,119,6,0.08)', bar: '#D97706' },
  'Completed': { color: '#059669', bg: 'rgba(5,150,105,0.08)', bar: '#059669' },
  'Finalized - Approved': { color: '#059669', bg: 'rgba(5,150,105,0.08)', bar: '#059669' },
  'Finalized - Rejected': { color: '#DC2626', bg: 'rgba(220,38,38,0.08)', bar: '#DC2626' },
  'Finalized': { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', bar: '#7C3AED' },
};

function StatusBadge({ status }: { status: string }) {
  const isSurvey = status === 'Pending' || status === 'In Progress' || status === 'Finalized - Rejected';
  const isReview = status === 'Finalized';
  const isApproved = status === 'Completed' || status === 'Finalized - Approved';

  const label = isReview ? 'Awaiting Approval' : isApproved ? 'Approved' : 'Survey In Progress';
  const cfg = isReview 
    ? { color: '#CA8A04', bg: 'rgba(202,138,4,0.08)' }
    : isApproved 
    ? { color: '#16A34A', bg: 'rgba(22,163,74,0.08)' }
    : { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' };

  return (
    <span
      className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {label}
    </span>
  );
}

const typeConfig = {
  ongoing: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Ongoing', dot: '#2563EB' },
  upcoming: { color: '#059669', bg: 'rgba(5,150,105,0.08)', label: 'Upcoming', dot: '#059669' },
  missing: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'Missing', dot: '#D97706' },
  approval: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Approval', dot: '#7C3AED' },
  finalize: { color: '#059669', bg: 'rgba(5,150,105,0.08)', label: 'Finalize', dot: '#059669' },
};

// Animated stat card
function StatCard({
  label,
  value,
  sub,
  icon,
  color,
  bg,
  delay = 0,
  onClick,
}: {
  label: string;
  value: number;
  sub: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  delay?: number;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 relative overflow-hidden hover-lift animate-fade-in-up cursor-pointer flex flex-col justify-between shadow-xs transition-all hover:shadow-md"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider truncate">{label}</span>
        <div
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center text-sm sm:text-base shrink-0 ml-1"
          style={{ background: bg }}
        >
          {icon}
        </div>
      </div>
      <div>
        <p className="text-2xl sm:text-3xl font-black animate-count tracking-tight" style={{ color }}>{value}</p>
        <p className="text-[10px] sm:text-[11px] font-medium text-slate-400 mt-0.5 truncate">{sub}</p>
      </div>
    </div>
  );
}

export default function Dashboard({
  user,
  onLogout,
  projects,
  notifications,
  onSelectProject,
  onCreateProject,
  onSettings,
  onNavigateToCreate,
  selectedCompanyProject,
  setSelectedCompanyProject,
  onMarkNotificationsAsRead,
  onDeleteProject,
  onUpdateProject,
  aiScans = [],
  onSaveAIScan,
  onRenameAIScan,
  onDeleteAIScan,
  onUpdateAIScan,
  contentOverride,
  activeViewOverride,
  onExitOverride,
}: Props) {
  const [view, setView] = useState<View>('dashboard');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' && window.innerWidth < 768);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [isCompanyMode, setIsCompanyMode] = useState(false);
  const [activeNotifTab, setActiveNotifTab] = useState<'ongoing' | 'upcoming' | 'missing' | 'approval' | 'finalize'>('ongoing');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [view]);
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('aa2000_pinned'); return s ? new Set(JSON.parse(s)) : new Set(); }
    catch { return new Set(); }
  });
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    localStorage.setItem('aa2000_pinned', JSON.stringify([...pinned]));
  }, [pinned]);

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const theme = getRoleTheme(user.role);

  useEffect(() => { setProjectList(projects); }, [projects]);

  useEffect(() => {
    if (onMarkNotificationsAsRead) {
      if (view === 'ongoing') onMarkNotificationsAsRead('ongoing');
      else if (view === 'upcoming') onMarkNotificationsAsRead('upcoming');
      else if (view === 'missing-notif') onMarkNotificationsAsRead('missing');
      else if (view === 'approval-notif') onMarkNotificationsAsRead('approval');
      else if (view === 'finalize-notif') onMarkNotificationsAsRead('finalize');
    }
  }, [view, onMarkNotificationsAsRead]);

  const isCategoryView = categoryViews.includes(view);
  const categoryFilter = isCategoryView ? (CATEGORY_VIEW_TO_KEY[view] || null) : null;
  const isNotification = ['ongoing', 'upcoming', 'missing-notif', 'approval-notif', 'finalize-notif'].includes(view);

  const filtered = useMemo(() => {
    const f = filterProjects(projectList, view);
    const q = search.toLowerCase();
    return sortProjects(
      f.filter(p => p.name.toLowerCase().includes(q) || p.clientName.toLowerCase().includes(q) || p.location.toLowerCase().includes(q)),
      sort
    );
  }, [projectList, view, search, sort]);

  const pinnedItems = filtered.filter(p => pinned.has(p.id));
  const unpinnedItems = filtered.filter(p => !pinned.has(p.id));
  const ordered = [...pinnedItems, ...unpinnedItems];

  // Stats
  const companyFolders = projectList.filter(p => p.buildingType === 'Other');
  const actualProjects = projectList.filter(p => p.buildingType !== 'Other');
  const totalProjects = actualProjects.length;
  const companyCount = companyFolders.length;

  // Derive display status for each company folder (matching Home.tsx logic)
  const folderStatusMap: Record<string, string> = {};
  const clean = (s?: string) => (s || '').trim().toLowerCase();
  for (const folder of companyFolders) {
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

  const pendingCount = actualProjects.filter(p => p.status === 'Pending').length;
  const inProgressCount = actualProjects.filter(p => p.status === 'In Progress').length;
  const completedCount = actualProjects.filter(p => p.status === 'Completed' || p.status?.includes('Finalized')).length;

  const countOngoing = notifications.filter(n => n.type === 'ongoing').length;
  const countUpcoming = notifications.filter(n => n.type === 'upcoming').length;
  const countMissing = notifications.filter(n => n.type === 'missing').length;
  const countApproval = notifications.filter(n => n.type === 'approval').length;
  const countFinalize = notifications.filter(n => n.type === 'finalize').length;

  const handleDelete = (id: string) => {
    const target = projectList.find(p => p.id === id);
    const idsToDelete = [id];
    if (target && target.buildingType === 'Other') {
      const clean = (s?: string) => (s || '').trim().toLowerCase();
      const targetName = clean(target.name);
      const targetClientName = clean(target.clientName);
      const children = projectList.filter(
        p => p.buildingType !== 'Other' && (clean(p.clientName) === targetName || clean(p.clientName) === targetClientName)
      );
      idsToDelete.push(...children.map(p => p.id));
    }
    setProjectList(prev => prev.filter(p => !idsToDelete.includes(p.id)));
    try {
      const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
      const remaining = surveys.filter((s: any) => !idsToDelete.includes(s.projectId));
      localStorage.setItem('aa2000_surveys', JSON.stringify(remaining));
    } catch { }
    setPinned(prev => { const n = new Set(prev); idsToDelete.forEach(dId => n.delete(dId)); return n; });
    idsToDelete.forEach(dId => {
      try {
        localStorage.removeItem(`aa2000_estimation_${dId}`);
      } catch { }
      if (onDeleteProject) onDeleteProject(dId);
    });
    setDeleteConfirm(null);
    setMenuOpen(null);
  };

  const handleSaveEdit = (updated: Project) => {
    setProjectList(prev => prev.map(p => p.id === updated.id ? updated : p));
    if (onUpdateProject) onUpdateProject(updated);
    setEditProject(null);
  };

  const handlePin = (id: string) => {
    setPinned(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
    setMenuOpen(null);
  };

  const [viewHistory, setViewHistory] = useState<View[]>([]);

  const navigate = (v: View) => {
    setMobileMenuOpen(false);
    setSelectedCompanyProject(null);
    if (v === 'create-survey') { onNavigateToCreate(); return; }
    // estimation-hub is rendered inside dashboard with sidebar — no full-screen override needed
    if (contentOverride && onExitOverride) {
      onExitOverride();
    }
    setView(prevView => {
      if (v !== prevView) {
        setViewHistory(prev => [...prev, prevView]);
      }
      return v;
    });
  };

  const goBack = () => {
    if (viewHistory.length === 0) return;
    const prevView = viewHistory[viewHistory.length - 1];
    setViewHistory(prev => prev.slice(0, -1));
    setView(prevView);
  };

  const navigateNotif = (type: string) => {
    setSelectedCompanyProject(null);
    const m: Record<string, View> = {
      notifications: 'notifications', ongoing: 'ongoing', upcoming: 'upcoming',
      missing: 'missing-notif', approval: 'approval-notif', finalize: 'finalize-notif',
    };
    const targetView = m[type] || 'dashboard';
    setView(prevView => {
      if (targetView !== prevView) {
        setViewHistory(prev => [...prev, prevView]);
      }
      return targetView as View;
    });
    if (type === 'notifications' && onMarkNotificationsAsRead) onMarkNotificationsAsRead('all');
  };

  const pipelineStages = [
    { label: 'Pending', count: pendingCount, color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'In Progress', count: inProgressCount, color: theme.primary, bg: theme.primaryAlpha08 },
    { label: 'Completed', count: completedCount, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  ];

  // Today's date
  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div
      className="flex h-screen overflow-hidden w-full"
      style={{
        background: 'radial-gradient(ellipse at 20% 20%, rgba(191,219,254,0.2) 0%, transparent 55%), #F8FAFC',
      }}
    >
      {/* Desktop Sidebar (Only rendered when not mobile) */}
      {!isMobile && (
        <div className="h-screen sticky top-0 z-40 shrink-0">
          <Sidebar isMobile={false} user={user} currentView={activeViewOverride || view} onNavigate={navigate} notifications={notifications} projects={projects} aiScans={aiScans} onNewSurvey={onNavigateToCreate} />
        </div>
      )}

      {/* Mobile Sidebar Drawer Overlay (Only rendered when mobile menu is open) */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative w-[280px] max-w-[80vw] h-full shadow-2xl z-10 overflow-hidden flex flex-col" style={{ background: '#EFF6FF' }}>
            <div className="p-3 border-b flex items-center justify-between" style={{ background: '#DBEAFE', borderColor: '#BFDBFE' }}>
              <span className="text-xs font-black text-blue-600 uppercase tracking-wider">AA2000 Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-7 h-7 rounded-full bg-blue-200/80 text-slate-700 hover:bg-blue-300 flex items-center justify-center text-xs font-black cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-y-auto w-full">
              <Sidebar isMobile={true} user={user} currentView={activeViewOverride || view} onNavigate={navigate} notifications={notifications} projects={projects} aiScans={aiScans} onNewSurvey={() => { setMobileMenuOpen(false); onNavigateToCreate(); }} />
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 flex flex-col min-w-0 relative overflow-hidden">

        {/* ══════════════════════════════════════════
            TOP NAVIGATION BAR (Glassmorphism)
        ══════════════════════════════════════════ */}
        {!contentOverride && (
          <div
            className="sticky top-0 z-50 px-4 sm:px-6 h-14 flex items-center justify-between shrink-0 glass"
            style={{ borderBottom: '1px solid rgba(226,232,240,0.8)' }}
          >
          {/* Left: Mobile menu toggle + Back button + System status + date */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-1.5 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 md:hidden transition-colors"
              title="Open navigation menu"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </button>
            {view !== 'dashboard' && viewHistory.length > 0 && (
              <button
                onClick={goBack}
                className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                title="Go back"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span className="text-[10px] font-bold hidden sm:inline">Back</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 bg-slate-50/80 border border-slate-200 rounded-full px-3 py-1">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              <span className="text-[9px] font-bold text-emerald-800 tracking-wider">ONLINE</span>
            </div>
            <span className="text-[10px] font-medium text-slate-400 hidden sm:block">{todayLabel}</span>
          </div>

          {/* Right: Search + Notifications + Account */}
          <div className="flex items-center gap-3 overflow-visible">
            {/* Search */}
            <div className="relative hidden sm:block">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search projects..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="search-input w-52 pl-9 pr-3 py-1.5 rounded-xl text-[11px] font-medium bg-slate-50/80 border border-slate-200 outline-none text-slate-700 focus:bg-white transition-all"
              />
            </div>

            {/* Notification Bell */}
            <NotificationBell notifications={notifications} onViewAll={navigateNotif} />

            {/* Divider */}
            <div className="w-px h-5 bg-slate-200" />

            {/* Account dropdown */}
            <AccountDropdown user={user} onLogout={onLogout} onSettings={onSettings} />
          </div>
        </div>
      )}

        {/* ══════════════════════════════════════════
            PAGE CONTENT
        ══════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto">
          {contentOverride ? (
            contentOverride
          ) : (
            <>
              {/* Always mounted (hidden when inactive) so AI analysis continues in background */}
              <div style={{ display: view === 'ai-reader' ? undefined : 'none' }}>
                <AISidebar
                  onCreateProject={onCreateProject}
                  onSelectProject={onSelectProject}
                  onSaveAIScan={onSaveAIScan}
                />
              </div>
              <div style={{ display: view === 'floor-plan' ? undefined : 'none' }}>
                <FloorPlanView />
              </div>
              <div style={{ display: view === 'estimation-hub' ? undefined : 'none', height: view === 'estimation-hub' ? '100%' : undefined }}>
                <EstimationHub
                  projects={projects}
                  onCreateProject={onCreateProject}
                  onSelectProject={onSelectProject}
                  onSaveAIScan={onSaveAIScan}
                  onNavigateToCreate={onNavigateToCreate}
                />
              </div>
              {selectedCompanyProject ? (
            <CompanyDetail
              user={user}
              companyProject={selectedCompanyProject}
              projects={projectList}
              onBack={() => setSelectedCompanyProject(null)}
              onSelectProject={onSelectProject}
              onNewSurvey={onNavigateToCreate}
              onDeleteProject={handleDelete}
            />
          ) : view === 'home' || view === 'ai-reader' || view === 'floor-plan' || isCategoryView ? (
            <Home
              user={user}
              projects={projectList}
              categoryFilter={categoryFilter}
              onSelectCompany={companyName => {
                const clean = (s?: string) => (s || '').trim().toLowerCase();
                const target = clean(companyName);
                const found = projectList.find(
                  p => clean(p.name) === target || clean(p.clientName) === target
                );
                if (found) {
                  setSelectedCompanyProject(found);
                } else {
                  setSelectedCompanyProject({
                    id: `company-synth-${Date.now()}`,
                    name: companyName,
                    clientName: companyName,
                    location: '',
                    buildingType: 'Other',
                    status: 'Pending',
                    assignedTechnicians: [],
                    createdAt: new Date().toISOString(),
                  });
                }
              }}
              onSelectProject={onSelectProject}
              onNewCompanyClick={() => { setIsCompanyMode(true); setShowCreate(true); }}
              onDeleteProject={handleDelete}
              onUpdateProject={handleSaveEdit}
              aiScans={aiScans}
              onRenameAIScan={onRenameAIScan}
              onDeleteAIScan={onDeleteAIScan}
              onUpdateAIScan={onUpdateAIScan}
            />
          ) : view === 'estimation-hub' ? null
          : view === 'calendar' ? (
            <CalendarView
              projects={projectList}
              onSelectProject={onSelectProject}
              userRole={user.role || 'TECHNICIAN'}
            />
          ) : view === 'saved-folders' ? (
            <SavedFoldersView
              aiScans={aiScans}
              onRenameAIScan={onRenameAIScan}
              onDeleteAIScan={onDeleteAIScan}
              onUpdateAIScan={onUpdateAIScan}
            />
          ) : view === 'saved-boqs' ? (
            <SavedBOQsView />
          ) : view === 'history' ? (
            <SavedEstimationsView
              projects={projectList}
              statusFilter={['Completed', 'Finalized - Approved', 'Finalized - Rejected', 'Unknown']}
              onDeleteProject={handleDelete}
            />
          ) : view === 'saved-estimations' ? (
            <SavedEstimationsView
              projects={projectList}
              onDeleteProject={handleDelete}
            />
          ) : (
            <div className="pb-10">
              {/* Dashboard view: title + stats */}
              {view === 'dashboard' && (
                <>
                  {/* Clean Header */}
                  <div className="px-6 pt-6 animate-fade-in-up">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <h1
                          className="text-2xl font-black tracking-tight"
                          style={{ color: '#0F172A', fontFamily: 'Manrope, Inter, sans-serif' }}
                        >
                          Welcome back, {user.fullName.split(' ')[0]}! 👋
                        </h1>
                        <p className="text-[11px] font-bold text-slate-400 mt-0.5 uppercase tracking-wider">
                          AA2000 Security &amp; Technology Solutions Inc. · System Estimation Platform
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Clean 5-Stat Cards Grid */}
                  <div className="px-4 sm:px-6 pt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 w-full">
                    {isLoading ? (
                      <>
                        <SkeletonStatCard delay={0} />
                        <SkeletonStatCard delay={50} />
                        <SkeletonStatCard delay={100} />
                        <SkeletonStatCard delay={150} />
                        <SkeletonStatCard delay={200} />
                      </>
                    ) : (
                      <>
                        <StatCard label="Companies" value={companyCount} sub="Company folders" icon={<StatBuilding className="w-5 h-5" />} color={theme.primary} bg={theme.primaryAlpha08} delay={0} onClick={() => navigate('home')} />
                        <StatCard label="Projects" value={totalProjects} sub="All site surveys" icon={<StatClipboard className="w-5 h-5" />} color={theme.primary} bg={theme.primaryAlpha08} delay={50} onClick={() => navigate('assignment')} />
                        <StatCard label="In Progress" value={inProgressCount} sub="Ongoing surveys" icon={<StatBolt className="w-5 h-5" />} color={theme.primary} bg={theme.primaryAlpha08} delay={100} onClick={() => navigate('workspace')} />
                        <StatCard label="Pending" value={pendingCount} sub="Awaiting start" icon={<StatCalendar className="w-5 h-5" />} color="#CA8A04" bg="rgba(202,138,4,0.08)" delay={150} onClick={() => navigate('workspace')} />
                        <StatCard label="Completed" value={completedCount} sub="Finalized surveys" icon={<StatCheckCircle className="w-5 h-5" />} color="#16A34A" bg="rgba(22,163,74,0.08)" delay={200} onClick={() => navigate('done')} />
                      </>
                    )}
                  </div>

                  {/* Primary Action Content: Pending Surveys / Recent Projects */}
                  <div className="px-6 pt-6">
                    <div className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-sm animate-fade-in-up">
                      <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
                        <div>
                          <h3 className="text-sm font-black tracking-wider text-slate-800 uppercase flex items-center gap-2">
                            <span>Pending Surveys & Active Projects</span>
                            {pendingCount > 0 && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-500 text-white">
                                {pendingCount} Pending
                              </span>
                            )}
                          </h3>
                          <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                            Click any project below to open site survey, upload floor plan, or build BOQ
                          </p>
                        </div>
                        <button
                          onClick={() => navigate('workspace')}
                          className="text-xs font-bold text-blue-700 hover:text-blue-900 transition-colors"
                        >
                          View All Workspace →
                        </button>
                      </div>

                      {/* Project Cards Grid */}
                      {actualProjects.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {actualProjects.slice(0, 6).map((p) => {
                            const isPending = p.status === 'Pending';
                            return (
                              <div
                                key={p.id}
                                onClick={() => onSelectProject(p)}
                                className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                                  isPending
                                    ? 'bg-amber-50/30 border-amber-200 hover:border-amber-400 hover:shadow-md'
                                    : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                                }`}
                              >
                                <div>
                                  <div className="flex items-center justify-between gap-2 mb-2">
                                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 truncate">
                                      {p.clientName}
                                    </span>
                                    <span
                                      className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                        isPending
                                          ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                          : p.status === 'In Progress'
                                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                          : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      }`}
                                    >
                                      {p.status}
                                    </span>
                                  </div>
                                  <h4 className="text-xs font-black text-slate-800 mb-1 leading-snug">{p.name}</h4>
                                  <p className="text-[11px] text-slate-500 font-medium truncate mb-3">📍 {p.location || 'Location not set'}</p>
                                </div>

                                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-bold text-slate-400 truncate">
                                    {p.systemTypes?.slice(0, 2).join(', ') || 'General System'}
                                  </span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); onSelectProject(p); }}
                                    className="px-3.5 py-1.5 rounded-xl text-xs font-black text-white transition-all shadow-sm flex items-center gap-1 shrink-0 hover:scale-105 active:scale-95"
                                    style={{
                                      background: isPending ? 'linear-gradient(135deg, #D97706 0%, #B45309 100%)' : 'linear-gradient(135deg, #1D4ED8 0%, #1E40AF 100%)',
                                      color: '#FFFFFF'
                                    }}
                                  >
                                    <span>Open Survey</span>
                                    <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                                    </svg>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-12 text-center flex flex-col items-center justify-center">
                          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                            <StatClipboard className="w-6 h-6" />
                          </div>
                          <h4 className="text-sm font-black text-slate-800 mb-1">No site surveys created yet</h4>
                          <p className="text-xs text-slate-500 max-w-sm mb-4">Click below to start your first survey and build low-voltage estimations.</p>
                          <button
                            onClick={onNavigateToCreate}
                            className="px-5 py-2.5 rounded-xl font-black text-xs text-white bg-blue-700 hover:bg-blue-800 shadow-md transition-all"
                          >
                            Start New Survey
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Project Table (non-dashboard, non-notifications, non-category views) */}
              {view !== 'dashboard' && view !== 'notifications' && !isCategoryView && (
                <div className="px-6 pt-6">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm animate-fade-in-up">
                    {/* Table header */}
                    <div
                      className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4"
                      style={{ borderBottom: '1px solid #F1F5F9' }}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-black text-slate-800 uppercase tracking-tight">
                            {viewTitles[view] || 'Projects'}
                          </span>

                        </div>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                          AA2000 Security · Estimation Platform
                        </p>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative flex-1 sm:max-w-xs">
                          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search projects..."
                            className="search-input w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:bg-white transition-all"
                          />
                        </div>
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
                      </div>
                    </div>

                    {/* Table body */}
                    <div className="overflow-x-auto">
                      {isLoading ? (
                        <SkeletonTable columns={4} rows={5} />
                      ) : ordered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 gap-3">
                          <div
                            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl animate-float-a"
                            style={{ background: theme.primaryAlpha08 }}
                          >
                            <StatClipboard className="w-6 h-6" />
                          </div>
                          <div className="text-center">
                            <p className="text-xs font-bold text-slate-600">No projects found</p>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              {user.role === 'ADMIN' ? 'Create a new project to get started' : 'No assignments in this view yet'}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="text-[9px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                              <th className="py-3 pl-6">Project / Client</th>
                              <th className="py-3 text-center">Status</th>
                              <th className="py-3 text-center">Date</th>
                              <th className="py-3 pr-6 text-right" />
                            </tr>
                          </thead>
                          <tbody>
                            {ordered.map((project, i) => {
                              const isPinned = pinned.has(project.id);
                              const isOpen = menuOpen === project.id;
                              const statusBar =
                                Object.entries(statusConfig).find(([key]) => project.status?.includes(key))?.[1]?.bar || '#64748B';

                              return (
                                <tr
                                  key={project.id}
                                  onClick={() => onSelectProject(project)}
                                  className="hover:bg-slate-50/80 cursor-pointer border-b border-slate-50 transition-colors group animate-fade-in-up"
                                  style={{ animationDelay: `${i * 30}ms` }}
                                >
                                  <td className="py-3.5 pl-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-1 h-8 rounded-full shrink-0" style={{ background: statusBar }} />
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <span className="text-xs font-bold text-slate-800">{project.name}</span>
                                          {isPinned && (
                                            <span
                                              className="text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide"
                                              style={{ background: theme.primaryAlpha08, color: theme.primary }}
                                            >
                                              Pinned
                                            </span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5">
                                          {project.clientName} · {project.location}
                                        </p>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="py-3.5 text-center">
                                    <StatusBadge status={project.status} />
                                  </td>
                                  <td className="py-3.5 text-center text-[11px] font-medium text-slate-500">
                                    {project.startDate || '—'}
                                  </td>
                                  <td className={`py-3.5 pr-6 text-right relative ${isOpen ? 'z-20' : ''}`} onClick={e => e.stopPropagation()}>
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
                                        <div className="absolute right-4 top-10 z-30 w-44 rounded-xl bg-white border border-slate-200 py-1.5 shadow-xl text-left animate-scale-in">
                                          <button
                                            onClick={() => { setEditProject(project); setMenuOpen(null); }}
                                            className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                            Edit Project
                                          </button>
                                          <button
                                            onClick={() => handlePin(project.id)}
                                            className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" /></svg>
                                            {isPinned ? 'Unpin' : 'Pin Project'}
                                          </button>
                                          <button
                                            onClick={() => onSelectProject(project)}
                                            className="w-full px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 flex items-center gap-2"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            View Details
                                          </button>
                                          <div className="border-t border-slate-100 my-1" />
                                          <button
                                            onClick={() => { setDeleteConfirm(project.id); setMenuOpen(null); }}
                                            className="w-full px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 flex items-center gap-2"
                                          >
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete Project
                                          </button>
                                        </div>
                                      </>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Notification View */}
              {view === 'notifications' && (
                <div className="px-6 pt-6">
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-fade-in-up">
                    {/* Tabs */}
                    <div className="px-6 pt-4 pb-0 border-b border-slate-100">
                      <div className="flex flex-wrap gap-1">
                        {[
                          { key: 'ongoing', label: 'Ongoing', count: countOngoing, color: '#2563EB' },
                          { key: 'upcoming', label: 'Upcoming', count: countUpcoming, color: '#059669' },
                          { key: 'missing', label: 'Missing', count: countMissing, color: '#D97706' },
                          ...(user.role === 'ADMIN' || user.role === 'TECHNICIAN' || user.role === 'SALES'
                            ? [
                              { key: 'approval', label: 'Approval', count: countApproval, color: '#7C3AED' },
                              { key: 'finalize', label: 'Finalize', count: countFinalize, color: '#059669' },
                            ]
                            : []),
                        ].map(tab => (
                          <button
                            key={tab.key}
                            onClick={() => setActiveNotifTab(tab.key as any)}
                            className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-all mb-[-1px]"
                            style={
                              activeNotifTab === tab.key
                                ? { borderColor: tab.color, color: tab.color }
                                : { borderColor: 'transparent', color: '#94A3B8' }
                            }
                          >
                            {tab.label}
                            <span
                              className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full"
                              style={
                                activeNotifTab === tab.key
                                  ? { background: `${tab.color}15`, color: tab.color }
                                  : { background: '#F1F5F9', color: '#94A3B8' }
                              }
                            >
                              {tab.count}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="divide-y divide-slate-50">
                      {notifications.filter(n => n.type === activeNotifTab).length === 0 ? (
                        <div className="py-12 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-3">
                            <Bell className="w-5 h-5 text-slate-300" />
                          </div>
                          <p className="text-xs font-bold text-slate-400">No alerts in this category</p>
                        </div>
                      ) : (
                        notifications
                          .filter(n => n.type === activeNotifTab)
                          .map(n => {
                            const cfg = typeConfig[n.type] || typeConfig.ongoing;
                            return (
                              <div
                                key={n.id}
                                onClick={() => navigateNotif(n.type)}
                                className="px-6 py-4 flex items-start gap-4 cursor-pointer hover:bg-slate-50/50 transition-colors group"
                              >
                                <div
                                  className="w-2.5 h-2.5 rounded-full mt-1.5 shrink-0"
                                  style={{ background: !n.read ? cfg.dot : '#CBD5E1' }}
                                />
                                <div className="min-w-0 flex-1">
                                  <p className={`text-sm ${!n.read ? 'font-bold text-slate-800' : 'font-medium text-slate-500'}`}>
                                    {n.title}
                                  </p>
                                  <div className="flex items-center gap-3 mt-1.5">
                                    <span className="text-xs text-slate-400 font-medium">
                                      {n.companyName} · {n.date}
                                    </span>
                                    <span
                                      className="text-[8px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wide"
                                      style={{ background: cfg.bg, color: cfg.color }}
                                    >
                                      {cfg.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>

        {/* ── Modals ── */}
        {showCreate && (
          <CreateProjectModal
            userRole={user.role}
            onClose={() => setShowCreate(false)}
            onCreate={p => { onCreateProject(p); setProjectList(prev => [...prev, p]); }}
            isCompanyMode={isCompanyMode}
          />
        )}

        {editProject && (
          <EditProjectModal project={editProject} onClose={() => setEditProject(null)} onSave={handleSaveEdit} />
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-white shadow-2xl border border-slate-100 text-center animate-scale-in">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4 bg-red-50">
                <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-black text-slate-800 text-base mb-1">Delete Project?</h3>
              <p className="text-xs text-slate-400 mb-5">This action cannot be undone.</p>
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
        <AIChatbotFloating userRole={user?.role} activeProjectName={selectedCompanyProject?.name} />
      </main>

    </div>
  );
}

// ── Edit Project Modal (unchanged logic) ──
function EditProjectModal({
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
          <h2 className="text-sm font-black text-slate-800">Edit Project</h2>
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
            <label className={labelCls}>Project Name</label>
            <input value={name} onChange={e => setName(e.target.value)} className={inputCls} required />
          </div>
          <div>
            <label className={labelCls}>Company Name</label>
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
