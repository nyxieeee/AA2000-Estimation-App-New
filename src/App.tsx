import { useState, useCallback, useEffect, Component } from 'react';
import type { ReactNode } from 'react';
import Login from './components/auth/Login';
import Dashboard from './components/dashboard/Dashboard';
import ProjectDetail from './components/projects/ProjectDetail';
import SurveyWizard from './components/surveys/SurveyWizard';
import EstimationSummary from './components/estimation/EstimationSummary';
import Settings from './components/settings/Settings';
import CreateSurveyForm from './components/estimation/CreateSurveyForm';
import SurveySummary from './components/reports/SurveySummary';
import type { SurveyFormData } from './components/estimation/CreateSurveyForm';
import type { Notification } from './components/notifications/NotificationBell';
import { DEFAULT_TECHNICIANS } from './constants/roles';


export type Screen = 'login' | 'dashboard' | 'create-survey' | 'project-detail' | 'survey' | 'estimation' | 'settings' | 'notifications' | 'survey-summary';
export type SurveyType = 'CCTV' | 'FIRE_ALARM' | 'FIRE_PROTECTION' | 'ACCESS_CONTROL' | 'BURGLAR_ALARM' | 'OTHER';

export interface User {
  id: string;
  fullName: string;
  email: string;
  role?: 'TECHNICIAN' | 'ADMIN' | 'SALES';
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  location: string;
  locationName?: string;
  latitude?: number;
  longitude?: number;
  buildingType?: string;
  floors?: number;
  systemTypes?: string[];   // e.g. ['CCTV', 'FDAS', 'ACCESS_CONTROL']
  surveyScope?: string;
  status: string;
  startDate?: string;
  assignedTechnicians: { id: string; fullName: string; email: string }[];
  technicianName?: string;
  createdAt: string;
  isNewBuilding?: boolean;
}

const APP_VERSION = 'aa2000_v5';
const STORAGE_KEYS = {
  projects: 'aa2000_projects',
  notifications: 'aa2000_notifications',
  user: 'aa2000_user',
};

// Migrate / clear stale data from older app versions to prevent white screen crashes
(function migrateStorage() {
  try {
    const storedVersion = localStorage.getItem('aa2000_app_version');
    if (storedVersion !== APP_VERSION) {
      // Clear all old keys but preserve the version marker
      Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));
      localStorage.removeItem('aa2000_seeded');
      localStorage.removeItem('aa2000_pinned');
      localStorage.removeItem('aa2000_surveys');
      localStorage.setItem('aa2000_app_version', APP_VERSION);
    }
  } catch {}
})();

const defaultNotifications: Notification[] = [];

function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      // Validate that arrays are actually arrays and objects are objects
      if (parsed !== null && parsed !== undefined) {
        if (Array.isArray(fallback) && !Array.isArray(parsed)) return fallback;
        return parsed;
      }
    }
  } catch {}
  return fallback;
}

function saveToStorage<T>(key: string, data: T) {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {}
}

