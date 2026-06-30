import { useState } from 'react';
import type { SurveyType } from '../../App';
import { getDataService } from '../../services/factory';

interface Props {
  projectId: string;
  surveyType: SurveyType;
  onComplete: () => void;
  onBack: () => void;
}

const SURVEY_CONFIG: Record<SurveyType, { label: string; icon: string; steps: { key: string; label: string }[] }> = {
  CCTV: {
    label: 'CCTV Survey',
    icon: '📹',
    steps: [
      { key: 'building', label: 'Building Info' },
      { key: 'cameras', label: 'Cameras' },
      { key: 'infrastructure', label: 'Infrastructure' },
      { key: 'review', label: 'Review' },
    ],
  },
  FIRE_ALARM: {
    label: 'Fire Alarm Survey',
    icon: '🔔',
    steps: [
      { key: 'building', label: 'Building Info' },
      { key: 'detection', label: 'Detection Areas' },
      { key: 'panel', label: 'Control Panel' },
      { key: 'review', label: 'Review' },
    ],
  },
  FIRE_PROTECTION: {
    label: 'Fire Protection Survey',
    icon: '🧯',
    steps: [
      { key: 'building', label: 'Building Info' },
      { key: 'systems', label: 'Suppression Systems' },
      { key: 'review', label: 'Review' },
    ],
  },
  ACCESS_CONTROL: {
    label: 'Access Control Survey',
    icon: '🔑',
    steps: [
      { key: 'building', label: 'Building Info' },
      { key: 'doors', label: 'Doors & Readers' },
      { key: 'controller', label: 'Controller' },
      { key: 'review', label: 'Review' },
    ],
  },
  BURGLAR_ALARM: {
    label: 'Burglar Alarm Survey',
    icon: '🛡️',
    steps: [
      { key: 'building', label: 'Building Info' },
      { key: 'sensors', label: 'Sensors' },
      { key: 'panel', label: 'Control Panel' },
      { key: 'review', label: 'Review' },
    ],
  },
  OTHER: {
    label: 'Other Systems Survey',
    icon: '⚙️',
    steps: [
      { key: 'building', label: 'Building Info' },
      { key: 'specs', label: 'Technical Specs' },
      { key: 'review', label: 'Review' },
    ],
  },
};

