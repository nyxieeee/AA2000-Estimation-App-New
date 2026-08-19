interface Props {
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
      className={'bg-white/90 backdrop-blur-sm rounded-2xl border-2 ' + color + ' p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-200 text-left'}
    >
      <span className="text-3xl block mb-2">{icon}</span>
      <h3 className="font-bold text-sm text-slate-800">{label}</h3>
      <p className="text-xs text-slate-500 mt-0.5">{desc}</p>
    </button>
  );
}