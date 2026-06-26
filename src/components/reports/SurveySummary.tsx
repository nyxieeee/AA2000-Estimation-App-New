import type { Project } from '../../App';

interface Props {
  project: Project;
  onBack: () => void;
}

export default function SurveySummary({ project, onBack }: Props) {
  const surveys = JSON.parse(localStorage.getItem('aa2000_surveys') || '[]')
    .filter((s: any) => s.projectId === project.id);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <header className="bg-white/80 backdrop-blur-sm border-b border-slate-200/50 px-6 py-4 shadow-sm">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-500 hover:text-blue-600 font-medium transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <span className="font-bold text-sm">Survey Summary</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 p-6">
          <h1 className="text-2xl font-black tracking-tight">{project.name}</h1>
          <p className="text-slate-500 text-sm mt-1">{project.clientName} &middot; {project.location}</p>
        </div>

        {surveys.length === 0 ? (
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-200/60 p-12 text-center">
            <p className="text-slate-400 font-semibold">No surveys completed yet for this project.</p>
          </div>
        ) : (
          surveys.map((survey: any) => (
            <div key={survey.id} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-md shadow-slate-200/30 border border-slate-200/60 p-6">
              <div className="flex items-center gap-3 mb-4">
                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase">{survey.type}</span>
                <span className="text-xs text-slate-400">{survey.status}</span>
                <span className="text-xs text-slate-400">{new Date(survey.createdAt).toLocaleDateString()}</span>
              </div>
              {survey.data && Object.keys(survey.data).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {Object.entries(survey.data).filter(([_, v]) => v !== '' && v !== 0 && v !== false && v !== null && v !== undefined).map(([key, value]) => (
                    <div key={key} className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{key}</span>
                      <p className="text-sm font-semibold text-slate-800 mt-1">{String(value)}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-sm">No data recorded.</p>
              )}
            </div>
          ))
        )}
      </main>
    </div>
  );
}
