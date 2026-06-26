import { useState, useEffect, useRef } from 'react';
import type { Project, User } from '../../App';
import type { EstimationManpowerEntry, EstimationConsumableEntry, EstimationAdditionalFeeEntry } from '../../types';
import { analyzeFloorPlan } from '../../services/geminiFloorPlanService';
import productsData from '../../config/products.json';

function mapCategoryToOption(cat: string): string {
  const c = cat.toUpperCase();
  if (c.includes('CABLE') || c.includes('WIRE') || c.includes('UTP') || c.includes('RG59') || c.includes('RG6')) {
    return 'Wires & Cables';
  }
  if (c.includes('CONSUMABLE') || c.includes('TAPE') || c.includes('CONNECTOR') || c.includes('RJ45') || c.includes('MOUNT') || c.includes('BRACKET')) {
    return 'Mounting Hardware';
  }
  if (c.includes('TOOL')) {
    return 'Tools';
  }
  if (c.includes('SAFETY') || c.includes('GLOVE') || c.includes('HELMET')) {
    return 'Safety Equipment';
  }
  if (c.includes('LABEL') || c.includes('TAG')) {
    return 'Labels & Brackets';
  }
  if (c.includes('PIPE') || c.includes('CONDUIT') || c.includes('PVC') || c.includes('FLEXIBLE') || c.includes('MOULDING')) {
    return 'Protective Coverings';
  }
  if (c.includes('HARDWARE') || c.includes('CAMERA') || c.includes('NVR') || c.includes('DVR') || c.includes('SWITCH') || c.includes('READER') || c.includes('DETECTOR') || c.includes('LOCK')) {
    return 'Hardware';
  }
  return 'Other';
}

// Maps each system type to the sheetName values in products.json that belong to it.
// 'SHARED' sheets (consumables, wires) are always included regardless of system.
const SYSTEM_SHEET_MAP: Record<string, string[]> = {
  CCTV: [
    'CCTV ACCESSORIES', 'CCTV_AVTECH', 'CCTV_BOSCH', 'CCTV_DAHUA',
    'CCTV_EZVIZ', 'CCTV_HIKVISION', 'CCTV_HONEYWELL', 'CCTV_PANASONIC',
  ],
  FDAS: [
    'Copy of FDAS_ACCESSORIES', 'FDAS_ASENWARE', 'FDAS_EDWARDS',
    'FDAS_GAMEWELL BY HONEYWELL', 'FDAS_GST', 'FDAS_HOCHIKI',
    'FDAS_HONEYWELL', 'FDAS_HORING-LIH', 'FDAS_NOTIFIER',
    'FDAS_SIMPLEX', 'FDAS_TYY',
  ],
  ACCESS_CONTROL: [
    'HONEYWELL_Vista and Winpak', 'ZKTECO_A&C Accessory', 'ZKTECO_A&C Device',
    'ZKTECO_Accessories_BioCV', 'ZKTECO_Biometrics Reader', 'ZKTECO_Control Panel',
    'ZKTECO_Products_BioCV', 'ZKTECO_Smart video system', 'ZKTECO_T&A Accessory',
    'ZKTECO_Time Attendance', 'ZKTECO_UHF', 'ZKTECO_UHF Accessories',
    'ZK_Smart Business Digital Board',
  ],
  BURGLAR_ALARM: [
    'PARADOX', 'PARADOX PACKAGE, di me sigurado',
  ],
  DOOR_LOCK: [
    'HOTEL DOOR LOCK', 'ZKTECO_Lock Accessory', 'ZKTECO_Smart Hotel Solution',
    'ZKTECO_Smart Lock',
  ],
  EAS_SYSTEM: [
    'ZKTECO_EAS Products',
  ],
  FIRE_PROTECTION: [
    'ASENWARE-FIREPRO', 'EXTINGUISHER', 'FIRE PUMP', 'FIRE-PRO',
    'HONEYWELL GAS &FLAME DETECTOR  ', 'MARINE VALVE ', 'SPRINKLER',
  ],
  FIXED_ARM_ELEVATOR: [
    'ZKTECO Elevator', 'ZKTECO Fixed Arm',
  ],
  INTERCOM_NURSE_CALL: [
    'AIPHONE INTERCOM', 'FARFISA INTERCOM', 'ZKTECO VIDEO INTERCOM',
  ],
  PABX_PAGING: [
    'PABX', 'PAGING SYSTEM - HONEYWELL BRAND', 'PAGING SYSTEM - ITC BRAND',
    'PAGING SYSTEM - TOA BRAND',
  ],
  PARKING_BARRIER: [
    'BARRIER GATE', 'ZKTECO_Parking Barrier', 'ZK_Parking Barrier Accessories',
    'ZK_Parking Lock Accessories', 'ZK_Parking Lock Product', 'ZK_Vehicle Inspection',
  ],
  POS_SYSTEM: [
    'ZKTECO_POS Peripheral', 'ZKTECO_POS Terminal',
  ],
  ROOM_ALERT: [
    'AVTECH ROOM ALERT',
  ],
  XRAY_SECURITY: [
    'DAHUA_XRAY BAGGAGE & WALKTHRU', 'DAOSAFE_TURNSTILE ', 'GARRETT',
    'UNIQSCAN XRAY BAGGAGE & WALKTHR', 'ZKTECO_Explosive Detector',
    'ZKTECO_Turnstile', 'ZKTECO_X-ray', 'ZK_(E&C)optional accessories',
  ],
};

// Sheets that are always shown regardless of system type (general consumables, cabling, etc.)
const ALWAYS_INCLUDED_SHEETS = [
  'CONSUMABLES', 'CONSUMABLES Updated', 'Copy of CONSUMABLES - Wag dito',
  'Copy of CONSUMABLES - Wag dito ', 'WIRES', 'ROBART',
];

interface Props {
  project: Project;
  user: User | null;
  onBack: () => void;
}

function getRoleDefaultDayRate(role: string): number {
  const r = role.toLowerCase();
  if (r.includes('supervisor') || r.includes('manager') || r.includes('lead') || r.includes('engineer')) {
    return 1300;
  }
  return 1000;
}

function createManpower(): EstimationManpowerEntry {
  return { id: crypto.randomUUID(), role: '', headcount: 1, hours: 8, manDays: 1, dayRate: 1000, totalCost: 1000 };
}

