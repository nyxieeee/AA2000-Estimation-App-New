import type { Project, User } from '../../App';
import { getRoleTheme } from '../../utils/RoleTheme';

interface Props {
  project: Project;
  user: User;
  onBack: () => void;
  onViewEstimation?: () => void;
}

const FIELD_LABELS: Record<string, string> = {
  buildingType: 'Building Type',
  floors: 'Number of Floors',
  buildingLength: 'Building Length',
  buildingWidth: 'Building Width',
  totalFloorArea: 'Total Floor Area',
  floorHeight: 'Floor Height',
  roomsCount: 'Rooms',
  isNew: 'Building Status',
  cameraCount: 'Camera Count',
  resolution: 'Resolution',
  cameraTypes: 'Camera Types',
  environment: 'Environment',
  preferredBrand: 'Preferred Brand',
  cableType: 'Cable Type',
  preferredCableBrand: 'Preferred Cable Brand',
  cablePath: 'Cable Path',
  wallType: 'Wall Type',
  coreDrilling: 'Core Drilling',
  cableLength: 'Cable Length',
  systemType: 'System Type',
  smokeDetectors: 'Smoke Detectors',
  heatDetectors: 'Heat Detectors',
  mcpCount: 'Manual Call Points',
  sounders: 'Sounders',
  doorCount: 'Door Count',
  doorType: 'Door Type',
  readerType: 'Reader Type',
  lockType: 'Lock Type',
  controllerLocation: 'Controller Location',
  poeAvailable: 'PoE Available',
  upsRequired: 'UPS Required',
  networkRequired: 'Network Required',
  pirSensors: 'PIR Sensors',
  doorContacts: 'Door Contacts',
  glassBreak: 'Glass Break Detectors',
  outdoorSensors: 'Outdoor Sensors',
  panelLocation: 'Panel Location',
  rackAvailable: 'Rack Available',
  powerAvailable: 'Power Available',
  suppressionType: 'Suppression Type',
  zones: 'Zones',
  cylinders: 'Cylinders',
  otherSystemType: 'System Type',
  description: 'Description',
  quantity: 'Quantity',
  powerRequired: 'Power Required',
};

const HIGHLIGHTED = new Set(['buildingType', 'systemType', 'preferredBrand', 'floors']);

const SURVEY_SECTIONS: Record<string, { title: string; keys: string[] }[]> = {
  CCTV: [
    { title: 'Building Information', keys: ['buildingType', 'floors', 'roomsCount', 'floorHeight', 'buildingLength', 'buildingWidth', 'totalFloorArea', 'isNew'] },
    { title: 'Camera Details', keys: ['cameraCount', 'resolution', 'cameraTypes', 'environment', 'preferredBrand'] },
    { title: 'Infrastructure', keys: ['cableType', 'preferredCableBrand', 'cablePath', 'wallType', 'coreDrilling', 'cableLength'] },
  ],
  FIRE_ALARM: [
    { title: 'Building Information', keys: ['buildingType', 'floors', 'roomsCount', 'floorHeight', 'buildingLength', 'buildingWidth', 'totalFloorArea', 'isNew'] },
    { title: 'Detection System', keys: ['systemType', 'preferredBrand', 'smokeDetectors', 'heatDetectors', 'mcpCount', 'sounders'] },
    { title: 'Control Panel', keys: ['panelLocation', 'rackAvailable', 'powerAvailable', 'networkRequired'] },
  ],
  ACCESS_CONTROL: [
    { title: 'Building Information', keys: ['buildingType', 'floors', 'roomsCount', 'floorHeight', 'buildingLength', 'buildingWidth', 'totalFloorArea', 'isNew'] },
    { title: 'Door Details', keys: ['doorCount', 'doorType', 'readerType', 'lockType'] },
    { title: 'Controller', keys: ['controllerLocation', 'poeAvailable', 'upsRequired', 'networkRequired'] },
  ],
  BURGLAR_ALARM: [
    { title: 'Building Information', keys: ['buildingType', 'floors', 'roomsCount', 'floorHeight', 'buildingLength', 'buildingWidth', 'totalFloorArea', 'isNew'] },
    { title: 'Sensor Details', keys: ['pirSensors', 'doorContacts', 'glassBreak', 'outdoorSensors'] },
    { title: 'Control Panel', keys: ['panelLocation', 'rackAvailable', 'powerAvailable', 'networkRequired'] },
  ],
  FIRE_PROTECTION: [
    { title: 'Building Information', keys: ['buildingType', 'floors', 'roomsCount', 'floorHeight', 'buildingLength', 'buildingWidth', 'totalFloorArea', 'isNew'] },
    { title: 'Suppression System', keys: ['suppressionType', 'zones', 'cylinders'] },
  ],
  OTHER: [
    { title: 'Building Information', keys: ['buildingType', 'floors', 'roomsCount', 'floorHeight', 'buildingLength', 'buildingWidth', 'totalFloorArea', 'isNew'] },
    { title: 'System Specifications', keys: ['otherSystemType', 'description', 'quantity', 'powerRequired'] },
  ],
};

