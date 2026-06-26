import { useState, useMemo, useEffect, useRef } from 'react';
import type { User, Project } from '../../App';
import CreateProjectModal from '../projects/CreateProjectModal';
import Sidebar from './Sidebar';
import type { View } from './Sidebar';
import NotificationBell from '../notifications/NotificationBell';
import type { Notification } from '../notifications/NotificationBell';

interface Props {
  user: User;
  onLogout: () => void;
  projects: Project[];
  notifications: Notification[];
  onSelectProject: (project: Project) => void;
  onCreateProject: (project: Project) => void;
  onSettings: () => void;
  onNavigateToCreate: () => void;
}

type SortMode = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const viewTitles: Record<string, string> = {
  dashboard: 'Dashboard', workspace: 'Workspace', todo: 'To-do', assignment: 'All Assignments',
  missing: 'Missing Requirements', done: 'Done', history: 'History / Archive', approval: 'Approval Pipeline',
  finalize: 'Finalize Review', ongoing: 'Ongoing Surveys', upcoming: 'Upcoming Surveys',
  'missing-notif': 'Missing Alerts', 'approval-notif': 'Approval Alerts', 'finalize-notif': 'Finalize Alerts',
};

function filterProjects(projects: Project[], view: string): Project[] {
  switch (view) {
    case 'workspace': case 'todo': return projects.filter(p => p.status === 'Pending' || p.status === 'In Progress');
    case 'assignment': return projects;
    case 'missing': case 'missing-notif': return projects.filter(p => !p.status || p.status === 'Pending');
    case 'done': return projects.filter(p => p.status === 'Completed' || p.status?.includes('Finalized'));
    case 'history': return projects.filter(p => p.status === 'Completed');
    case 'ongoing': return projects.filter(p => p.status === 'In Progress');
    case 'upcoming': return projects.filter(p => p.status === 'Pending' && !!p.startDate && new Date(p.startDate) > new Date());
    case 'approval': case 'approval-notif': return projects.filter(p => p.status === 'Finalized' || p.status === 'In Progress');
    case 'finalize': case 'finalize-notif': return projects.filter(p => p.status === 'Finalized - Approved' || p.status === 'Finalized - Rejected');
    default: return projects;
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
  'Finalized': { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', bar: '#7C3AED' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = Object.entries(statusConfig).find(([key]) => status && status.includes(key))?.[1] || {
    color: '#64748B', bg: 'rgba(100,116,139,0.08)', bar: '#64748B',
  };
  return (
    <span
      className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {status || 'Pending'}
    </span>
  );
}

export default function Dashboard({ user, onLogout, projects, notifications, onSelectProject, onCreateProject, onSettings, onNavigateToCreate }: Props) {
  const [view, setView] = useState<View>('dashboard');
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [pinned, setPinned] = useState<Set<string>>(() => {
    try { const s = localStorage.getItem('aa2000_pinned'); return s ? new Set(JSON.parse(s)) : new Set(); } catch { return new Set(); }
  });
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) { initialMount.current = false; return; }
    localStorage.setItem('aa2000_pinned', JSON.stringify([...pinned]));
  }, [pinned]);

  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [projectList, setProjectList] = useState<Project[]>(projects);

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

  // Compute stats from projectList
  const totalProjects = projectList.length;
  const inProgressCount = projectList.filter(p => p.status === 'In Progress').length;
  const pendingCount = projectList.filter(p => p.status === 'Pending').length;
  const completedCount = projectList.filter(p => p.status === 'Completed' || p.status?.includes('Finalized')).length;

  const handleDelete = (id: string) => { setProjectList(prev => prev.filter(p => p.id !== id)); setDeleteConfirm(null); setMenuOpen(null); };
  const handleSaveEdit = (updated: Project) => { setProjectList(prev => prev.map(p => p.id === updated.id ? updated : p)); setEditProject(null); };
  const handlePin = (id: string) => { setPinned(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); setMenuOpen(null); };

  const navigate = (v: View) => { if (v === 'create-survey') { onNavigateToCreate(); return; } setView(v); };
  const navigateNotif = (type: string) => {
    const m: Record<string, View> = { notifications: 'dashboard', ongoing: 'ongoing', upcoming: 'upcoming', missing: 'missing-notif', approval: 'approval-notif', finalize: 'finalize-notif' };
    setView(m[type] || 'dashboard');
  };

  // Pipeline bar widths (visual only, relative to total)
  const pipelineStages = [
    { label: 'Pending', count: pendingCount, color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    { label: 'In Progress', count: inProgressCount, color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    { label: 'Completed', count: completedCount, color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  ];

  return (
    <div className="min-h-screen flex" style={{ background: '#F4F6FA' }}>
      <div className="h-screen sticky top-0 z-20">
        <Sidebar user={user} currentView={view} onNavigate={navigate} onLogout={onLogout} onSettings={onSettings} />
      </div>

      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto pb-10">
        {/* Top Header Bar */}
        <div
          className="px-8 py-4 flex items-center justify-between shrink-0 bg-white"
          style={{ borderBottom: '1px solid #E5E7EB' }}
        >
          {/* App status */}
          <div className="flex items-center gap-2 bg-[#F4F6FA] border border-[#E5E7EB] rounded-full px-3 py-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[9px] font-bold text-emerald-800 tracking-wider">SYSTEM ONLINE</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Search */}
            <div className="relative w-64">
              <input
                type="text"
                placeholder="SEARCH PROJECTS OR CLIENTS..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full text-[10px] tracking-wider font-bold bg-[#F4F6FA] border border-[#E5E7EB] outline-none text-[#1E293B]"
              />
              <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#94A3B8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Notification & User */}
            <div className="flex items-center gap-3">
              <NotificationBell notifications={notifications} onViewAll={navigateNotif} />

              <button
                onClick={onSettings}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
                title="Settings"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </button>

              <div className="w-8 h-8 rounded-full bg-[#1E3A8A] text-white flex items-center justify-center font-bold text-xs">
                {(user.fullName || user.email || 'User').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </div>

        {/* Page title row */}
        <div className="px-8 pt-8 flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-[#0F172A] uppercase">
              {view === 'dashboard' ? 'Dashboard' : viewTitles[view] || 'Dashboard'}
            </h1>
            <p className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mt-1">
              AA2000 SECURITY & TECHNOLOGY SOLUTIONS INC. • ESTIMATION PLATFORM
            </p>
          </div>

          {/* New Project button (Admin only, on relevant views) */}
          {user.role === 'ADMIN' && !isNotification && view === 'dashboard' && (
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-full text-[10px] font-bold text-white tracking-widest hover:opacity-95 transition-all duration-150 shadow-sm"
              style={{ background: '#1E3A8A' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              NEW PROJECT
            </button>
          )}
        </div>

        {/* Stats Row — dashboard view only */}
        {view === 'dashboard' && (
          <div className="px-8 pt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Total Projects */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden h-36">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#94A3B8] tracking-widest">TOTAL PROJECTS</span>
              </div>
              <div>
                <p className="text-3xl font-black text-[#1E3A8A]">{totalProjects}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">All site surveys</p>
                <div className="absolute right-4 bottom-4 w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-[#1E3A8A] text-lg">
                  📋
                </div>
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden h-36">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#94A3B8] tracking-widest">IN PROGRESS</span>
                {inProgressCount > 0 && (
                  <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold">Active</span>
                )}
              </div>
              <div>
                <p className="text-3xl font-black text-[#2563EB]">{inProgressCount}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Ongoing surveys</p>
                <div className="absolute right-4 bottom-4 w-11 h-11 bg-blue-50 rounded-2xl flex items-center justify-center text-lg">
                  🔧
                </div>
              </div>
            </div>

            {/* Pending */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden h-36">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#94A3B8] tracking-widest">PENDING</span>
                {pendingCount > 0 && (
                  <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold">Queued</span>
                )}
              </div>
              <div>
                <p className="text-3xl font-black text-[#D97706]">{pendingCount}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Awaiting start</p>
                <div className="absolute right-4 bottom-4 w-11 h-11 bg-amber-50 rounded-2xl flex items-center justify-center text-lg">
                  🗓️
                </div>
              </div>
            </div>

            {/* Completed */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col justify-between relative overflow-hidden h-36">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#94A3B8] tracking-widest">COMPLETED</span>
                {completedCount > 0 && (
                  <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full text-[9px] font-extrabold">Done</span>
                )}
              </div>
              <div>
                <p className="text-3xl font-black text-[#059669]">{completedCount}</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1">Finalized surveys</p>
                <div className="absolute right-4 bottom-4 w-11 h-11 bg-emerald-50 rounded-2xl flex items-center justify-center text-lg">
                  ✅
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Info Cards — dashboard view only */}
        {view === 'dashboard' && (
          <div className="px-8 pt-6 grid grid-cols-1 lg:grid-cols-3 gap-5">

            {/* Survey Workflow Pipeline */}
            <div className="lg:col-span-2 bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-xs font-black tracking-wider text-[#0F172A] uppercase">Survey Workflow Pipeline</h3>
                  <p className="text-[9px] font-bold text-[#94A3B8] uppercase mt-0.5">Project status distribution</p>
                </div>
                <span className="text-[9px] font-bold text-[#1E3A8A] bg-blue-50 px-2.5 py-1 rounded-full tracking-wider">
                  {totalProjects} total
                </span>
              </div>

              {/* Pipeline stages */}
              <div className="space-y-4">
                {pipelineStages.map(stage => {
                  const pct = totalProjects > 0 ? Math.round((stage.count / totalProjects) * 100) : 0;
                  return (
                    <div key={stage.label}>
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-700 mb-1.5">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: stage.color }}
                          />
                          <span>{stage.label}</span>
                        </div>
                        <span className="text-slate-400">{stage.count} project{stage.count !== 1 ? 's' : ''} · {pct}%</span>
                      </div>
                      <div className="w-full bg-[#F4F6FA] h-3 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%`, background: stage.color }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Empty state */}
              {totalProjects === 0 && (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <span className="text-2xl">📊</span>
                  <p className="text-xs font-bold text-slate-400">No projects yet. Create one to start tracking.</p>
                </div>
              )}
            </div>

            {/* Survey Category Quick Guide */}
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 flex flex-col">
              <div className="mb-4">
                <h3 className="text-xs font-black tracking-wider text-[#0F172A] uppercase">Survey Categories</h3>
                <p className="text-[9px] font-bold text-[#94A3B8] uppercase mt-0.5">Available system types</p>
              </div>
              <div className="space-y-2.5 flex-1">
                {[
                  { label: 'CCTV Surveillance', icon: '📷', color: '#1E3A8A', bg: '#EFF6FF' },
                  { label: 'Fire Alarm System', icon: '🔔', color: '#B91C1C', bg: '#FEF2F2' },
                  { label: 'Fire Protection', icon: '🔥', color: '#D97706', bg: '#FFFBEB' },
                  { label: 'Access Control', icon: '🔑', color: '#047857', bg: '#ECFDF5' },
                  { label: 'Burglar Alarm', icon: '🛡️', color: '#6D28D9', bg: '#F5F3FF' },
                  { label: 'Other Systems', icon: '⚙️', color: '#334155', bg: '#F8FAFC' },
                ].map(cat => (
                  <div
                    key={cat.label}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: cat.bg }}
                  >
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-[11px] font-bold" style={{ color: cat.color }}>{cat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Project Table */}
        <div className="px-8 pt-6">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">

            {/* Controls row */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
                  {viewTitles[view] || 'Projects'}
                </span>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {ordered.length}
                </span>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                {/* Search (only shown on non-dashboard views where top bar search won't filter) */}
                {view !== 'dashboard' && (
                  <div className="relative flex-1 sm:max-w-xs">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search projects..."
                      className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-[#1E3A8A] focus:bg-white"
                    />
                  </div>
                )}

                {/* Sort */}
                <select
                  value={sort}
                  onChange={e => setSort(e.target.value as SortMode)}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-slate-50 border border-slate-200 text-slate-600 outline-none cursor-pointer focus:border-[#1E3A8A]"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="name-asc">Name A–Z</option>
                  <option value="name-desc">Name Z–A</option>
                </select>

                {/* New Project (Admin only, non-dashboard views) */}
                {user.role === 'ADMIN' && !isNotification && view !== 'dashboard' && (
                  <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all"
                    style={{ background: '#1E3A8A' }}
                  >
                    + New Project
                  </button>
                )}
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              {ordered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl">
                    📋
                  </div>
                  <div className="text-center">
                    <p className="text-xs font-bold text-slate-600">No projects found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {user.role === 'ADMIN' ? 'Create a new project to get started' : 'No assignments yet'}
                    </p>
                  </div>
                </div>
              ) : (
                <table className="w-full text-left border-collapse mt-2">
                  <thead>
                    <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
                      <th className="py-4 pl-4">Project / Client</th>
                      <th className="py-4 text-center">Status</th>
                      <th className="py-4 text-center">Date</th>
                      <th className="py-4 pr-4 text-right"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {ordered.map(project => {
                      const isPinned = pinned.has(project.id);
                      const isOpen = menuOpen === project.id;
                      const statusBar = Object.entries(statusConfig).find(([key]) => project.status?.includes(key))?.[1]?.bar || '#64748B';

                      return (
                        <tr
                          key={project.id}
                          onClick={() => onSelectProject(project)}
                          className="hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors"
                        >
                          <td className="py-4 pl-4 flex items-center gap-3">
                            <div
                              className="w-1 h-8 rounded-full shrink-0"
                              style={{ background: statusBar }}
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-slate-800">{project.name}</span>
                                {isPinned && (
                                  <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 uppercase tracking-wide">
                                    Pinned
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 mt-0.5">
                                {project.clientName} · {project.location}
                              </p>
                            </div>
                          </td>
                          <td className="py-4 text-center">
                            <StatusBadge status={project.status} />
                          </td>
                          <td className="py-4 text-center text-xs font-semibold text-slate-500">
                            {project.startDate || '—'}
                          </td>
                          <td className="py-4 pr-4 text-right relative" onClick={e => e.stopPropagation()}>
                            <button
                              onClick={() => setMenuOpen(isOpen ? null : project.id)}
                              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-all"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h.01M12 12h.01M19 12h.01" />
                              </svg>
                            </button>

                            {isOpen && (
                              <>
                                <div className="fixed inset-0 z-20" onClick={() => setMenuOpen(null)} />
                                <div className="absolute right-4 top-10 z-30 w-40 rounded-xl bg-white border border-slate-200 py-1 shadow-lg text-left">
                                  <button
                                    onClick={() => { setEditProject(project); setMenuOpen(null); }}
                                    className="w-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1E3A8A] flex items-center gap-1.5"
                                  >
                                    Edit Project
                                  </button>
                                  <button
                                    onClick={() => handlePin(project.id)}
                                    className="w-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1E3A8A] flex items-center gap-1.5"
                                  >
                                    {isPinned ? 'Unpin' : 'Pin Project'}
                                  </button>
                                  <button
                                    onClick={() => onSelectProject(project)}
                                    className="w-full px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-[#1E3A8A] flex items-center gap-1.5"
                                  >
                                    View Details
                                  </button>
                                  <div className="border-t border-slate-100 my-1"></div>
                                  <button
                                    onClick={() => { setDeleteConfirm(project.id); setMenuOpen(null); }}
                                    className="w-full px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-1.5"
                                  >
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

        {/* Modals */}
        {showCreate && (
          <CreateProjectModal
            onClose={() => setShowCreate(false)}
            onCreate={p => { onCreateProject(p); setProjectList(prev => [...prev, p]); }}
          />
        )}

        {editProject && (
          <EditProjectModal project={editProject} onClose={() => setEditProject(null)} onSave={handleSaveEdit} />
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <div className="w-full max-w-sm p-6 rounded-3xl bg-white shadow-xl border border-slate-100 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50 text-red-600">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </div>
              <h3 className="font-black text-slate-800 text-lg mb-1">Delete Project?</h3>
              <p className="text-xs text-slate-400 mb-5">This action cannot be undone.</p>
              <div className="flex gap-2">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirm)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white bg-red-600 shadow-md shadow-red-200"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function EditProjectModal({ project, onClose, onSave }: { project: Project; onClose: () => void; onSave: (p: Project) => void }) {
  const [name, setName] = useState(project.name);
  const [clientName, setClientName] = useState(project.clientName);
  const [location, setLocation] = useState(project.location);
  const [status, setStatus] = useState(project.status);
  const [buildingType, setBuildingType] = useState(project.buildingType || '');
  const [floors, setFloors] = useState(project.floors || 1);

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    color: '#1E293B',
    fontSize: '13px',
    outline: 'none',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '10px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#94A3B8',
    marginBottom: '6px',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-800">Edit Project</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form
          onSubmit={e => { e.preventDefault(); onSave({ ...project, name, clientName, location, status, buildingType, floors }); onClose(); }}
          className="p-5 space-y-4"
        >
          <div>
            <label style={labelStyle}>Project Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Company Name</label>
            <input value={clientName} onChange={e => setClientName(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Location</label>
            <input value={location} onChange={e => setLocation(e.target.value)} style={inputStyle} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Status</label>
              <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option>Pending</option><option>In Progress</option><option>Completed</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Building Type</label>
              <select value={buildingType} onChange={e => setBuildingType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select...</option><option>Office</option><option>Retail</option>
                <option>Warehouse</option><option>School</option><option>Hospital</option><option>Residential</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Floors</label>
            <input type="number" min={1} value={floors} onChange={e => setFloors(Number(e.target.value))} style={inputStyle} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-slate-50 text-slate-600 border border-slate-200">
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all shadow-sm"
              style={{ background: '#1E3A8A' }}
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
