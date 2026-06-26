import React from 'react';
import type { User, Project, SurveyType } from '../../App';

const SURVEY_TYPES: {
  key: SurveyType;
  label: string;
  desc: string;
  gradient: string;
  glow: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'CCTV',
    label: 'CCTV',
    desc: 'Camera surveillance systems',
    gradient: 'linear-gradient(135deg, #1E3A8A, #3B82F6)',
    glow: 'rgba(59,130,246,0.15)',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" />
      </svg>
    ),
  },
  {
    key: 'FIRE_ALARM',
    label: 'Fire Alarm',
    desc: 'Detection & alarm systems',
    gradient: 'linear-gradient(135deg, #B91C1C, #EF4444)',
    glow: 'rgba(239,68,68,0.15)',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
      </svg>
    ),
  },
  {
    key: 'FIRE_PROTECTION',
    label: 'Fire Protection',
    desc: 'Suppression & sprinkler systems',
    gradient: 'linear-gradient(135deg, #D97706, #F59E0B)',
    glow: 'rgba(245,158,11,0.15)',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18a3.75 3.75 0 00.495-7.467 5.99 5.99 0 00-1.925 3.546 5.974 5.974 0 01-2.133-1A3.75 3.75 0 0012 18z" />
      </svg>
    ),
  },
  {
    key: 'ACCESS_CONTROL',
    label: 'Access Control',
    desc: 'Door security & biometrics',
    gradient: 'linear-gradient(135deg, #047857, #10B981)',
    glow: 'rgba(16,185,129,0.15)',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
      </svg>
    ),
  },
  {
    key: 'BURGLAR_ALARM',
    label: 'Burglar Alarm',
    desc: 'Perimeter intrusion detection',
    gradient: 'linear-gradient(135deg, #6D28D9, #8B5CF6)',
    glow: 'rgba(139,92,246,0.15)',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    key: 'OTHER',
    label: 'Other Systems',
    desc: 'Turnstiles, barriers & more',
    gradient: 'linear-gradient(135deg, #334155, #64748B)',
    glow: 'rgba(100,116,139,0.15)',
    icon: (
      <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { color: string; bg: string }> = {
    'In Progress': { color: '#2563EB', bg: 'rgba(37,99,235,0.08)' },
    'Pending': { color: '#D97706', bg: 'rgba(217,119,6,0.08)' },
    'Completed': { color: '#059669', bg: 'rgba(5,150,105,0.08)' },
    'Finalized': { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)' },
  };
  const cfg = Object.entries(configs).find(([key]) => status && status.includes(key))?.[1] || { color: '#64748B', bg: 'rgba(100,116,139,0.08)' };
  return (
    <span
      className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide"
      style={{ color: cfg.color, background: cfg.bg }}
    >
      {status}
    </span>
  );
}

interface Props {
  user: User;
  project: Project;
  onBack: () => void;
  onStartSurvey: (type: SurveyType) => void;
  onViewEstimation: () => void;
}

export default function ProjectDetail({ user: _user, project, onBack, onStartSurvey, onViewEstimation }: Props) {
  return (
    <div className="min-h-screen pb-12" style={{ background: '#F4F6FA' }}>
      {/* Header */}
      <header
        className="px-6 py-4 bg-white"
        style={{
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </button>
          <div className="flex items-center gap-3">
            <StatusBadge status={project.status} />
            <span className="text-[10px] font-bold text-slate-400 font-mono">ID: {project.id}</span>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Hero card */}
        <div
          className="rounded-3xl p-6 mb-8 bg-white border border-slate-100 shadow-sm relative overflow-hidden"
        >
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <h1 className="text-xl font-black text-[#0F172A]">{project.name}</h1>
              <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{project.clientName}</p>

              <div className="flex flex-wrap items-center gap-6 mt-6">
                {/* Location */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100 text-[#1E3A8A]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Location</p>
                    <p className="text-xs font-semibold text-slate-600">{project.location}</p>
                  </div>
                </div>

                {/* Building type */}
                {project.buildingType && (
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100 text-[#1E3A8A]"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Building</p>
                      <p className="text-xs font-semibold text-slate-600">{project.buildingType} · {project.floors} floor(s)</p>
                    </div>
                  </div>
                )}

                {/* Start date */}
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-50 border border-slate-100 text-[#1E3A8A]"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Start Date</p>
                    <p className="text-xs font-semibold text-slate-600">{project.startDate || 'Not set'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* View Estimation CTA directly on Card */}
            <div>
              <button
                onClick={onViewEstimation}
                className="flex items-center gap-2 px-6 py-3.5 rounded-2xl font-bold text-xs text-white shadow-sm hover:opacity-95 transition-all shrink-0"
                style={{ background: '#1E3A8A' }}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                VIEW COST ESTIMATION
              </button>
            </div>
          </div>
        </div>

        {/* Survey Types Select */}
        <section className="mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wide">Select Security Survey Category</h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500"
            >
              6 categories
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {SURVEY_TYPES.map(st => (
              <button
                key={st.key}
                onClick={() => onStartSurvey(st.key)}
                className="group text-left p-6 rounded-3xl bg-white border border-slate-200 transition-all duration-200 hover:shadow-md hover:border-slate-300 relative overflow-hidden"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-white"
                  style={{ background: st.gradient, boxShadow: `0 4px 12px ${st.glow}` }}
                >
                  {st.icon}
                </div>
                <p className="text-xs font-black text-slate-800 mb-1 uppercase tracking-tight">{st.label}</p>
                <p className="text-[11px] leading-relaxed text-slate-400 font-semibold">{st.desc}</p>

                {/* Arrow indicator */}
                <div
                  className="absolute top-6 right-6 opacity-0 group-hover:opacity-100 transition-all duration-150 text-[#1E3A8A]"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}