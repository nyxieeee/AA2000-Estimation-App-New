import { useState, useMemo, useEffect, useRef } from 'react';
import type { User, Project } from '../../App';

interface HomeProps {
  user: User;
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onSelectCompany: (companyName: string) => void;
  onNewCompanyClick: () => void;
}

type SortMode = 'newest' | 'oldest' | 'name-asc' | 'name-desc';

const statusConfig: Record<string, { color: string; bg: string; bar: string }> = {
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', bar: '#2563EB' },
  'Pending': { color: '#1E3A8A', bg: 'rgba(30,58,138,0.08)', bar: '#1E3A8A' },
  'Completed': { color: '#059669', bg: 'rgba(5,150,105,0.08)', bar: '#059669' },
  'Finalized': { color: '#059669', bg: 'rgba(5,150,105,0.08)', bar: '#059669' },
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

export default function Home({ user, projects, onSelectProject, onSelectCompany, onNewCompanyClick }: HomeProps) {
  const isAdmin = user.role === 'ADMIN';
  const isSales = user.role === 'SALES';
  const isTechnician = user.role === 'TECHNICIAN';

  // Table & Action States
  const [projectList, setProjectList] = useState<Project[]>(projects);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortMode>('newest');
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
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
  }, [projects]);

  // Sync pinned set to localStorage
  const initialMount = useRef(true);
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false;
      return;
    }
    localStorage.setItem('aa2000_pinned', JSON.stringify([...pinned]));
  }, [pinned]);

  // Get user role display name
  const roleDisplayName = useMemo(() => {
    if (isAdmin) return 'System Administrator';
    if (isSales) return 'Sales Representative';
    if (isTechnician) return 'Field Technician';
    return 'User';
  }, [user.role]);

  // Greetings depending on the time of day
  const greeting = useMemo(() => {
    const hrs = new Date().getHours();
    if (hrs < 12) return 'Good Morning';
    if (hrs < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, []);

  // Filter projects by relevance to the user role
  const userProjects = useMemo(() => {
    const companyFoldersOnly = projectList.filter(p => p.buildingType === 'Other');

    if (isAdmin || isSales) {
      return companyFoldersOnly;
    }
    // For technician, show company folders they have projects in, OR company folders they are directly assigned to
    return companyFoldersOnly.filter(
      compFolder => {
        const isAssignedToFolder = compFolder.assignedTechnicians?.some(t => t.id === user.id) || compFolder.technicianName === user.fullName;
        
        const hasAssignedProjects = projectList.some(
          p => 
            p.buildingType !== 'Other' &&
            p.clientName === compFolder.name &&
            (p.assignedTechnicians?.some(t => t.id === user.id) || p.technicianName === user.fullName)
        );

        return isAssignedToFolder || hasAssignedProjects;
      }
    );
  }, [projectList, user, isAdmin, isSales]);

  // Search & Filter
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    const sorted = [...userProjects];

    // Sort
    if (sort === 'newest') {
      sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (sort === 'oldest') {
      sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    } else if (sort === 'name-asc') {
      sorted.sort((a, b) => a.name.localeCompare(b.name));
    } else if (sort === 'name-desc') {
      sorted.sort((a, b) => b.name.localeCompare(a.name));
    }

    return sorted.filter(
      p =>
        p.name.toLowerCase().includes(q) ||
        p.clientName.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q)
    );
  }, [userProjects, search, sort]);

  const pinnedItems = filtered.filter(p => pinned.has(p.id));
  const unpinnedItems = filtered.filter(p => !pinned.has(p.id));
  const ordered = [...pinnedItems, ...unpinnedItems];

  const handleDelete = (id: string) => {
    setProjectList(prev => prev.filter(p => p.id !== id));
    setDeleteConfirm(null);
    setMenuOpen(null);
  };

  const handleSaveEdit = (updated: Project) => {
    setProjectList(prev => prev.map(p => (p.id === updated.id ? updated : p)));
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

  return (
    <div className="px-8 pt-8 space-y-8 max-w-7xl mx-auto w-full">
      {/* Welcome Hero Banner */}
      <div 
        className="relative overflow-hidden rounded-3xl p-8 text-white shadow-lg border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6"
        style={{
          background: 'linear-gradient(135deg, #1E3A8A 0%, #1D4ED8 50%, #2563EB 100%)',
        }}
      >
        <div className="relative z-10 space-y-2 max-w-2xl">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold tracking-widest uppercase bg-white/20 text-white">
              {roleDisplayName}
            </span>
            <span className="text-[10px] text-white/70 font-semibold">• Online & Active</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">
            {greeting}, {user.fullName || user.email}!
          </h1>
          <p className="text-xs text-blue-100 leading-relaxed font-medium">
            {isAdmin && 'Welcome to the system control center. Use this portal to create new estimation projects, assign technical teams, review surveys, and approve final equipment pricing estimates.'}
            {isSales && 'Welcome to your sales workspace. Initiate site survey requests, review completed specifications, and generate accurate pricing sheets for client proposals.'}
            {isTechnician && 'Welcome to your field dispatch portal. Access your assigned sites, fill out security survey wizard modules, and submit hardware requirements directly from the field.'}
          </p>
        </div>
        
        {/* Dynamic visual indicator */}
        <div className="relative z-10 shrink-0 flex items-center justify-center w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-inner">
          <span className="text-4xl">
            {isAdmin && '💻'}
            {isSales && '📈'}
            {isTechnician && '🛠️'}
          </span>
        </div>

        {/* Decorative background glow */}
        <div className="absolute right-0 bottom-0 w-80 h-80 rounded-full bg-blue-400 opacity-20 blur-3xl pointer-events-none translate-x-20 translate-y-20" />
      </div>

      {/* Project/Survey List Table Component */}
      <div className="bg-white rounded-3xl p-6 shadow-sm">
        {/* Controls row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5">
          <div className="flex items-center gap-3">
            <span className="text-sm font-black text-slate-800 uppercase tracking-tight">
              ALL COMPANIES
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {ordered.length}
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 sm:max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search Companies..."
                className="w-full pl-9 pr-4 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:border-[#1E3A8A] focus:bg-white"
              />
            </div>

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

            {/* New Project/Survey Button */}
            {isAdmin && (
              <button
                onClick={onNewCompanyClick}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white hover:opacity-90 transition-all shadow-sm shrink-0"
                style={{ background: '#1E3A8A' }}
              >
                + New Companies
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        {/* Empty state */}
        <div>
          {ordered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-xl">
                📋
              </div>
              <div className="text-center">
                <p className="text-xs font-bold text-slate-600">No companies found</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {isAdmin ? 'Create a new company to get started' : 'No assignments yet'}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 mt-4">
              {ordered.map(project => {
                const isPinned = pinned.has(project.id);
                const isOpen = menuOpen === project.id;
                const statusBar = Object.entries(statusConfig).find(([key]) => project.status?.includes(key))?.[1]?.bar || '#64748B';

                return (
                  <div
                    key={project.id}
                    onClick={() => onSelectCompany(project.name)}
                    className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 hover:border-slate-300 hover:bg-slate-50/50 transition-all duration-200 cursor-pointer"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[20px] font-bold text-slate-800 truncate">{project.name}</span>
                          {isPinned && (
                            <span className="text-[8px] font-extrabold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 uppercase tracking-wide shrink-0">
                              Pinned
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                          {project.location}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          {project.startDate || '—'}
                        </p>
                      </div>
                    </div>

                    <div className="py-2 pr-2 text-right relative" onClick={e => e.stopPropagation()}>
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
                              onClick={() => onSelectCompany(project.name)}
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
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Edit Project/Survey Modal */}
      {editProject && (
        <EditCompanyModal project={editProject} onClose={() => setEditProject(null)} onSave={handleSaveEdit} />
      )}

      {/* Delete Project/Survey Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-sm p-6 rounded-3xl bg-white shadow-xl border border-slate-100 text-center">
            <div className="w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 bg-red-50 text-red-600">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h3 className="font-black text-slate-800 text-lg mb-1">Delete Project/Survey?</h3>
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
    </div>
  );
}

function EditCompanyModal({ project, onClose, onSave }: { project: Project; onClose: () => void; onSave: (p: Project) => void }) {
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
          <h2 className="text-base font-black text-slate-800">Edit Project/Survey</h2>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-600 transition-colors">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <form
          onSubmit={e => {
            e.preventDefault();
            onSave({ ...project, name, clientName, location, status, buildingType, floors });
            onClose();
          }}
          className="p-5 space-y-4"
        >
          <div>
            <label style={labelStyle}>Project Name</label>
            <input value={name} onChange={e => setName(e.target.value)} style={inputStyle} required />
          </div>
          <div>
            <label style={labelStyle}>Company / Client Name</label>
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
                <option>Pending</option>
                <option>In Progress</option>
                <option>Completed</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Building Type</label>
              <select value={buildingType} onChange={e => setBuildingType(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                <option value="">Select...</option>
                <option>Office</option>
                <option>Retail</option>
                <option>Warehouse</option>
                <option>School</option>
                <option>Hospital</option>
                <option>Residential</option>
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