function formatValue(value: any): string {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (Array.isArray(value)) return value.join(', ');
  return String(value);
}

function getFieldLabel(key: string): string {
  return FIELD_LABELS[key] || key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

export default function SurveySummary({ project, user, onBack, onViewEstimation }: Props) {
  const theme = getRoleTheme(user.role);
  const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]')
    .filter((s: any) => s.projectId === project.id);

  function buildSections(survey: any) {
    const sections = SURVEY_SECTIONS[survey.type] || [];
    const used = new Set<string>();
    const result: { title: string; entries: { key: string; value: any }[] }[] = [];

    const entries = Object.entries(survey.data).filter(([_, v]) => v !== '' && v !== 0 && v !== false && v !== null && v !== undefined) as [string, any][];

    for (const section of sections) {
      const secEntries = entries.filter(([k]) => section.keys.includes(k));
      if (secEntries.length > 0) {
        result.push({ title: section.title, entries: secEntries.map(([k, v]) => ({ key: k, value: v })) });
        secEntries.forEach(([k]) => used.add(k));
      }
    }

    const remaining = entries.filter(([k]) => !used.has(k));
    if (remaining.length > 0) {
      result.push({ title: 'Other Details', entries: remaining.map(([k, v]) => ({ key: k, value: v })) });
    }

    return result;
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ background: `linear-gradient(135deg, ${theme.primaryLight}15, #ffffff, ${theme.primaryLight}15)` }}>
      <header className="sticky top-0 z-40 bg-gradient-to-r from-white/80 to-white/80 backdrop-blur-sm border-b border-slate-200 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-sm text-slate-500 transition"
            style={{ color: '#64748B' }}
            onMouseEnter={e => (e.currentTarget.style.color = theme.primary)}
            onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="font-bold text-sm" style={{ color: theme.primaryDark }}>Survey Summary</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 p-6">
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#0F172A' }}>{project.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{project.clientName} &middot; {project.location}</p>
        </div>

        {surveys.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 p-12 text-center">
            <p className="text-slate-400 font-semibold">No surveys completed yet for this project.</p>
          </div>
        ) : (
          surveys.map((survey: any) => {
            const sections = buildSections(survey);
            return (
              <div key={survey.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md shadow-slate-200/30 border border-slate-200/60 overflow-hidden">
                <div className="px-6 py-4 flex items-center gap-3 border-b border-slate-100">
                  <span className="px-3 py-1 rounded-full text-xs font-bold uppercase" style={{ background: `${theme.primary}15`, color: theme.primary }}>
                    {survey.type}
                  </span>
                  <span className="text-xs text-slate-400">{survey.status}</span>
                  <span className="text-xs text-slate-400">{new Date(survey.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="divide-y divide-slate-100">
                  {sections.map((section, sIdx) => (
                    <div key={sIdx} className="px-6 py-5">
                      <h3 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                        {section.title}
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                        {section.entries.map(({ key, value }) => {
                          const highlighted = HIGHLIGHTED.has(key);
                          return (
                            <div key={key} className={highlighted ? 'sm:col-span-2' : ''}>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                                {getFieldLabel(key)}
                              </p>
                              {highlighted ? (
                                <p className="text-base font-bold" style={{ color: theme.primaryDark }}>
                                  {formatValue(value)}
                                </p>
                              ) : (
                                <p className="text-sm font-semibold text-slate-800">
                                  {formatValue(value)}
                                </p>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {onViewEstimation && (
                  <div className="px-6 py-4 border-t border-slate-100 flex justify-end">
                    <button
                      onClick={onViewEstimation}
                      className="px-6 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-sm active:scale-95 hover:opacity-90"
                      style={{ background: theme.buttonGradient }}
                    >
                      View Cost Estimation
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </main>
    </div>
  );
}