export default function SurveyWizard({ projectId, surveyType, onComplete, onBack }: Props) {
  const config = SURVEY_CONFIG[surveyType];
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<Record<string, any>>({});

  const step = config.steps[currentStep];
  const isFirst = currentStep === 0;
  const isLast = currentStep === config.steps.length - 1;

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = async () => {
    if (isLast) {
      const svc = getDataService();
      await svc.createSurvey({
        projectId,
        type: surveyType,
        data: formData,
        status: 'Draft',
      });
      onComplete();
    } else {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (isFirst) {
      onBack();
    } else {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 flex flex-col">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-6 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <button onClick={handlePrev} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {isFirst ? 'Back to Project' : 'Previous Step'}
          </button>
          <div className="flex items-center gap-3">
            <span className="text-lg">{config.icon}</span>
            <span className="font-bold text-sm">{config.label}</span>
          </div>
          <span className="text-xs text-slate-400">Step {currentStep + 1} of {config.steps.length}</span>
        </div>
      </header>

      {/* Step indicator */}
      <div className="bg-white/50 backdrop-blur-sm border-b border-slate-200/30 shadow-sm">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-2">
            {config.steps.map((s, i) => {
              const isActive = i === currentStep;
              const isPast = i < currentStep;
              return (
                <div key={s.key} className="flex items-center gap-2 flex-1">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    isActive ? 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-110' :
                    isPast ? 'bg-emerald-500 text-white shadow-md' :
                    'bg-slate-200/60 text-slate-400'
                  }`}>
                    {isPast ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                    ) : i + 1}
                  </div>
                  <span className={`text-xs font-semibold hidden sm:block transition-colors ${isActive ? 'text-blue-600' : isPast ? 'text-emerald-600' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                  {i < config.steps.length - 1 && (
                    <div className={`flex-1 h-0.5 rounded-full transition-all duration-500 ${isPast ? 'bg-emerald-400' : 'bg-slate-200/60'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1 max-w-3xl mx-auto w-full px-6 py-8">
        <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg shadow-slate-200/50 border border-slate-200/60 p-8">
          {step.key === 'building' && (
            <BuildingForm data={formData} onChange={updateField} />
          )}
          {step.key === 'cameras' && (
            <CameraForm data={formData} onChange={updateField} />
          )}
          {step.key === 'detection' && (
            <DetectionForm data={formData} onChange={updateField} />
          )}
          {step.key === 'doors' && (
            <DoorForm data={formData} onChange={updateField} />
          )}
          {step.key === 'sensors' && (
            <SensorForm data={formData} onChange={updateField} />
          )}
          {step.key === 'infrastructure' && surveyType === 'CCTV' && (
            <CCTVInfraForm data={formData} onChange={updateField} />
          )}
          {step.key === 'controller' && (
            <ControllerForm data={formData} onChange={updateField} />
          )}
          {step.key === 'panel' && (
            <PanelForm data={formData} onChange={updateField} />
          )}
          {step.key === 'systems' && (
            <SuppressionForm data={formData} onChange={updateField} />
          )}
          {step.key === 'specs' && (
            <SpecsForm data={formData} onChange={updateField} />
          )}
          {step.key === 'review' && (
            <ReviewForm data={formData} surveyType={surveyType} />
          )}
        </div>

        <div className="flex justify-end mt-6">
          <button
            onClick={handleNext}
            className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 active:scale-[0.98] transition-all shadow-lg shadow-blue-200/50 hover:shadow-xl hover:shadow-blue-200/60"
          >
            {isLast ? 'Complete Survey' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-forms ─────────────────────────────────────────────

function BuildingForm({ data, onChange }: { data: any; onChange: any }) {
  const handleDimensionChange = (key: string, val: number) => {
    onChange(key, val);
    
    const length = key === 'buildingLength' ? val : (data.buildingLength || 0);
    const width = key === 'buildingWidth' ? val : (data.buildingWidth || 0);
    const floors = key === 'floors' ? val : (data.floors || 1);
    
    if (length > 0 && width > 0) {
      onChange('totalFloorArea', length * width * floors);
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Building Information</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Number of Floors</label>
          <input
            type="number"
            min={1}
            value={data.floors || 1}
            onChange={e => handleDimensionChange('floors', Number(e.target.value))}
            className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Is New Building?</label>
          <select
            value={data.isNew ?? ''}
            onChange={e => onChange('isNew', e.target.value === 'true')}
            className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
          >
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No (Existing)</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Building Length (m)</label>
          <input
            type="number"
            min={0}
            step="any"
            value={data.buildingLength || ''}
            onChange={e => handleDimensionChange('buildingLength', Number(e.target.value))}
            placeholder="e.g. 50"
            className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Building Width (m)</label>
          <input
            type="number"
            min={0}
            step="any"
            value={data.buildingWidth || ''}
            onChange={e => handleDimensionChange('buildingWidth', Number(e.target.value))}
            placeholder="e.g. 30"
            className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Total Floor Area (m²)</label>
          <input
            type="number"
            min={0}
            step="any"
            value={data.totalFloorArea || ''}
            onChange={e => onChange('totalFloorArea', Number(e.target.value))}
            placeholder="Auto-calculated"
            className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Floor Height (m)</label>
          <input
            type="number"
            min={0}
            step="any"
            value={data.floorHeight || ''}
            onChange={e => onChange('floorHeight', Number(e.target.value))}
            placeholder="e.g. 3.5"
            className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Number of Rooms</label>
          <input
            type="number"
            min={0}
            value={data.roomsCount || ''}
            onChange={e => onChange('roomsCount', Number(e.target.value))}
            placeholder="e.g. 12"
            className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all"
          />
        </div>
      </div>
    </div>
  );
}

function CameraForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Camera Configuration</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Number of Cameras</label>
          <input type="number" min={1} value={data.cameraCount || 1} onChange={e => onChange('cameraCount', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Resolution</label>
          <select value={data.resolution || ''} onChange={e => onChange('resolution', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="2MP">2MP (1080p)</option>
            <option value="5MP">5MP (3K)</option>
            <option value="8MP">8MP (4K)</option>
            <option value="12MP">12MP</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Camera Types</label>
          <div className="grid grid-cols-3 gap-2">
            {['Dome', 'Bullet', 'PTZ', 'Fisheye', 'Thermal', 'Box'].map(type => (
              <label key={type} className="flex items-center gap-2 p-3 rounded-xl border border-slate-200/60 bg-white/50 cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all">
                <input type="checkbox" checked={(data.cameraTypes || []).includes(type)} onChange={e => {
                  const current = data.cameraTypes || [];
                  onChange('cameraTypes', e.target.checked ? [...current, type] : current.filter((t: string) => t !== type));
                }} className="rounded" />
                <span className="text-sm font-medium">{type}</span>
              </label>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Indoor/Outdoor</label>
          <select value={data.environment || ''} onChange={e => onChange('environment', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Indoor">Indoor</option>
            <option value="Outdoor">Outdoor</option>
            <option value="Both">Both</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function CCTVInfraForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Infrastructure & Cabling</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Cable Type</label>
          <select value={data.cableType || ''} onChange={e => onChange('cableType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Cat5e">Cat5e</option>
            <option value="Cat6">Cat6</option>
            <option value="Cat6a">Cat6a</option>
            <option value="Fiber">Fiber Optic</option>
            <option value="Coax">Coaxial</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Cable Path</label>
          <select value={data.cablePath || ''} onChange={e => onChange('cablePath', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Cable Tray">Cable Tray</option>
            <option value="Conduit">Conduit</option>
            <option value="Ceiling">Ceiling Space</option>
            <option value="Underground">Underground</option>
            <option value="Wall">Wall Mounted</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Wall Type</label>
          <select value={data.wallType || ''} onChange={e => onChange('wallType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Drywall">Drywall</option>
            <option value="Concrete">Concrete</option>
            <option value="Brick">Brick</option>
            <option value="Metal">Metal</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Core Drilling Required?</label>
          <select value={data.coreDrilling ?? ''} onChange={e => onChange('coreDrilling', e.target.value === 'true')} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Estimated Cable Length (meters)</label>
          <input type="number" min={1} value={data.cableLength || ''} onChange={e => onChange('cableLength', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
      </div>
    </div>
  );
}

function DetectionForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Detection Areas</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">System Type</label>
          <select value={data.systemType || ''} onChange={e => onChange('systemType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Conventional">Conventional</option>
            <option value="Addressable">Addressable</option>
            <option value="Wireless">Wireless</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Smoke Detectors</label>
          <input type="number" min={0} value={data.smokeDetectors || 0} onChange={e => onChange('smokeDetectors', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Heat Detectors</label>
          <input type="number" min={0} value={data.heatDetectors || 0} onChange={e => onChange('heatDetectors', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Manual Call Points</label>
          <input type="number" min={0} value={data.mcpCount || 0} onChange={e => onChange('mcpCount', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Sounders</label>
          <input type="number" min={0} value={data.sounders || 0} onChange={e => onChange('sounders', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
      </div>
    </div>
  );
}

function DoorForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Doors & Readers</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Number of Doors</label>
          <input type="number" min={1} value={data.doorCount || 1} onChange={e => onChange('doorCount', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Door Type</label>
          <select value={data.doorType || ''} onChange={e => onChange('doorType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Wood">Wood</option>
            <option value="Metal">Metal</option>
            <option value="Glass">Glass</option>
            <option value="Fire Rated">Fire Rated</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Reader Type</label>
          <select value={data.readerType || ''} onChange={e => onChange('readerType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Proximity">Proximity</option>
            <option value="Biometric">Biometric</option>
            <option value="Keypad">Keypad</option>
            <option value="Mobile">Mobile/Bluetooth</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Lock Type</label>
          <select value={data.lockType || ''} onChange={e => onChange('lockType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Maglock">Maglock</option>
            <option value="Strike">Electric Strike</option>
            <option value="Cable">Cable Lock</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ControllerForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Controller Configuration</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Controller Location</label>
          <input value={data.controllerLocation || ''} onChange={e => onChange('controllerLocation', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" placeholder="e.g. Server Room" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">POE Available?</label>
          <select value={data.poeAvailable ?? ''} onChange={e => onChange('poeAvailable', e.target.value === 'true')} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">UPS Required?</label>
          <select value={data.upsRequired ?? ''} onChange={e => onChange('upsRequired', e.target.value === 'true')} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Network Required?</label>
          <select value={data.networkRequired ?? ''} onChange={e => onChange('networkRequired', e.target.value === 'true')} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function SensorForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Burglar Alarm Sensors</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">PIR Sensors</label>
          <input type="number" min={0} value={data.pirSensors || 0} onChange={e => onChange('pirSensors', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Door Contacts</label>
          <input type="number" min={0} value={data.doorContacts || 0} onChange={e => onChange('doorContacts', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Glass Break Sensors</label>
          <input type="number" min={0} value={data.glassBreak || 0} onChange={e => onChange('glassBreak', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Outdoor Sensors</label>
          <input type="number" min={0} value={data.outdoorSensors || 0} onChange={e => onChange('outdoorSensors', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
      </div>
    </div>
  );
}

function PanelForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Control Panel</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Panel Location</label>
          <input value={data.panelLocation || ''} onChange={e => onChange('panelLocation', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Rack Available?</label>
          <select value={data.rackAvailable ?? ''} onChange={e => onChange('rackAvailable', e.target.value === 'true')} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Power Available?</label>
          <select value={data.powerAvailable ?? ''} onChange={e => onChange('powerAvailable', e.target.value === 'true')} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Network Required?</label>
          <select value={data.networkRequired ?? ''} onChange={e => onChange('networkRequired', e.target.value === 'true')} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function SuppressionForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Suppression Systems</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">System Type</label>
          <select value={data.suppressionType || ''} onChange={e => onChange('suppressionType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Sprinkler">Sprinkler System</option>
            <option value="FM200">FM200</option>
            <option value="Novec">Novec 1230</option>
            <option value="CO2">CO2 System</option>
            <option value="Foam">Foam System</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Number of Zones</label>
          <input type="number" min={1} value={data.zones || 1} onChange={e => onChange('zones', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Cylinders/Units</label>
          <input type="number" min={1} value={data.cylinders || 1} onChange={e => onChange('cylinders', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
      </div>
    </div>
  );
}

function SpecsForm({ data, onChange }: { data: any; onChange: any }) {
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">System Specifications</h3>
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">System Type</label>
          <select value={data.otherSystemType || ''} onChange={e => onChange('otherSystemType', e.target.value)} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="Turnstile">Turnstile</option>
            <option value="Boom Barrier">Boom Barrier</option>
            <option value="Intercom">Intercom</option>
            <option value="Gate">Gate Automation</option>
            <option value="Parking">Parking System</option>
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Description</label>
          <textarea value={data.description || ''} onChange={e => onChange('description', e.target.value)} rows={4} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" placeholder="Describe the system requirements..." />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Quantity</label>
          <input type="number" min={1} value={data.quantity || 1} onChange={e => onChange('quantity', Number(e.target.value))} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-600 mb-1.5">Power Required?</label>
          <select value={data.powerRequired ?? ''} onChange={e => onChange('powerRequired', e.target.value === 'true')} className="w-full px-4 py-3 rounded-xl border border-slate-200/60 bg-white/50 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 focus:outline-none transition-all">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
      </div>
    </div>
  );
}

function ReviewForm({ data, surveyType }: { data: any; surveyType: string }) {
  const fields = Object.entries(data).filter(([_, v]) => v !== '' && v !== 0 && v !== false && v !== null && v !== undefined);
  return (
    <div className="space-y-4">
      <h3 className="font-bold text-lg">Review Survey Data</h3>
      {fields.length === 0 ? (
        <p className="text-slate-400 text-sm">No data entered yet. Fill in the previous steps.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {fields.map(([key, value]) => (
            <div key={key} className="p-3 rounded-xl bg-slate-50/80 border border-slate-200/60 shadow-sm">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{key}</span>
              <p className="text-sm font-semibold text-slate-800 mt-1">{String(value)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
