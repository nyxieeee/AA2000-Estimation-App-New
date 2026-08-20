import { useState } from 'react';
import type { AIScanGroup } from '../../App';
import type { Project } from '../../App';
import type { FloorPlanEstimation } from '../../services/geminiFloorPlanService';
import type { EstimationManpowerEntry, EstimationConsumableEntry, EstimationAdditionalFeeEntry } from '../../types';
import FloorPlanView from '../floor-plan/FloorPlanView';
import TORComparisonView from '../ai-sidebar/TORComparisonView';
import AISidebar from '../ai-sidebar/AISidebar';

interface Props {
  projects?: Project[];
  onCreateProject?: (project: Project, keepOnHome?: boolean) => void;
  onSelectProject?: (project: Project) => void;
  onSaveAIScan?: (scan: AIScanGroup) => void;
  onNavigateToCreate?: () => void;
}

const TABS = [
  {
    key: 'manual',
    label: 'Manual Estimation',
    shortLabel: 'Manual',
    icon: (active: boolean) => (
      <svg className="w-4 h-4" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    ),
    color: '#2563EB',
    bg: '#EFF6FF',
    description: 'Step-by-step wizard to build a detailed BOQ manually by entering room counts, system types, and project specs.',
  },
  {
    key: 'floor-plan',
    label: 'Floor Plan AI',
    shortLabel: 'Floor Plan AI',
    icon: (active: boolean) => (
      <svg className="w-4 h-4" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h12A2.25 2.25 0 0 1 20.25 6v12A2.25 2.25 0 0 1 18 20.25H6A2.25 2.25 0 0 1 3.75 18V6ZM13.5 3.75v16.5M3.75 10.5h9.75" />
      </svg>
    ),
    color: '#2563EB',
    bg: '#EFF6FF',
    description: 'Upload floor plan images or PDFs (and optionally a TOR document). AI reads the layout and generates a complete BOQ.',
  },
  {
    key: 'document',
    label: 'Document AI Reader',
    shortLabel: 'Doc Reader',
    icon: (active: boolean) => (
      <svg className="w-4 h-4" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
      </svg>
    ),
    color: '#059669',
    bg: '#ECFDF5',
    description: 'Upload TOR and Technician Proposal documents. AI compares them and identifies gaps, omissions, and provides cost audit with recommendations.',
  },
];