function createConsumable(): EstimationConsumableEntry {
  return { id: crypto.randomUUID(), name: '', category: 'Hardware', quantity: 1, unit: 'pcs', unitPrice: 0, totalPrice: 0 };
}

function createFee(): EstimationAdditionalFeeEntry {
  return { id: crypto.randomUUID(), type: 'Other', amount: 0, description: '' };
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  background: '#FFFFFF',
  border: '1px solid #E2E8F0',
  color: '#1E293B',
  fontSize: '13px',
  outline: 'none',
  width: '100%',
};

const tableHeadStyle: React.CSSProperties = {
  paddingBottom: '10px',
  fontSize: '10px',
  fontWeight: 700,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: '#94A3B8',
  borderBottom: '1px solid #E2E8F0',
  textAlign: 'left',
};

const AI_STEPS = [
  'Reading floor plan layout & room structure...',
  'Identifying camera coverage zones & blind spots...',
  'Calculating cable routing distances & conduit paths...',
  'Estimating technician headcount & man-day requirements...',
  'Compiling materials bill-of-quantities & unit counts...',
];

export default function EstimationSummary({ project, user, onBack }: Props) {
  const showPrices = !!(user && (
    user.role === 'ADMIN' || 
    user.role === 'SALES' || 
    user.id.toLowerCase().includes('admin') || 
    user.id.toLowerCase().includes('sales') ||
    user.email?.toLowerCase().includes('admin') ||
    user.email?.toLowerCase().includes('sales')
  ));

  const [priceTier, setPriceTier] = useState<'srp' | 'contractorPrice' | 'dealerPrice'>('srp');
  const [manpower, setManpower] = useState<EstimationManpowerEntry[]>([]);
  const [consumables, setConsumables] = useState<EstimationConsumableEntry[]>([]);
  const [fees, setFees] = useState<EstimationAdditionalFeeEntry[]>([]);
  const [constraints, setConstraints] = useState({ physical: '', electrical: '', installation: '' });

  // Recalculate consumable prices when priceTier changes
  useEffect(() => {
    setConsumables(prev => prev.map(c => {
      if (!c.productId) return c;
      const matched = (productsData as any[]).find(p => p.id === c.productId);
      if (!matched) return c;
      const unitPrice = matched[priceTier] || 0;
      return {
        ...c,
        unitPrice,
        totalPrice: unitPrice * c.quantity
      };
    }));
  }, [priceTier]);

  // Floor plan upload — multiple files (images + PDFs)
  const [floorPlanFiles, setFloorPlanFiles] = useState<File[]>([]);
  const [floorPlanPreviews, setFloorPlanPreviews] = useState<{ name: string; url: string | null; type: string }[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI state
  const [isAiEstimating, setIsAiEstimating] = useState(false);
  const [aiStep, setAiStep] = useState(0);
  const [aiMode, setAiMode] = useState<'real' | 'simulation'>('simulation');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiObservations, setAiObservations] = useState<string | null>(null);

  // Product catalog search state
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Build the allowed sheet set based on the project's selected system types
  const getAllowedSheets = (): Set<string> | null => {
    const types = project.systemTypes;
    if (!types || types.length === 0) return null; // null = show all
    const sheets = new Set<string>(ALWAYS_INCLUDED_SHEETS);
    types.forEach(t => {
      (SYSTEM_SHEET_MAP[t] || []).forEach(s => sheets.add(s));
    });
    return sheets;
  };

  const getFilteredProducts = (query: string) => {
    const q = query.trim().toLowerCase();
    if (q.length <= 1) return [];
    const allowedSheets = getAllowedSheets();
    return (productsData as any[]).filter((p: any) => {
      // Filter by system type
      if (allowedSheets && !allowedSheets.has(p.sheetName)) return false;
      // Filter by search query
      return (
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.model && p.model.toLowerCase().includes(q)) ||
        (p.brand && p.brand.toLowerCase().includes(q))
      );
    }).slice(0, 15);
  };

  // Summary counts for the stat cards
  const totalHeadcount = manpower.reduce((sum, m) => sum + m.headcount, 0);
  const totalManDays = manpower.reduce((sum, m) => sum + m.manDays, 0);
  const totalMaterialLines = consumables.length;

  // Cable/meter total for quick reference
  const cableTotal = consumables
    .filter(c => c.unit?.toLowerCase().includes('meter') || c.unit?.toLowerCase() === 'm' || c.category === 'Wires & Cables')
    .reduce((sum, c) => sum + c.quantity, 0);

  const updateManpower = (id: string, field: keyof EstimationManpowerEntry, value: number | string) => {
    setManpower(prev => prev.map(m => {
      if (m.id !== id) return m;
      const updated = { ...m, [field]: value };
      if (field === 'headcount' || field === 'hours') {
        const hc = field === 'headcount' ? Number(value) : m.headcount;
        const hr = field === 'hours' ? Number(value) : m.hours;
        updated.manDays = Math.ceil(hc * hr / 8);
      }
      // Re-calculate totalCost when manDays or dayRate is modified
      const rate = field === 'dayRate' ? Number(value) : (m.dayRate || getRoleDefaultDayRate(updated.role));
      updated.dayRate = rate;
      updated.totalCost = rate * updated.manDays;
      return updated;
    }));
  };

  const updateConsumable = (id: string, field: keyof EstimationConsumableEntry, value: number | string) => {
    setConsumables(prev => prev.map(c => {
      if (c.id !== id) return c;
      const updated = { ...c, [field]: value };
      if (field === 'quantity' || field === 'unitPrice') {
        const qty = field === 'quantity' ? Number(value) : c.quantity;
        const prc = field === 'unitPrice' ? Number(value) : c.unitPrice;
        updated.totalPrice = qty * prc;
      }
      return updated;
    }));
  };

  const updateFee = (id: string, field: keyof EstimationAdditionalFeeEntry, value: string | number) => {
    setFees(prev => prev.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  // Handle file selection — appends to existing list
  const handleFilesSelect = (newFiles: FileList | File[]) => {
    const valid: File[] = [];
    const previews: { name: string; url: string | null; type: string }[] = [];
    Array.from(newFiles).forEach(file => {
      const isImage = file.type.startsWith('image/');
      const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isImage && !isPdf) return;
      valid.push(file);
      previews.push({
        name: file.name,
        url: isImage ? URL.createObjectURL(file) : null,
        type: isPdf ? 'pdf' : 'image',
      });
    });
    if (!valid.length) { alert('Please upload image files (JPG, PNG) or PDF documents.'); return; }
    setFloorPlanFiles(prev => [...prev, ...valid]);
    setFloorPlanPreviews(prev => [...prev, ...previews]);
    setAiError(null);
    setAiObservations(null);
  };

  const removeFile = (idx: number) => {
    setFloorPlanFiles(prev => prev.filter((_, i) => i !== idx));
    setFloorPlanPreviews(prev => {
      const removed = prev[idx];
      if (removed?.url) URL.revokeObjectURL(removed.url);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // Step animation for simulated AI
  useEffect(() => {
    if (!isAiEstimating || aiMode === 'real') return;
    if (aiStep < AI_STEPS.length) {
      const timer = setTimeout(() => setAiStep(prev => prev + 1), 700);
      return () => clearTimeout(timer);
    } else {
      // Simulation complete — populate based on floors/building type
      const fl = project.floors || 1;
      const bt = project.buildingType || 'Office';
      const cctvCount = fl * 8;

      setManpower([
        { id: crypto.randomUUID(), role: 'Lead Security Engineer', headcount: 1, hours: fl * 16, manDays: Math.ceil(fl * 16 / 8), dayRate: 1300, totalCost: 1300 * Math.ceil(fl * 16 / 8) },
        { id: crypto.randomUUID(), role: 'Senior System Installer', headcount: Math.max(2, fl), hours: fl * 24, manDays: Math.ceil((Math.max(2, fl) * fl * 24) / 8), dayRate: 1000, totalCost: 1000 * Math.ceil((Math.max(2, fl) * fl * 24) / 8) },
        { id: crypto.randomUUID(), role: 'Safety Officer', headcount: 1, hours: fl * 8, manDays: Math.ceil(fl * 8 / 8), dayRate: 1000, totalCost: 1000 * Math.ceil(fl * 8 / 8) },
      ]);

      const matchDbProduct = (searchName: string, defaultName: string, defaultCategory: string, defaultUnit: string, quantity: number) => {
        const matched = (productsData as any[]).find(p => p.name.toLowerCase().includes(searchName.toLowerCase()));
        const unitPrice = matched ? (matched[priceTier] || 0) : 0;
        return {
          id: crypto.randomUUID(),
          name: matched ? matched.name : defaultName,
          category: matched ? mapCategoryToOption(matched.category) : defaultCategory,
          quantity,
          unit: defaultUnit,
          unitPrice,
          totalPrice: unitPrice * quantity,
          productId: matched?.id,
        };
      };

      const domeCam = matchDbProduct('Dome Camera', `${bt} Grade IP Dome Camera`, 'Hardware', 'pcs', cctvCount);
      const nvr = matchDbProduct('NVR', 'NVR 32-Channel Smart Storage', 'Hardware', 'pcs', Math.ceil(fl / 2));
      const cable = matchDbProduct('UTP Cable', 'Cat6 UTP Cable', 'Wires & Cables', 'meters', cctvCount * 50);
      const networkSwitch = matchDbProduct('Switch 16-Port', 'Gigabit PoE Network Switch 16-Port', 'Hardware', 'pcs', fl);
      const rack = matchDbProduct('Rack 9U', 'Wall-Mount Equipment Rack 9U', 'Hardware', 'pcs', 1);
      const rj45 = matchDbProduct('RJ45', 'RJ45 Connectors', 'Mounting Hardware', 'pcs', cctvCount * 2);

      setConsumables([domeCam, nvr, cable, networkSwitch, rack, rj45]);
      setFees([
        { id: crypto.randomUUID(), type: 'Travel Fee', amount: 7500, description: 'Mobilization & logistics from Manila HQ to site' },
        { id: crypto.randomUUID(), type: 'Other', amount: 3500, description: 'System testing, calibration & certification' },
      ]);
      setConstraints({
        physical: `Wall types include concrete blocks and drywall partitions. Ceiling heights average 3.2m (${fl} floor${fl > 1 ? 's' : ''}).`,
        electrical: 'Centralized UPS required at server rack. Isolated grounding wire must route to main electrical room.',
        installation: 'Working hours: 8:00 PM – 5:00 AM night shift to avoid disruption to daily operations.',
      });

      setTimeout(() => setIsAiEstimating(false), 600);
    }
  }, [isAiEstimating, aiStep, aiMode, priceTier]);

  // Real AI estimation runner
  const runAiEstimation = async () => {
    setAiError(null);
    setAiObservations(null);
    setAiStep(0);

    // Build the surveyType string from project.systemTypes (comma-separated for the AI)
    const surveyTypeStr = (project.systemTypes && project.systemTypes.length > 0)
      ? project.systemTypes.join(',')
      : (project.buildingType || 'CCTV');

    if (floorPlanFiles.length > 0) {
      setAiMode('real');
      setIsAiEstimating(true);

      let stepInterval: ReturnType<typeof setInterval>;
      let currentStep = 0;
      stepInterval = setInterval(() => {
        currentStep = Math.min(currentStep + 1, AI_STEPS.length - 1);
        setAiStep(currentStep);
      }, 800);

      try {
        const result = await analyzeFloorPlan(
          floorPlanFiles,
          surveyTypeStr,
          {
            buildingType: project.buildingType,
            floors: project.floors,
            location: project.location,
            projectName: project.name,
            surveyScope: project.surveyScope,
          }
        );

        clearInterval(stepInterval);
        setAiStep(AI_STEPS.length);

        setManpower(
          result.manpower.map(m => {
            const dayRate = getRoleDefaultDayRate(m.role);
            return {
              id: crypto.randomUUID(),
              role: m.role,
              headcount: m.headcount,
              hours: m.hours,
              manDays: m.manDays,
              dayRate,
              totalCost: dayRate * m.manDays,
            };
          })
        );
        setConsumables(
          result.consumables.map(c => {
            const matched = (productsData as any[]).find(p =>
              p.name.toLowerCase().includes(c.name.toLowerCase()) ||
              c.name.toLowerCase().includes(p.name.toLowerCase()) ||
              (p.model && c.name.toLowerCase().includes(p.model.toLowerCase()))
            );
            const unitPrice = matched ? (matched[priceTier] || 0) : 0;
            return {
              id: crypto.randomUUID(),
              name: matched ? matched.name : c.name,
              category: matched ? mapCategoryToOption(matched.category) : c.category,
              quantity: c.quantity,
              unit: c.unit || 'pcs',
              unitPrice,
              totalPrice: unitPrice * c.quantity,
              productId: matched?.id,
            };
          })
        );
        setFees(
          result.fees.map(f => ({
            id: crypto.randomUUID(),
            type: f.type as EstimationAdditionalFeeEntry['type'],
            amount: f.amount || 0,
            description: f.description,
          }))
        );
        if (result.constraints) {
          setConstraints({
            physical: result.constraints.physical || '',
            electrical: result.constraints.electrical || '',
            installation: result.constraints.installation || '',
          });
        }
        if (result.observations) {
          setAiObservations(result.observations);
        }

        setTimeout(() => setIsAiEstimating(false), 500);
      } catch (err: unknown) {
        clearInterval(stepInterval);
        setIsAiEstimating(false);
        setAiError(err instanceof Error ? err.message : 'AI estimation failed. Please try again.');
      }
    } else {
      setAiMode('simulation');
      setIsAiEstimating(true);
    }
  };

  const hasFiles = floorPlanFiles.length > 0;
  const sectionCard: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '24px',
    padding: '24px',
    marginBottom: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
  };

  const addBtn = (label: string, onClick: () => void) => (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all border border-slate-200 hover:bg-slate-50 text-slate-600"
    >
      + {label}
    </button>
  );

  const removeBtn = (onClick: () => void) => (
    <button
      onClick={onClick}
      className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded"
    >
      Remove
    </button>
  );

  return (
    <div className="min-h-screen pb-16" style={{ background: '#F4F6FA' }}>
      {/* Header */}
      <header className="px-6 py-4 bg-white" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors px-3 py-2 rounded-lg"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Project
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={runAiEstimation}
              className="px-4 py-2.5 rounded-full text-xs font-bold text-white flex items-center gap-2 shadow-sm transition-all hover:opacity-95"
              style={{ background: hasFiles ? '#7C3AED' : '#1E3A8A' }}
            >
              <svg className="w-3.5 h-3.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L9 21zm0 0h-.01m-4.24-5.24A8.003 8.003 0 0112 4v12M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {hasFiles ? `ANALYZE ${floorPlanFiles.length} FLOOR PLAN${floorPlanFiles.length > 1 ? 'S' : ''}` : 'AI ESTIMATE SCAN'}
            </button>

            <button className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-500 border border-slate-200 hover:text-[#1E3A8A] transition-colors flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
              </svg>
              Export PDF
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">

        {/* Project title card */}
        <div style={{ ...sectionCard, marginBottom: '24px' }}>
          <h1 className="text-xl font-black text-slate-800">{project.name}</h1>
          <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{project.clientName} · {project.location}</p>

          {/* System type badges — MOST IMPORTANT CONTEXT */}
          {project.systemTypes && project.systemTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {project.systemTypes.map(type => {
                const COLORS: Record<string, { bg: string; color: string; label: string; icon: string }> = {
                  CCTV:                { bg: '#EFF6FF', color: '#1E3A8A', label: 'CCTV System',                        icon: '📷' },
                  FDAS:                { bg: '#FEF2F2', color: '#DC2626', label: 'FDAS / Fire Alarm System',           icon: '🔥' },
                  ACCESS_CONTROL:      { bg: '#ECFDF5', color: '#065F46', label: 'Access Control System',              icon: '🔐' },
                  BURGLAR_ALARM:       { bg: '#FFFBEB', color: '#92400E', label: 'Burglar Alarm System',               icon: '🚨' },
                  DOOR_LOCK:           { bg: '#FFFBEB', color: '#B45309', label: 'Door Lock System',                   icon: '🔑' },
                  EAS_SYSTEM:          { bg: '#FEF3C7', color: '#D97706', label: 'EAS System',                         icon: '🏷️' },
                  FIRE_PROTECTION:     { bg: '#FAF5FF', color: '#7E22CE', label: 'Fire Protection / Suppression',      icon: '💧' },
                  FIXED_ARM_ELEVATOR:  { bg: '#F0F9FF', color: '#0369A1', label: 'Fixed Arm & Elevator Related',       icon: '🛗' },
                  INTERCOM_NURSE_CALL: { bg: '#F0FDFA', color: '#0F766E', label: 'Intercom & Nurse Call System',       icon: '📞' },
                  PABX_PAGING:         { bg: '#EEF2FF', color: '#4F46E5', label: 'PABX & Paging System',               icon: '📢' },
                  PARKING_BARRIER:     { bg: '#ECFEFF', color: '#0891B2', label: 'Parking Barrier System',             icon: '🚗' },
                  POS_SYSTEM:          { bg: '#EFF6FF', color: '#2563EB', label: 'POS System',                         icon: '💻' },
                  ROOM_ALERT:          { bg: '#FFF1F2', color: '#E11D48', label: 'Room Alert System',                  icon: '🌡️' },
                  XRAY_SECURITY:       { bg: '#FAF5FF', color: '#6B21A8', label: 'X-Ray & Turnstile System',           icon: '🔬' },
                };
                const cfg = COLORS[type] || { bg: '#F8FAFC', color: '#475569', label: type, icon: '⚙️' };
                return (
                  <span
                    key={type}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-black border"
                    style={{ background: cfg.bg, color: cfg.color, borderColor: cfg.color + '30' }}
                  >
                    <span>{cfg.icon}</span>
                    {cfg.label}
                  </span>
                );
              })}
              <span className="flex items-center text-[10px] font-bold text-slate-400 ml-1">← AI will estimate for these systems</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-4 mt-4">
            {[
              ...(project.buildingType ? [{ label: 'Building Type', value: project.buildingType }] : []),
              ...(project.floors ? [{ label: 'Floors', value: `${project.floors}` }] : []),
            ].map(item => (
              <div key={item.label} className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">{item.label}: </span>
                <span className="text-xs font-bold text-slate-600">{item.value}</span>
              </div>
            ))}
            {project.surveyScope && (
              <div className="px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 max-w-sm">
                <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Scope: </span>
                <span className="text-xs font-semibold text-slate-600 line-clamp-1">{project.surveyScope}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── Estimation Summary Cards ── */}
        {(manpower.length > 0 || consumables.length > 0) && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total Headcount', value: `${totalHeadcount} pax`, icon: '👥', color: '#1E3A8A', bg: '#EFF6FF' },
              { label: 'Total Man-Days', value: `${totalManDays} days`, icon: '📅', color: '#065F46', bg: '#ECFDF5' },
              { label: 'Material Lines', value: `${totalMaterialLines} items`, icon: '📦', color: '#92400E', bg: '#FFFBEB' },
              { label: 'Cable Estimate', value: cableTotal > 0 ? `~${cableTotal.toLocaleString()} m` : '—', icon: '🔌', color: '#6B21A8', bg: '#FAF5FF' },
            ].map(card => (
              <div key={card.label} className="rounded-2xl p-4 flex flex-col gap-1" style={{ background: card.bg, border: `1px solid ${card.color}18` }}>
                <span className="text-xl">{card.icon}</span>
                <span className="text-lg font-black" style={{ color: card.color }}>{card.value}</span>
                <span className="text-[9px] font-bold uppercase tracking-wider" style={{ color: card.color + 'AA' }}>{card.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* ── Floor Plan Upload Section ── */}
        <div style={{ ...sectionCard, border: hasFiles ? '1px solid #6D28D9' : '1px solid #E2E8F0', background: hasFiles ? '#FAFAFE' : '#FFFFFF' }}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm" style={{ background: '#F5F3FF', color: '#7C3AED' }}>
              🗺️
            </div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Floor Plan Upload</h2>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
              Powers AI Analysis
            </span>
          </div>

          {/* AI Observations */}
          {aiObservations && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-purple-50 border border-purple-100">
              <p className="text-[9px] font-bold uppercase tracking-wider text-purple-400 mb-1">AI Floor Plan Observations</p>
              <p className="text-xs font-semibold text-purple-800">{aiObservations}</p>
            </div>
          )}

          {/* Error display */}
          {aiError && (
            <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-100 flex items-start gap-2">
              <span className="text-red-500 text-sm mt-0.5">⚠️</span>
              <div>
                <p className="text-xs font-bold text-red-700">{aiError}</p>
                {aiError.includes('Settings') && (
                  <p className="text-[11px] text-red-500 mt-1">Go to <strong>Settings → AI Configuration</strong> to add your key.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4 items-start">
            {/* Dropzone */}
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setIsDragOver(false);
                if (e.dataTransfer.files.length) handleFilesSelect(e.dataTransfer.files);
              }}
              className="flex-1 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center py-8 cursor-pointer transition-all"
              style={{
                borderColor: isDragOver ? '#7C3AED' : hasFiles ? '#A78BFA' : '#E2E8F0',
                background: isDragOver ? '#F5F3FF' : hasFiles ? '#FAFAFE' : '#F8FAFC',
              }}
            >
              <span className="text-3xl mb-3">{hasFiles ? '➕' : '🗺️'}</span>
              <p className="text-xs font-black text-slate-700">
                {hasFiles ? 'Add more floor plans' : 'Drop floor plans here'}
              </p>
              <p className="text-[10px] text-slate-400 mt-1">JPG, PNG or PDF · Multiple files supported</p>
            </div>
          </div>

          {/* File list */}
          {floorPlanPreviews.length > 0 && (
            <div className="mt-4 space-y-2">
              {floorPlanPreviews.map((fp, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-purple-100"
                >
                  {fp.url ? (
                    <img src={fp.url} alt={fp.name} className="w-12 h-10 object-contain rounded-lg border border-slate-200 bg-slate-50 shrink-0" />
                  ) : (
                    <div className="w-12 h-10 rounded-lg border border-red-100 bg-red-50 flex items-center justify-center shrink-0">
                      <span className="text-lg">📄</span>
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-700 truncate">{fp.name}</p>
                    <span
                      className="text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wide"
                      style={fp.type === 'pdf'
                        ? { background: '#FEF2F2', color: '#DC2626' }
                        : { background: '#EFF6FF', color: '#2563EB' }
                      }
                    >
                      {fp.type === 'pdf' ? 'PDF' : 'Image'}
                    </span>
                  </div>

                  <button
                    onClick={() => removeFile(idx)}
                    className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 text-red-500 flex items-center justify-center text-xs font-black transition-colors shrink-0"
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,application/pdf,.pdf"
            multiple
            className="hidden"
            onChange={e => { if (e.target.files?.length) { handleFilesSelect(e.target.files); e.target.value = ''; } }}
          />

          <p className="text-[10px] font-semibold text-slate-400 mt-3">
            {hasFiles
              ? `✓ ${floorPlanFiles.length} file${floorPlanFiles.length > 1 ? 's' : ''} ready — click "ANALYZE ${floorPlanFiles.length} FLOOR PLAN${floorPlanFiles.length > 1 ? 'S' : ''}" to run Groq Vision AI analysis`
              : 'Without a floor plan, "AI ESTIMATE SCAN" uses building type + floor count as a simulation instead'}
          </p>
        </div>

        {/* ── Manpower Section ── */}
        <div style={sectionCard}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-[#1E3A8A] text-sm">👤</div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Project Manpower</h2>
            </div>
            {addBtn('Add Row', () => setManpower(prev => [...prev, createManpower()]))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {(showPrices 
                    ? ['Role Position', 'Headcount', 'Hours / Person', 'Man-Days', 'Day Rate (₱)', 'Total Labor (₱)', '']
                    : ['Role Position', 'Headcount', 'Hours / Person', 'Man-Days', '']
                  ).map(h => (
                    <th key={h} style={tableHeadStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {manpower.map(m => (
                  <tr key={m.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-2">
                      <input value={m.role} onChange={e => updateManpower(m.id, 'role', e.target.value)} placeholder="e.g. Technician"
                        style={{ ...inputStyle, width: '180px' }} />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input type="number" min={1} value={m.headcount} onChange={e => updateManpower(m.id, 'headcount', Number(e.target.value))}
                        style={{ ...inputStyle, width: '70px' }} />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input type="number" min={1} value={m.hours} onChange={e => updateManpower(m.id, 'hours', Number(e.target.value))}
                        style={{ ...inputStyle, width: '80px' }} />
                    </td>
                    <td className="py-2.5 pr-2">
                      <span className="text-xs font-black text-slate-700 px-2 py-1 rounded-lg bg-blue-50">{m.manDays} days</span>
                    </td>
                    {showPrices && (
                      <>
                        <td className="py-2.5 pr-2">
                          <input type="number" min={0} value={m.dayRate ?? getRoleDefaultDayRate(m.role)} onChange={e => updateManpower(m.id, 'dayRate', Number(e.target.value))}
                            style={{ ...inputStyle, width: '90px' }} />
                        </td>
                        <td className="py-2.5 pr-2">
                          <span className="text-xs font-black text-slate-700">₱{((m.totalCost ?? (m.dayRate ?? getRoleDefaultDayRate(m.role)) * m.manDays)).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </td>
                      </>
                    )}
                    <td className="py-2.5">{removeBtn(() => setManpower(prev => prev.filter(x => x.id !== m.id)))}</td>
                  </tr>
                ))}
                {manpower.length === 0 && (
                  <tr><td colSpan={showPrices ? 7 : 5} className="py-8 text-center text-xs text-slate-400 font-semibold">
                    Upload a floor plan and click "ANALYZE FLOOR PLAN", or click "AI ESTIMATE SCAN" to simulate, or add rows manually.
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Materials & Consumables ── */}
        <div style={sectionCard}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-amber-50 text-amber-600 text-sm">📦</div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Materials & Consumables</h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100">Bill of Quantities</span>
            </div>
            <div className="flex items-center gap-3">
              {showPrices && (
                <div className="flex items-center gap-1 bg-slate-50 border border-slate-200 rounded-xl p-1">
                  {(['srp', 'contractorPrice', 'dealerPrice'] as const).map(tier => (
                    <button
                      key={tier}
                      onClick={() => setPriceTier(tier)}
                      className="px-3 py-1 rounded-lg text-[10px] font-black transition-all"
                      style={{
                        background: priceTier === tier ? '#1E3A8A' : 'transparent',
                        color: priceTier === tier ? '#FFFFFF' : '#94A3B8',
                      }}
                    >
                      {tier === 'srp' ? 'SRP' : tier === 'contractorPrice' ? 'Contractor' : 'Dealer'}
                    </button>
                  ))}
                </div>
              )}
              {addBtn('Add Item', () => setConsumables(prev => [...prev, createConsumable()]))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {(showPrices
                    ? ['Item / Model Name', 'Category', 'Qty', 'Unit', 'Unit Price (₱)', 'Total Price (₱)', 'Notes', '']
                    : ['Item / Model Name', 'Category', 'Qty', 'Unit', 'Notes', '']
                  ).map(h => (
                    <th key={h} style={tableHeadStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {consumables.map(c => (
                  <tr key={c.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-2 relative">
                      <input
                        value={activeSearchId === c.id ? searchQuery : c.name}
                        onChange={e => {
                          if (activeSearchId !== c.id) setActiveSearchId(c.id);
                          setSearchQuery(e.target.value);
                          updateConsumable(c.id, 'name', e.target.value);
                        }}
                        onFocus={() => {
                          setActiveSearchId(c.id);
                          setSearchQuery(c.name);
                        }}
                        placeholder="Type model or description..."
                        style={{ ...inputStyle, width: '220px' }}
                      />

                      {activeSearchId === c.id && (
                        <>
                          <div
                            className="fixed inset-0 z-40"
                            onClick={() => setActiveSearchId(null)}
                          />
                          <div
                            className="absolute left-0 z-50 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                            style={{ width: '400px', maxHeight: '260px', overflowY: 'auto' }}
                          >
                            <div className="p-2 border-b border-slate-100 bg-slate-50">
                              <div className="flex items-center justify-between">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Product Catalog</span>
                                <button
                                  onClick={() => setActiveSearchId(null)}
                                  className="text-[10px] font-bold text-amber-600 hover:underline cursor-pointer"
                                >
                                  Close
                                </button>
                              </div>
                              {project.systemTypes && project.systemTypes.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1.5">
                                  {project.systemTypes.map(t => {
                                    const LABELS: Record<string, { label: string; color: string }> = {
                                      CCTV:                { label: 'CCTV',                        color: '#1E3A8A' },
                                      FDAS:                { label: 'FDAS',                        color: '#DC2626' },
                                      ACCESS_CONTROL:      { label: 'Access Control',              color: '#065F46' },
                                      BURGLAR_ALARM:       { label: 'Burglar Alarm',               color: '#92400E' },
                                      DOOR_LOCK:           { label: 'Door Lock',                   color: '#B45309' },
                                      EAS_SYSTEM:          { label: 'EAS',                         color: '#D97706' },
                                      FIRE_PROTECTION:     { label: 'Fire Suppression',            color: '#7E22CE' },
                                      FIXED_ARM_ELEVATOR:  { label: 'Elevator & Fixed Arm',        color: '#0369A1' },
                                      INTERCOM_NURSE_CALL: { label: 'Intercom & Nurse Call',       color: '#0F766E' },
                                      PABX_PAGING:         { label: 'PABX & Paging',               color: '#4F46E5' },
                                      PARKING_BARRIER:     { label: 'Parking Barrier',             color: '#0891B2' },
                                      POS_SYSTEM:          { label: 'POS',                         color: '#2563EB' },
                                      ROOM_ALERT:          { label: 'Room Alert',                  color: '#E11D48' },
                                      XRAY_SECURITY:       { label: 'X-Ray & Turnstile',           color: '#6B21A8' },
                                    };
                                    const cfg = LABELS[t] || { label: t, color: '#475569' };
                                    return (
                                      <span key={t} className="text-[8px] font-black px-1.5 py-0.5 rounded" style={{ background: cfg.color + '15', color: cfg.color }}>
                                        {cfg.label}
                                      </span>
                                    );
                                  })}
                                  <span className="text-[8px] text-slate-400 font-semibold">+ shared consumables</span>
                                </div>
                              )}
                            </div>

                            {getFilteredProducts(searchQuery).map(p => (
                              <button
                                key={p.id}
                                onClick={() => {
                                  setConsumables(prev => prev.map(item => {
                                    if (item.id === c.id) {
                                      const unitPrice = p[priceTier] || 0;
                                      return {
                                        ...item,
                                        productId: p.id,
                                        name: p.name,
                                        category: mapCategoryToOption(p.category),
                                        unitPrice,
                                        totalPrice: unitPrice * item.quantity,
                                      };
                                    }
                                    return item;
                                  }));
                                  setActiveSearchId(null);
                                }}
                                className="w-full text-left px-3 py-2 border-b border-slate-50 hover:bg-amber-50/50 transition-all flex flex-col gap-0.5 cursor-pointer"
                              >
                                <div className="text-xs font-bold text-slate-800 line-clamp-1">{p.name}</div>
                                <div className="text-[9px] font-semibold text-slate-400 flex items-center gap-2">
                                  <span>Model: {p.model || 'N/A'} | Brand: {p.brand || 'N/A'}</span>
                                  <span className="px-1.5 py-0.5 rounded text-[8px] font-black bg-slate-100 text-slate-500">{p.sheetName}</span>
                                </div>
                              </button>
                            ))}

                            {getFilteredProducts(searchQuery).length === 0 && (
                              <div className="p-4 text-center text-xs font-bold text-slate-400">
                                {searchQuery.trim().length <= 1
                                  ? 'Type at least 2 characters to search...'
                                  : `No products found${project.systemTypes && project.systemTypes.length > 0 ? ' in selected system categories' : ''}.`}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </td>
                    <td className="py-2.5 pr-2">
                      <select value={c.category} onChange={e => updateConsumable(c.id, 'category', e.target.value)}
                        style={{ ...inputStyle, width: '130px', cursor: 'pointer' }}>
                        <option>Hardware</option>
                        <option>Wires & Cables</option>
                        <option>Mounting Hardware</option>
                        <option>Tools</option>
                        <option>Safety Equipment</option>
                        <option>Labels & Brackets</option>
                        <option>Protective Coverings</option>
                        <option>Other</option>
                      </select>
                    </td>
                    <td className="py-2.5 pr-2">
                      <input type="number" min={1} value={c.quantity} onChange={e => updateConsumable(c.id, 'quantity', Number(e.target.value))}
                        style={{ ...inputStyle, width: '70px' }} />
                    </td>
                    <td className="py-2.5 pr-2">
                      <input value={c.unit || 'pcs'} onChange={e => updateConsumable(c.id, 'unit', e.target.value)} placeholder="pcs"
                        style={{ ...inputStyle, width: '70px' }} />
                    </td>
                    {showPrices && (
                      <>
                        <td className="py-2.5 pr-2">
                          <input type="number" min={0} value={c.unitPrice || 0} onChange={e => updateConsumable(c.id, 'unitPrice', Number(e.target.value))}
                            style={{ ...inputStyle, width: '100px' }} />
                        </td>
                        <td className="py-2.5 pr-2">
                          <span className="text-xs font-black text-slate-700">
                            ₱{(c.totalPrice || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                      </>
                    )}
                    <td className="py-2.5 pr-2">
                      <input value={c.notes || ''} onChange={e => updateConsumable(c.id, 'notes', e.target.value)} placeholder="Optional note..."
                        style={{ ...inputStyle, width: '140px', fontSize: '11px' }} />
                    </td>
                    <td className="py-2.5">{removeBtn(() => setConsumables(prev => prev.filter(x => x.id !== c.id)))}</td>
                  </tr>
                ))}
                {consumables.length === 0 && (
                  <tr><td colSpan={showPrices ? 8 : 6} className="py-8 text-center text-xs text-slate-400 font-semibold">No materials added yet.</td></tr>
                )}
                {showPrices && consumables.length > 0 && (() => {
                  const totalLabor = manpower.reduce((sum, m) => sum + (m.totalCost ?? 0), 0);
                  const totalMaterials = consumables.reduce((sum, c) => sum + (c.totalPrice || 0), 0);
                  const totalFees = fees.reduce((sum, f) => sum + (f.amount || 0), 0);
                  const grandTotal = totalLabor + totalMaterials + totalFees;
                  return (
                    <>
                      <tr>
                        <td colSpan={5} className="pt-4 pb-1">
                          <div className="border-t border-slate-200" />
                        </td>
                        <td colSpan={3} className="pt-4 pb-1" />
                      </tr>
                      <tr>
                        <td colSpan={5} className="py-1 text-right text-[10px] font-black uppercase tracking-wider text-slate-400 pr-3">Materials Subtotal</td>
                        <td className="py-1 text-xs font-black text-amber-700">
                          ₱{totalMaterials.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2} />
                      </tr>
                      <tr>
                        <td colSpan={5} className="py-1 text-right text-[10px] font-black uppercase tracking-wider text-slate-400 pr-3">Labor Subtotal</td>
                        <td className="py-1 text-xs font-black text-blue-700">
                          ₱{totalLabor.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td colSpan={2} />
                      </tr>
                      {totalFees > 0 && (
                        <tr>
                          <td colSpan={5} className="py-1 text-right text-[10px] font-black uppercase tracking-wider text-slate-400 pr-3">Fees Subtotal</td>
                          <td className="py-1 text-xs font-black text-rose-700">
                            ₱{totalFees.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td colSpan={2} />
                        </tr>
                      )}
                      <tr>
                        <td colSpan={5} className="pt-2 pb-3 text-right text-xs font-black uppercase tracking-wider text-slate-700 pr-3">GRAND TOTAL</td>
                        <td className="pt-2 pb-3">
                          <span className="text-sm font-black px-3 py-1 rounded-lg" style={{ background: '#EFF6FF', color: '#1E3A8A' }}>
                            ₱{grandTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </td>
                        <td colSpan={2} />
                      </tr>
                    </>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Logistics & Special Requirements ── */}
        <div style={sectionCard}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-rose-50 text-rose-500 text-sm">🚛</div>
              <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Logistics & Special Requirements</h2>
            </div>
            {addBtn('Add Item', () => setFees(prev => [...prev, createFee()]))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {(showPrices
                    ? ['Requirement Type', 'Description', 'Amount (₱)', '']
                    : ['Requirement Type', 'Description', '']
                  ).map(h => (
                    <th key={h} style={tableHeadStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fees.map(f => (
                  <tr key={f.id} className="border-b border-slate-100">
                    <td className="py-2.5 pr-2">
                      <select value={f.type} onChange={e => updateFee(f.id, 'type', e.target.value)}
                        style={{ ...inputStyle, width: '160px', cursor: 'pointer' }}>
                        <option>Travel Fee</option>
                        <option>Congestion Fee</option>
                        <option>Short Notice Fee</option>
                        <option>Overtime Fee</option>
                        <option>Weekend Fee</option>
                        <option>Holiday Fee</option>
                        <option>Other</option>
                      </select>
                    </td>
                    <td className="py-2.5 pr-2">
                      <input value={f.description} onChange={e => updateFee(f.id, 'description', e.target.value)}
                        placeholder="Describe the requirement..."
                        style={{ ...inputStyle, width: '340px' }} />
                    </td>
                    {showPrices && (
                      <td className="py-2.5 pr-2">
                        <input type="number" min={0} value={f.amount || 0} onChange={e => updateFee(f.id, 'amount', Number(e.target.value))}
                          style={{ ...inputStyle, width: '120px' }} />
                      </td>
                    )}
                    <td className="py-2.5">{removeBtn(() => setFees(prev => prev.filter(x => x.id !== f.id)))}</td>
                  </tr>
                ))}
                {fees.length === 0 && (
                  <tr><td colSpan={showPrices ? 4 : 3} className="py-8 text-center text-xs text-slate-400 font-semibold">No logistics requirements added yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Site Constraints ── */}
        <div style={sectionCard}>
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-emerald-50 text-emerald-600 text-sm">ℹ️</div>
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-tight">Survey Constraints</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {([
              { key: 'physical' as const, label: 'Physical Site Constraints', placeholder: 'Wall obstructions, high ceiling, drywall...' },
              { key: 'electrical' as const, label: 'Electrical Constraints', placeholder: 'Access to DB, breaker space, UPS storage...' },
              { key: 'installation' as const, label: 'Cabling / Shift Constraints', placeholder: 'Permitted drill times, night shifts...' },
            ] as const).map(c => (
              <div key={c.key}>
                <label className="block text-[9px] font-bold uppercase tracking-wider mb-2 text-[#94A3B8]">{c.label}</label>
                <textarea
                  value={constraints[c.key]}
                  onChange={e => setConstraints(prev => ({ ...prev, [c.key]: e.target.value }))}
                  rows={3}
                  placeholder={c.placeholder}
                  className="w-full resize-none rounded-xl text-xs outline-none focus:border-[#1E3A8A]"
                  style={{ ...inputStyle, padding: '10px 12px' }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center justify-between gap-3">
          <button onClick={onBack} className="px-6 py-3 rounded-xl text-xs font-bold bg-white text-slate-500 border border-slate-200 hover:text-slate-800 transition-colors">
            Back to Project
          </button>
          <button
            onClick={() => { alert('Estimation details successfully saved into localized system record.'); onBack(); }}
            className="px-8 py-3 rounded-xl text-xs font-bold text-white transition-all shadow-sm hover:opacity-95"
            style={{ background: '#1E3A8A' }}
          >
            Save Estimation
          </button>
        </div>

      </main>

      {/* AI Scan Modal */}
      {isAiEstimating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 text-center overflow-hidden relative">
            <div className="absolute -top-12 -left-12 w-32 h-32 rounded-full blur-2xl opacity-40 animate-pulse" style={{ background: hasFiles ? '#7C3AED' : '#1E3A8A' }}></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 rounded-full blur-2xl opacity-30 animate-pulse" style={{ background: hasFiles ? '#A78BFA' : '#3B82F6' }}></div>

            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-slate-50 border border-slate-200 relative z-10">
              <svg className="w-8 h-8 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
                style={{ color: hasFiles ? '#7C3AED' : '#1E3A8A' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L9 21zm0 0h-.01m-4.24-5.24A8.003 8.003 0 0112 4v12M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>

            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider relative z-10">AA2000 CONNECT</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5 relative z-10" style={{ color: hasFiles ? '#7C3AED' : '#1E3A8A' }}>
              {hasFiles ? 'Groq Vision Floor Plan Analysis' : 'AI Neural Estimation Scan'}
            </p>

            {hasFiles && (
              <div className="mt-3 relative z-10 flex flex-wrap gap-1.5 justify-center">
                {floorPlanPreviews.map((fp, idx) => (
                  <span key={idx} className="text-[9px] font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-600 border border-purple-100">
                    {fp.type === 'pdf' ? '📄' : '🖼️'} {fp.name.length > 20 ? fp.name.slice(0, 18) + '…' : fp.name}
                  </span>
                ))}
              </div>
            )}

            <div className="my-6 text-left space-y-2.5 bg-slate-50 border border-slate-200 rounded-2xl p-4 relative z-10">
              {AI_STEPS.map((stepText, idx) => {
                const isDone = aiStep > idx;
                const isCurrent = aiStep === idx;
                return (
                  <div key={idx} className="flex items-center gap-2.5 text-[11px]">
                    <span className="shrink-0 flex items-center justify-center">
                      {isDone ? (
                        <span className="text-emerald-500 font-bold">✓</span>
                      ) : isCurrent ? (
                        <span className="h-2 w-2 rounded-full animate-ping" style={{ background: hasFiles ? '#7C3AED' : '#1E3A8A' }} />
                      ) : (
                        <span className="h-2 w-2 rounded-full bg-slate-200" />
                      )}
                    </span>
                    <span className={`font-bold transition-colors ${isDone ? 'text-slate-400' : isCurrent ? 'text-slate-800' : 'text-slate-300'}`}>
                      {stepText}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden relative z-10">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${(aiStep / AI_STEPS.length) * 100}%`,
                  background: hasFiles ? '#7C3AED' : '#1E3A8A',
                }}
              />
            </div>

            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-4 relative z-10">
              {aiStep < AI_STEPS.length
                ? (hasFiles ? 'Groq Vision processing your floor plan...' : 'Processing Neural Model Data...')
                : 'Bill of quantities computed successfully'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
