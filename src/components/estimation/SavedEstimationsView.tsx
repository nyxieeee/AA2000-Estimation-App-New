import { useState, useEffect, useCallback } from 'react';
import type { Project } from '../../App';
import { useToast } from '../utils/Toast';
import { exportBOQPdf } from '../../utils/pdfExporter';

interface SavedEstimation {
  key: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  manpower: { role: string; headcount: number; hours: number; dayRate: number; totalCost: number; manDays: number }[];
  consumables: { name: string; category: string; quantity: number; unit?: string; unitPrice: number; totalPrice: number }[];
  fees: { type: string; amount: number; description: string }[];
  constraints: { physical: string; electrical: string; installation: string };
  priceTier: 'srp' | 'contractorPrice' | 'dealerPrice';
}

function loadEstimations(projects: Project[], statusFilter?: string[]): SavedEstimation[] {
  const out: SavedEstimation[] = [];
  const projectMap = new Map(projects.map(p => [p.id, p]));

  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key?.startsWith('aa2000_estimation_')) continue;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const data = JSON.parse(raw);
      const projectId = key.replace('aa2000_estimation_', '');
      const project = projectMap.get(projectId);
      const projectStatus = project?.status || 'Unknown';
      if (statusFilter && !statusFilter.includes(projectStatus)) continue;
      out.push({
        key,
        projectId,
        projectName: project?.name || `Project ${projectId.slice(0, 8)}`,
        projectStatus,
        ...data,
      });
    } catch { /* skip corrupt */ }
  }
  return out.sort((a, b) => a.projectName.localeCompare(b.projectName));
}

const TIER_LABELS: Record<string, string> = {
  srp: 'SRP',
  contractorPrice: 'Contractor Price',
  dealerPrice: 'Dealer Price',
};