export default function EstimationHub({ projects, onCreateProject, onSelectProject, onSaveAIScan, onNavigateToCreate }: Props) {
  const [activeTab, setActiveTab] = useState<'manual' | 'floor-plan' | 'document'>('manual');
  const [isFloorPlanScanning, setIsFloorPlanScanning] = useState(false);
  const [isDocScanning, setIsDocScanning] = useState(false);
  const [floorPlanStep, setFloorPlanStep] = useState<string>('');

  const isAnyScanning = isFloorPlanScanning || isDocScanning;
  const scanningLabel = isFloorPlanScanning
    ? 'Floor Plan AI'
    : isDocScanning
    ? 'Doc Reader AI'
    : '';
  const scanningDetail = isFloorPlanScanning
    ? floorPlanStep || 'Analyzing floor plan...'
    : isDocScanning
    ? 'Auditing documents and generating recommendations...'
    : '';

  const handleAddToProjectEstimation = (projectId: string, result: FloorPlanEstimation) => {
    const existing = localStorage.getItem(`aa2000_estimation_${projectId}`);
    const prev = existing ? JSON.parse(existing) : { manpower: [], consumables: [], fees: [], constraints: { physical: '', electrical: '', installation: '' } };

    const manpower: EstimationManpowerEntry[] = result.manpower.map(m => ({
      id: crypto.randomUUID(),
      role: m.role,
      headcount: m.headcount,
      hours: m.hours,
      manDays: m.manDays,
      dayRate: m.ratePerDay || 0,
      totalCost: m.totalCost || (m.ratePerDay ? m.ratePerDay * m.manDays : 0),
    }));

    const consumables: EstimationConsumableEntry[] = result.consumables.map(c => ({
      id: crypto.randomUUID(),
      name: c.name,
      brand: '',
      category: c.category,
      quantity: c.quantity,
      unit: c.unit || 'pcs',
      unitPrice: c.unitPrice || 0,
      totalPrice: (c.unitPrice || 0) * c.quantity,
      srp: c.srp,
      contractorPrice: c.contractorPrice,
      dealerPrice: c.dealerPrice,
    }));

    const fees: EstimationAdditionalFeeEntry[] = result.fees.map(f => ({
      id: crypto.randomUUID(),
      type: f.type as EstimationAdditionalFeeEntry['type'],
      amount: f.amount || 0,
      description: f.description,
    }));

    const aiBaseline = prev.aiBaseline || {
      manpower: [...manpower],
      consumables: [...consumables],
      fees: [...fees],
      constraints: result.constraints || { physical: '', electrical: '', installation: '' },
      createdAt: new Date().toISOString(),
    };

    const merged = {
      manpower: [...(prev.manpower || []), ...manpower],
      consumables: [...(prev.consumables || []), ...consumables],
      fees: [...(prev.fees || []), ...fees],
      constraints: result.constraints || prev.constraints || { physical: '', electrical: '', installation: '' },
      priceTier: prev.priceTier || 'srp',
      aiBaseline,
    };

    localStorage.setItem(`aa2000_estimation_${projectId}`, JSON.stringify(merged));
    localStorage.setItem(`aa2000_ai_baseline_${projectId}`, JSON.stringify(aiBaseline));
    const toastEvent = new CustomEvent('toast', {
      detail: { type: 'success', message: 'BOQ added to project estimation!' },
    });
    window.dispatchEvent(toastEvent);
  };

  const activeTabDef = TABS.find(t => t.key === activeTab)!;

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="px-6 pt-5 pb-0 shrink-0 border-b border-slate-200">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1E3A8A, #2563EB)' }}>
                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456Z" />
                </svg>
              </div>
              <div>
                <h1 className="text-base font-black text-slate-900">Estimation Hub</h1>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">3 Methods · Manual · AI Floor Plan · AI Document</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-200 text-[10px] font-bold text-slate-500">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
            AI-Powered
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1">
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className="flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all border-b-2 -mb-px"
                style={active
                  ? { color: tab.color, borderColor: tab.color }
                  : { color: '#94A3B8', borderColor: 'transparent' }
                }
              >
                <span style={{ color: active ? tab.color : '#CBD5E1' }}>{tab.icon(active)}</span>
                {tab.shortLabel}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab description strip */}
      <div
        className="px-6 py-2.5 shrink-0 flex items-center gap-2.5 border-b border-slate-100 text-xs transition-all"
        style={{ background: activeTabDef.bg }}
      >
        <span style={{ color: activeTabDef.color }}>{activeTabDef.icon(true)}</span>
        <p className="font-medium" style={{ color: activeTabDef.color }}>{activeTabDef.description}</p>
        {activeTab === 'manual' && onNavigateToCreate && (
          <button
            onClick={onNavigateToCreate}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold text-white transition-all shrink-0"
            style={{ background: activeTabDef.color }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Start Manual Estimation
          </button>
        )}
      </div>

      {/* Tab content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {/* Manual tab — shows an informational landing + launch button */}
        {activeTab === 'manual' && (
          <div className="h-full overflow-y-auto px-6 py-8">
            <div className="max-w-2xl mx-auto space-y-5">
              <div className="grid grid-cols-3 gap-4">
                {[
                  { step: '1', title: 'Project Details', desc: 'Enter building type, location, floors, and assign technicians.' },
                  { step: '2', title: 'System Selection', desc: 'Choose which security systems to include in the estimation.' },
                  { step: '3', title: 'Generate BOQ', desc: 'Review and export the complete Bill of Quantities.' },
                ].map(s => (
                  <div key={s.step} className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <div className="w-7 h-7 rounded-full bg-blue-600 text-white text-xs font-black flex items-center justify-center mb-3">{s.step}</div>
                    <p className="text-xs font-bold text-blue-900 mb-1">{s.title}</p>
                    <p className="text-[11px] text-blue-700 leading-relaxed">{s.desc}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <h3 className="text-xs font-bold text-slate-700 mb-2 uppercase tracking-wider">When to use Manual Estimation</h3>
                <ul className="space-y-1.5">
                  {[
                    'You have a site survey report with room-by-room breakdowns',
                    'Client has provided verbal requirements without floor plans',
                    'You need full control over quantities and specifications',
                    'Verifying or adjusting AI-generated estimates',
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-[11px] text-slate-600">
                      <svg className="w-3.5 h-3.5 text-blue-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {onNavigateToCreate && (
                <button
                  onClick={onNavigateToCreate}
                  className="w-full py-4 rounded-2xl text-sm font-bold text-white transition-all"
                  style={{ background: 'linear-gradient(135deg, #2563EB, #1D4ED8)', boxShadow: '0 4px 16px rgba(37,99,235,0.3)' }}
                >
                  <svg className="w-4 h-4 inline mr-2 -mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                  Start Manual Estimation Wizard
                </button>
              )}
            </div>
          </div>
        )}

        {/* Floor Plan AI tab */}
        {activeTab === 'floor-plan' && (
          <div className="h-full overflow-hidden">
            <FloorPlanView
              projects={projects}
              onAddToProjectEstimation={handleAddToProjectEstimation}
              onScanningChange={(scanning, step) => {
                setIsFloorPlanScanning(scanning);
                if (step) setFloorPlanStep(step);
                else setFloorPlanStep('');
              }}
            />
          </div>
        )}

        {/* Document AI tab - Use TORComparisonView for structured TOR vs Proposal comparison */}
        {activeTab === 'document' && (
          <div className="h-full overflow-hidden">
            <TORComparisonView
              onSaveAIScan={onSaveAIScan}
              onScanningChange={setIsDocScanning}
            />
          </div>
        )}
      </div>


    </div>
  );
}
