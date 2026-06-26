import type { SurveyType } from '../../App';

interface Props {
  key: SurveyType;
  label: string;
  desc: string;
  icon: string;
  color: string;
  onClick: () => void;
}

export default function SurveyCard({ label, desc, icon, color, onClick }: Props) {
  return (
    <button
      onClick={onClick}
      className={`group relative bg-white rounded-2xl border-2 ${color} p-5 hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 text-left overflow-hidden`}
    >
      {/* Hover gradient overlay */}
      <div className={`absolute inset-0 bg-gradient-to-br from-current/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"`} style={{ borderColor: color.replace('border-', '') }} />
      
      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <span className="text-3xl group-hover:scale-110 transition-transform duration-300">{icon}</span>
          <div className="w-2 h-2 rounded-full bg-current opacity-50" />
        </div>
        <h3 className="font-bold text-base mb-1 text-gray-800 group-hover:text-current transition-colors duration-300">{label}</h3>
        <p className="text-sm text-gray-500 mt-1 group-hover:text-gray-600 transition-colors duration-300">{desc}</p>
      </div>
      
      {/* Decorative corner */}
      <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-current/10 to-transparent rounded-bl-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ color: color.replace('border-', '') }} />
    </button>
  );
}