const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  'Completed': { color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  'Finalized - Approved': { color: '#059669', bg: 'rgba(5,150,105,0.08)' },
  'Finalized': { color: '#CA8A04', bg: 'rgba(202,138,4,0.08)' },
  'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
  'Pending': { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
};

function totalManpower(est: SavedEstimation): number {
  return est.manpower?.reduce((s, m) => s + (m.totalCost || 0), 0) ?? 0;
}
function totalConsumables(est: SavedEstimation): number {
  return est.consumables?.reduce((s, c) => s + (c.totalPrice || 0), 0) ?? 0;
}
function totalFees(est: SavedEstimation): number {
  return est.fees?.reduce((s, f) => s + (f.amount || 0), 0) ?? 0;
}
function grandTotal(est: SavedEstimation): number {
  return totalManpower(est) + totalConsumables(est) + totalFees(est);
}

const ARCHIVE_STATUSES = ['Completed', 'Finalized - Approved', 'Finalized - Rejected'];

export default function SavedEstimationsView({
  projects,
  statusFilter,
  onDeleteProject,
}: {
  projects: Project[];
  statusFilter?: string[];
  onDeleteProject?: (projectId: string) => void;
}) {
  const { toast, confirm } = useToast();
  const [estimations, setEstimations] = useState<SavedEstimation[]>([]);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reuseKey, setReuseKey] = useState<string | null>(null);
  const [reuseProjectId, setReuseProjectId] = useState<string>('');

  const refresh = useCallback(() => setEstimations(loadEstimations(projects, statusFilter)), [projects, statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = searchQuery
    ? estimations.filter(e =>
        e.projectName.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : estimations;

  const handleDelete = async (est: SavedEstimation) => {
    const ok = await confirm(`Delete saved estimation and project "${est.projectName}"? This cannot be undone.`);
    if (!ok) return;
    localStorage.removeItem(est.key);
    if (onDeleteProject) {
      onDeleteProject(est.projectId);
    }
    refresh();
    toast.success(`Estimation and project "${est.projectName}" deleted.`);
    if (expandedKey === est.key) setExpandedKey(null);
  };

  const handleReuse = (est: SavedEstimation) => {
    if (!reuseProjectId) return;
    const key = `aa2000_estimation_${reuseProjectId}`;
    const existing = localStorage.getItem(key);
    const existingData = existing ? JSON.parse(existing) : {};
    const merged = {
      manpower: est.manpower || [],
      consumables: est.consumables || [],
      fees: est.fees || [],
      constraints: est.constraints || { physical: '', electrical: '', installation: '' },
      priceTier: est.priceTier || 'srp',
      ...(existingData.priceTier ? { priceTier: existingData.priceTier } : {}),
    };
    localStorage.setItem(key, JSON.stringify(merged));
    const project = projects.find(p => p.id === reuseProjectId);
    toast.success(`Estimation copied to "${project?.name || reuseProjectId}"`);
    setReuseKey(null);
    setReuseProjectId('');
  };

  if (estimations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
          <svg className="w-8 h-8 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
          </svg>
        </div>
        <h3 className="text-sm font-black text-slate-800 mb-1">No Saved Estimations Yet</h3>
        <p className="text-xs text-slate-400 leading-relaxed max-w-xs">
          Complete a project estimation and click <strong>Save Estimation</strong> to store it here for future reference.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">History / Archive</h2>
          <p className="text-[11px] text-slate-400 mt-0.5">{filtered.length} saved estimation{filtered.length !== 1 ? 's' : ''}</p>
        </div>
        {estimations.length > 0 && (
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search estimates..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-56 pl-9 pr-3 py-2 rounded-xl text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700 outline-none focus:bg-white transition-all"
            />
          </div>
        )}
      </div>

      {filtered.length === 0 && searchQuery && (
        <div className="text-center py-16">
          <p className="text-xs font-bold text-slate-400">No estimates match "{searchQuery}"</p>
        </div>
      )}

      {filtered.map(est => {
        const isOpen = expandedKey === est.key;
        const statusStyle = STATUS_COLORS[est.projectStatus] ?? { color: '#64748B', bg: 'rgba(100,116,139,0.08)' };
        const gt = grandTotal(est);
        const hasPrice = gt > 0;

        return (
          <div key={est.key} className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
            {/* Card Header */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="shrink-0 w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-slate-800 truncate">{est.projectName}</p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ color: statusStyle.color, background: statusStyle.bg }}>
                    {est.projectStatus}
                  </span>
                  {est.priceTier && (
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500">
                      {TIER_LABELS[est.priceTier] ?? est.priceTier}
                    </span>
                  )}
                  {hasPrice && (
                    <span className="text-[9px] font-bold text-emerald-600">
                      &#8369;{gt.toLocaleString('en-PH', { minimumFractionDigits: 2 })} total
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={async () => {
                    toast.info('Generating PDF...');
                    try {
                      await exportBOQPdf({
                        title: `Project Estimation - ${est.projectName}`,
                        projectName: est.projectName,
                        manpower: est.manpower || [],
                        consumables: est.consumables || [],
                        fees: est.fees || [],
                        constraints: est.constraints,
                      });
                      toast.success('PDF downloaded!');
                    } catch {
                      toast.error('Failed to generate PDF.');
                    }
                  }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-all flex items-center gap-1"
                  title="Export PDF"
                >
                  <svg className="w-3.5 h-3.5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  PDF
                </button>
                <button
                  onClick={() => { setReuseKey(reuseKey === est.key ? null : est.key); setReuseProjectId(''); }}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold border border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50 transition-all flex items-center gap-1"
                  title="Reuse this estimation"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  Reuse
                </button>
                <button
                  onClick={() => setExpandedKey(isOpen ? null : est.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all"
                  style={isOpen
                    ? { background: '#1E3A8A', color: '#fff', borderColor: '#1E3A8A' }
                    : { background: '#F8FAFC', color: '#475569', borderColor: '#E2E8F0' }}
                >
                  {isOpen ? 'Close' : 'View'}
                </button>
                <button
                  onClick={() => handleDelete(est)}
                  className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Reuse panel */}
            {reuseKey === est.key && (
              <div className="border-t border-emerald-100 px-5 py-4 bg-emerald-50 space-y-3">
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
                  </svg>
                  <span className="text-xs font-bold text-emerald-800">Copy this estimation to a project</span>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={reuseProjectId}
                    onChange={e => setReuseProjectId(e.target.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-xs font-medium border border-emerald-200 bg-white text-slate-700 outline-none focus:border-emerald-400 transition-colors"
                  >
                    <option value="">Select a project...</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name} — {p.clientName}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleReuse(est)}
                    disabled={!reuseProjectId}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white transition-all disabled:opacity-40"
                    style={{ background: !reuseProjectId ? '#94A3B8' : 'linear-gradient(135deg, #059669, #047857)', boxShadow: !reuseProjectId ? 'none' : '0 4px 12px rgba(5,150,105,0.3)' }}
                  >
                    Copy to Project
                  </button>
                </div>
              </div>
            )}

            {/* Expandable Detail */}
            {isOpen && (
              <div className="border-t border-slate-100 px-5 pb-5 pt-4 space-y-4 bg-slate-50/50">

                {/* Summary totals */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Manpower', value: totalManpower(est), color: '#2563EB' },
                    { label: 'Materials', value: totalConsumables(est), color: '#7C3AED' },
                    { label: 'Fees', value: totalFees(est), color: '#D97706' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="rounded-xl bg-white border border-slate-200 px-4 py-3 text-center">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</p>
                      <p className="text-sm font-black" style={{ color }}>
                        {value > 0 ? `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 0 })}` : '—'}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Manpower */}
                {est.manpower?.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Manpower</span>
                    </div>
                    <table className="w-full text-xs">
                      <thead><tr className="border-b border-slate-100">
                        <th className="px-4 py-2 text-left font-bold text-slate-500">Role</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-500">HC</th>
                        <th className="px-4 py-2 text-right font-bold text-slate-500">Man-Days</th>
                        {est.manpower.some(m => m.totalCost > 0) && <th className="px-4 py-2 text-right font-bold text-slate-500">Cost</th>}
                      </tr></thead>
                      <tbody>
                        {est.manpower.map((m, i) => (
                          <tr key={i} className="border-b border-slate-50">
                            <td className="px-4 py-2 font-semibold text-slate-800">{m.role}</td>
                            <td className="px-4 py-2 text-right text-slate-600">{m.headcount}</td>
                            <td className="px-4 py-2 text-right font-bold text-blue-700">{m.manDays}</td>
                            {est.manpower.some(mp => mp.totalCost > 0) && (
                              <td className="px-4 py-2 text-right font-bold text-slate-700">
                                {m.totalCost > 0 ? `₱${m.totalCost.toLocaleString('en-PH')}` : '—'}
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Consumables */}
                {est.consumables?.length > 0 && (
                  <div className="rounded-xl border border-slate-200 overflow-hidden bg-white">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Bill of Materials</span>
                      <span className="text-[9px] text-slate-400">{est.consumables.length} items</span>
                    </div>
                    <div className="max-h-56 overflow-y-auto">
                      <table className="w-full text-xs">
                        <thead className="sticky top-0 bg-slate-50"><tr className="border-b border-slate-100">
                          <th className="px-4 py-2 text-left font-bold text-slate-500">Item</th>
                          <th className="px-4 py-2 text-right font-bold text-slate-500">Qty</th>
                          {est.consumables.some(c => c.unitPrice > 0) && (
                            <th className="px-4 py-2 text-right font-bold text-slate-500">Total</th>
                          )}
                        </tr></thead>
                        <tbody>
                          {est.consumables.map((c, i) => (
                            <tr key={i} className={`border-b border-slate-50 ${i % 2 ? 'bg-slate-50/50' : ''}`}>
                              <td className="px-4 py-2 font-semibold text-slate-800">{c.name}</td>
                              <td className="px-4 py-2 text-right font-bold text-slate-800">{c.quantity} {c.unit || ''}</td>
                              {est.consumables.some(cc => cc.unitPrice > 0) && (
                                <td className="px-4 py-2 text-right font-bold text-slate-700">
                                  {c.totalPrice > 0 ? `₱${c.totalPrice.toLocaleString('en-PH')}` : '—'}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Additional Fees */}
                {est.fees?.filter(f => f.amount > 0).length > 0 && (
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Additional Fees</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {est.fees.filter(f => f.amount > 0).map((f, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-slate-800">{f.type}</p>
                            {f.description && <p className="text-[10px] text-slate-400">{f.description}</p>}
                          </div>
                          <span className="text-xs font-black text-slate-700">&#8369;{f.amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Constraints */}
                {est.constraints && (est.constraints.physical || est.constraints.electrical || est.constraints.installation) && (
                  <div className="rounded-xl border border-slate-200 bg-white">
                    <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Installation Notes</span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                      {[
                        { label: 'Physical', value: est.constraints.physical },
                        { label: 'Electrical', value: est.constraints.electrical },
                        { label: 'Installation', value: est.constraints.installation },
                      ].filter(c => c.value).map(({ label, value }) => (
                        <div key={label}>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
                          <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Exported count helper for sidebar badge */
export function getSavedEstimationCount(): number {
  let count = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith('aa2000_estimation_')) count++;
  }
  return count;
}