// Error Boundary to catch any component crashes
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: string }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: '' };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F8FAFC', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: '24px', padding: '32px', maxWidth: '400px', textAlign: 'center', boxShadow: '0 4px 24px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⚠️</div>
            <h2 style={{ color: '#1E3A8A', fontWeight: 900, fontSize: '16px', marginBottom: '8px' }}>Something went wrong</h2>
            <p style={{ color: '#64748B', fontSize: '12px', marginBottom: '20px' }}>{this.state.error}</p>
            <button
              onClick={() => { localStorage.clear(); window.location.reload(); }}
              style={{ background: '#1E3A8A', color: '#fff', border: 'none', borderRadius: '12px', padding: '10px 24px', fontWeight: 700, fontSize: '12px', cursor: 'pointer' }}
            >
              Clear & Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('login');
  const [user, setUser] = useState<User | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentSurveyType, setCurrentSurveyType] = useState<SurveyType | null>(null);
  const [projects, setProjects] = useState<Project[]>(() => loadFromStorage<Project[]>(STORAGE_KEYS.projects, []));
  const [notifications, setNotifications] = useState<Notification[]>(() => loadFromStorage<Notification[]>(STORAGE_KEYS.notifications, defaultNotifications));
  const [prefilledCompanyName, setPrefilledCompanyName] = useState<string>('');
  const [currentCompanyProject, setCurrentCompanyProject] = useState<Project | null>(null);

  useEffect(() => {
    const saved = loadFromStorage<User | null>(STORAGE_KEYS.user, null);
    if (saved) {
      setUser(saved);
      setScreen('dashboard');
    }
  }, []);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.projects, projects);
  }, [projects]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.notifications, notifications);
  }, [notifications]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.user, user);
  }, [user]);

  // Sync notifications from projects automatically
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    const actualProjects = projects.filter(p => p.buildingType !== 'Other');

    setNotifications(prev => {
      const prevMap = new Map(prev.map(n => [n.id, n.read]));
      const newNotifs: Notification[] = [];

      actualProjects.forEach(project => {
        let type: 'ongoing' | 'upcoming' | 'missing' | 'approval' | 'finalize' | null = null;
        let title = '';

        const isCompleted = project.status === 'Completed' || project.status?.includes('Finalized');

        if (!isCompleted) {
          if (!project.startDate) {
            type = 'missing';
            title = `Missing Specs: ${project.name}`;
          } else if (project.startDate > today) {
            type = 'upcoming';
            title = `Upcoming Survey: ${project.name}`;
          } else if (project.startDate === today) {
            type = 'ongoing';
            title = `Ongoing Survey: ${project.name}`;
          } else {
            type = 'missing';
            title = `Missing Specs: ${project.name}`;
          }
        } else if (project.status === 'Finalized') {
          type = 'approval';
          title = `Awaiting Approval: ${project.name}`;
        } else if (project.status === 'Finalized - Approved' || project.status === 'Finalized - Rejected') {
          type = 'finalize';
          title = `Finalized Review: ${project.name}`;
        } else if (project.status === 'Completed') {
          type = 'finalize';
          title = `Survey Completed: ${project.name}`;
        }

        if (type) {
          const id = `notif-${project.id}-${type}`;
          newNotifs.push({
            id,
            title,
            companyName: project.clientName,
            date: project.startDate || project.createdAt.split('T')[0],
            read: prevMap.get(id) || false,
            type,
          });
        }
      });

      return newNotifs;
    });
  }, [projects]);

  const handleMarkNotificationsAsRead = useCallback((type: string) => {
    setNotifications(prev =>
      prev.map(n => (n.type === type || type === 'all') ? { ...n, read: true } : n)
    );
  }, []);



  const handleLogin = useCallback((u: User) => {
    setUser(u);
    setScreen('dashboard');
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
    setCurrentProject(null);
    setScreen('login');
    localStorage.removeItem(STORAGE_KEYS.user);
  }, []);

  const handleCreateProject = useCallback((project: Project, keepOnHome?: boolean) => {
    setProjects(prev => [...prev, project]);
    if (!keepOnHome) {
      setCurrentProject(project);
      setScreen('project-detail');
    }
  }, []);

  const handleSelectProject = useCallback((project: Project) => {
    setCurrentProject(project);
    setScreen('project-detail');
  }, []);

  const handleStartSurvey = useCallback((type: SurveyType) => {
    setCurrentSurveyType(type);
    setScreen('survey');
  }, []);

  const handleSurveyComplete = useCallback(() => {
    if (currentProject) {
      setProjects(prev =>
        prev.map(p =>
          p.id === currentProject.id ? { ...p, status: p.status === 'Pending' ? 'In Progress' : p.status } : p
        )
      );
      setCurrentProject(prev => prev ? { ...prev, status: prev.status === 'Pending' ? 'In Progress' : prev.status } : null);
    }
    setScreen('estimation');
  }, [currentProject]);

  const handleUpdateProjectStatus = useCallback((projectId: string, status: string) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === projectId ? { ...p, status } : p
      )
    );
    setCurrentProject(prev => prev && prev.id === projectId ? { ...prev, status } : prev);
  }, []);

  const handleUpdateProject = useCallback((updatedProject: Project) => {
    setProjects(prev =>
      prev.map(p =>
        p.id === updatedProject.id ? updatedProject : p
      )
    );
    setCurrentProject(prev => prev && prev.id === updatedProject.id ? updatedProject : prev);
  }, []);

  const handleViewEstimation = useCallback(() => {
    setScreen('estimation');
  }, []);

  const handleDeleteProject = useCallback((projectId: string) => {
    setProjects(prev => prev.filter(p => p.id !== projectId));
    setCurrentProject(null);
    try {
      const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]');
      const remaining = surveys.filter((s: any) => s.projectId !== projectId);
      localStorage.setItem('aa2000_surveys', JSON.stringify(remaining));
    } catch (e) {
      console.error('Failed to clean up surveys on deletion', e);
    }
  }, []);

  const handleBackToDashboard = useCallback(() => {
    setCurrentProject(null);
    setScreen('dashboard');
  }, []);

  const handleSettings = useCallback(() => {
    setScreen('settings');
  }, []);

  const handleBackFromSettings = useCallback(() => {
    setScreen('dashboard');
  }, []);

  const handleNavigateToCreate = useCallback((companyName?: string) => {
    setPrefilledCompanyName(companyName || '');
    setScreen('create-survey');
  }, []);

  const handleSaveSurvey = useCallback((data: SurveyFormData) => {
    const now = new Date().toISOString();
    const newProject: Project = {
      id: `project-${Date.now()}`,
      name: data.projectName,
      clientName: data.companyName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientContactNumber,
      location: data.locationName,
      locationName: data.locationName,
      latitude: data.latitude,
      longitude: data.longitude,
      buildingType: data.buildingType,
      floors: data.floors,
      systemTypes: data.systemTypes,
      surveyScope: data.surveyScope,
      status: 'Pending',
      startDate: data.startDate,
      assignedTechnicians: DEFAULT_TECHNICIANS,
      createdAt: now,
    };

    const compName = prefilledCompanyName;
    setPrefilledCompanyName('');

    setProjects(prev => {
      const nextProjects = [...prev, newProject];
      if (compName) {
        const compProj = nextProjects.find(p => p.name === compName || p.clientName === compName);
        if (compProj) {
          setCurrentCompanyProject(compProj);
        }
        setScreen('dashboard');
      } else {
        setCurrentProject(newProject);
        setScreen('project-detail');
      }
      return nextProjects;
    });
  }, [prefilledCompanyName]);

  const handleExitCreateSurvey = useCallback(() => {
    setPrefilledCompanyName('');
    setScreen('dashboard');
  }, []);

  // Always fall back to login if user is not authenticated
  if (!user || screen === 'login') {
    return <Login onLogin={handleLogin} />;
  }

  if (screen === 'create-survey') {
    const companyProject = prefilledCompanyName
      ? projects.find(p => p.buildingType === 'Other' && p.name === prefilledCompanyName)
      : undefined;

    return (
      <ErrorBoundary>
        <div className="min-h-screen flex" style={{ background: '#F8FAFC' }}>
          <Dashboard
            user={user}
            onLogout={handleLogout}
            projects={projects}
            notifications={notifications}
            onSelectProject={handleSelectProject}
            onCreateProject={handleCreateProject}
            onSettings={handleSettings}
            onNavigateToCreate={handleNavigateToCreate}
            selectedCompanyProject={currentCompanyProject}
            setSelectedCompanyProject={setCurrentCompanyProject}
            onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
            onDeleteProject={handleDeleteProject}
            onUpdateProject={handleUpdateProject}
          />
          <div className="fixed inset-0 z-50 overflow-y-auto" style={{ background: '#F4F6FA' }}>
            <CreateSurveyForm
              onSave={handleSaveSurvey}
              onExit={handleExitCreateSurvey}
              initialCompanyName={prefilledCompanyName}
              initialLocationName={companyProject?.location}
              initialLatitude={companyProject?.latitude}
              initialLongitude={companyProject?.longitude}
              initialClientName={companyProject?.clientName}
              initialClientEmail={companyProject?.clientEmail}
              initialClientContactNumber={companyProject?.clientPhone}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  if (screen === 'settings') {
    return (
      <ErrorBoundary>
        <Settings user={user} onBack={handleBackFromSettings} onLogout={handleLogout} notifications={notifications} />
      </ErrorBoundary>
    );
  }

  if (screen === 'project-detail' && currentProject) {
    return (
      <ErrorBoundary>
        <ProjectDetail
          user={user}
          project={currentProject}
          onBack={handleBackToDashboard}
          onStartSurvey={handleStartSurvey}
          onViewEstimation={handleViewEstimation}
          onViewSurveySummary={() => setScreen('survey-summary')}
          onUpdateStatus={handleUpdateProjectStatus}
        />
      </ErrorBoundary>
    );
  }

  if (screen === 'survey' && currentProject && currentSurveyType) {
    return (
      <ErrorBoundary>
        <SurveyWizard
          projectId={currentProject.id}
          surveyType={currentSurveyType}
          onComplete={handleSurveyComplete}
          onBack={() => setScreen('project-detail')}
        />
      </ErrorBoundary>
    );
  }

  if (screen === 'estimation' && currentProject) {
    return (
      <ErrorBoundary>
        <EstimationSummary
          project={currentProject}
          user={user}
          onBack={() => setScreen('project-detail')}
          onUpdateStatus={handleUpdateProjectStatus}
        />
      </ErrorBoundary>
    );
  }

  if (screen === 'survey-summary' && currentProject) {
    return (
      <ErrorBoundary>
        <SurveySummary
          project={currentProject}
          onBack={() => setScreen('project-detail')}
          onViewEstimation={handleViewEstimation}
        />
      </ErrorBoundary>
    );
  }

  // Default: dashboard
  return (
    <ErrorBoundary>
      <Dashboard
        user={user}
        onLogout={handleLogout}
        projects={projects}
        notifications={notifications}
        onSelectProject={handleSelectProject}
        onCreateProject={handleCreateProject}
        onSettings={handleSettings}
        onNavigateToCreate={handleNavigateToCreate}
        selectedCompanyProject={currentCompanyProject}
        setSelectedCompanyProject={setCurrentCompanyProject}
        onMarkNotificationsAsRead={handleMarkNotificationsAsRead}
        onDeleteProject={handleDeleteProject}
        onUpdateProject={handleUpdateProject}
      />
    </ErrorBoundary>
  );
}
