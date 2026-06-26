import { useState, useEffect, useRef } from 'react';

interface Notification {
  id: string;
  title: string;
  companyName: string;
  date: string;
  read: boolean;
  type: 'ongoing' | 'upcoming' | 'missing' | 'approval' | 'finalize';
}

interface Props {
  notifications: Notification[];
  onViewAll: (type: string) => void;
}

const typeConfig = {
  ongoing: { color: '#2563EB', bg: 'rgba(37,99,235,0.08)', label: 'Ongoing', dot: '#2563EB' },
  upcoming: { color: '#059669', bg: 'rgba(5,150,105,0.08)', label: 'Upcoming', dot: '#059669' },
  missing: { color: '#D97706', bg: 'rgba(217,119,6,0.08)', label: 'Missing', dot: '#D97706' },
  approval: { color: '#7C3AED', bg: 'rgba(124,58,237,0.08)', label: 'Approval', dot: '#7C3AED' },
  finalize: { color: '#059669', bg: 'rgba(5,150,105,0.08)', label: 'Finalize', dot: '#059669' },
};

export default function NotificationBell({ notifications, onViewAll }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const unread = notifications.filter(n => !n.read).length;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-500"
        title="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unread > 0 && (
          <span
            className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 text-[9px] font-black rounded-full flex items-center justify-center px-1 text-white bg-red-600 shadow-sm"
          >
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-11 z-50 w-80 rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden"
        >
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-800">Notifications</h3>
            <span
              className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-red-50 text-red-500"
            >
              {unread} unread
            </span>
          </div>

          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-10 text-center text-xs text-slate-400 font-bold">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 6).map(n => {
                const cfg = typeConfig[n.type] || typeConfig.ongoing;
                return (
                  <div
                    key={n.id}
                    onClick={() => { setOpen(false); onViewAll(n.type); }}
                    className="px-4 py-3 cursor-pointer transition-colors flex items-start gap-3 border-b border-slate-50 hover:bg-slate-50"
                    style={{ background: !n.read ? 'rgba(30,58,138,0.02)' : 'transparent' }}
                  >
                    <div
                      className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                      style={{ background: !n.read ? cfg.dot : '#CBD5E1' }}
                    />
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs truncate ${!n.read ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
                        {n.title}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className="text-[8px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          {cfg.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-semibold">
                          {n.companyName} · {n.date}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="p-2 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => { setOpen(false); onViewAll('notifications'); }}
              className="w-full py-2 text-xs font-bold text-[#1E3A8A] hover:bg-white rounded-xl transition-all"
            >
              View All Notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export type { Notification };
