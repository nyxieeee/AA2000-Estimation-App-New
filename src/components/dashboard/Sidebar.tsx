import React from 'react';
import type { User } from '../../App';
import type { Notification } from '../notifications/NotificationBell';

type View =
  | 'home' | 'dashboard' | 'workspace' | 'create-survey'
  | 'todo' | 'assignment' | 'missing' | 'done' | 'history'
  | 'approval' | 'finalize'
  | 'ongoing' | 'upcoming' | 'missing-notif' | 'approval-notif' | 'finalize-notif'
  | 'notifications';

interface Props {
  user: User;
  currentView: View;
  onNavigate: (view: View) => void;
  notifications?: Notification[];
}

const navIcons: Record<string, React.ReactNode> = {
  home: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
    </svg>
  ),
  dashboard: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H6a2 2 0 01-2-2v-4zM14 16a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2v-4z" />
    </svg>
  ),
  workspace: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  'create-survey': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
    </svg>
  ),
  assignment: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  ),
  missing: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
    </svg>
  ),
  done: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  history: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  approval: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  finalize: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  ongoing: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  upcoming: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  'missing-notif': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
  'approval-notif': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  'finalize-notif': (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  notifications: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
    </svg>
  ),
};

export default function Sidebar({ user, currentView, onNavigate, notifications }: Props) {
  const isAdmin = user.role === 'ADMIN';

  const getUnreadCount = (viewName: View) => {
    if (!notifications) return 0;
    if (viewName === 'notifications') {
      return notifications.filter(n => !n.read).length;
    }
    const viewToNotifType: Record<string, string> = {
      ongoing: 'ongoing',
      upcoming: 'upcoming',
      'missing-notif': 'missing',
      'approval-notif': 'approval',
      'finalize-notif': 'finalize',
    };
    const notifType = viewToNotifType[viewName];
    if (!notifType) return 0;
    return notifications.filter(n => n.type === notifType && !n.read).length;
  };

  const getNotificationCount = (viewName: View) => {
    if (!notifications) return 0;
    if (viewName === 'notifications') {
      return notifications.length;
    }
    const viewToNotifType: Record<string, string> = {
      ongoing: 'ongoing',
      upcoming: 'upcoming',
      'missing-notif': 'missing',
      'approval-notif': 'approval',
      'finalize-notif': 'finalize',
    };
    const notifType = viewToNotifType[viewName];
    if (!notifType) return 0;
    return notifications.filter(n => n.type === notifType).length;
  };

  const isNotificationView = [
    'notifications',
    'ongoing',
    'upcoming',
    'missing-notif',
    'approval-notif',
    'finalize-notif'
  ].includes(currentView);

  const navGroups: { label: string; items: { label: string; view: View; accent?: string }[] }[] = isNotificationView ? [
    {
      label: 'NOTIFICATION',
      items: [
        { view: 'notifications', label: 'All Notification', accent: '#1E3A8A' },
        { view: 'ongoing', label: 'Ongoing Surveys', accent: '#2563EB' },
        { view: 'upcoming', label: 'Upcoming Surveys', accent: '#10B981' },
        { view: 'missing-notif', label: 'Missing Alerts', accent: '#F59E0B' },
        ...((isAdmin || user.role === 'TECHNICIAN' || user.role === 'SALES')
          ? [
              { view: 'approval-notif' as View, label: 'Approval Alerts', accent: '#4F46E5' },
              { view: 'finalize-notif' as View, label: 'Finalize Alerts', accent: '#10B981' },
            ]
          : []),
      ],
    },
  ] : [
    {
      label: 'SURVEYS',
      items: [
        { view: 'home', label: 'Home' },
        { view: 'dashboard', label: 'Dashboard' },
        { view: 'workspace', label: 'Workspace' },
        { view: 'assignment', label: 'All Projects', accent: '#2563EB' },
        { view: 'missing', label: 'Missing Specs', accent: '#F59E0B' },
      ],
    },
    {
      label: 'WORKFLOW',
      items: [
        ...((isAdmin || user.role === 'TECHNICIAN' || user.role === 'SALES')
          ? [
              { view: 'approval' as View, label: 'Approval Pipeline', accent: '#4F46E5' },
              { view: 'finalize' as View, label: 'Finalize Review', accent: '#10B981' },
            ]
          : [{ view: 'done' as View, label: 'Completed Surveys', accent: '#10B981' }]),
        { view: 'history', label: 'History Archive', accent: '#64748B' },
      ],
    },
  ];


  const initials = (user.fullName || user.email || 'Admin User').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  return (
    <aside
      className="w-60 flex flex-col h-full shrink-0 overflow-hidden"
      style={{ background: '#EEF2FF', borderRight: '1px solid #E5E7EB' }}
    >
      {/* Brand Logo or Back button - depending on mode */}
      <div className="px-5 h-16 flex items-center" style={{ borderBottom: '1px solid #E5E7EB' }}>
        {isNotificationView ? (
          <button
            onClick={() => onNavigate('home')}
            className="w-full h-full flex items-center gap-2.5 text-[#64748B] hover:text-[#1E3A8A] transition-colors font-bold text-xs"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        ) : (
          <div
            className="w-full h-full flex items-center gap-2.5 cursor-pointer hover:opacity-85 transition-opacity"
            onClick={() => onNavigate('home')}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-black text-sm shrink-0"
              style={{ background: '#1E3A8A' }}
            >
              A
            </div>
            <div>
              <span className="text-sm font-black tracking-tight" style={{ color: '#1E3A8A' }}>AA2000</span>
              <p className="text-[9px] font-bold tracking-widest text-[#94A3B8]" style={{ marginTop: '-2px' }}>CONNECT</p>
            </div>
          </div>
        )}
      </div>

      {/* User profile */}
      <div className="px-4 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: '#1E3A8A', color: '#fff' }}
            >
              {initials}
            </div>
            <div
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: '#10B981', borderColor: '#FFFFFF' }}
            />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold truncate" style={{ color: '#1E293B' }}>{user.fullName || user.email}</p>
            <p className="text-[10px]" style={{ color: '#64748B' }}>
              {user.role === 'ADMIN' ? 'Administrator' : user.role === 'SALES' ? 'Sales Representative' : 'Technician'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {navGroups.map(group => (
          <div key={group.label}>
            <p
              className="px-2.5 mb-2 text-[9px] font-bold uppercase tracking-widest text-[#94A3B8]"
            >
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(item => {
                const active = currentView === item.view;
                return (
                  <button
                    key={item.view}
                    onClick={() => onNavigate(item.view)}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-150 text-left relative"
                    style={
                      active
                        ? {
                            background: 'rgba(30,58,138,0.06)',
                            color: '#1E3A8A',
                            border: '1px solid rgba(30,58,138,0.1)',
                          }
                        : {
                            color: '#64748B',
                            border: '1px solid transparent',
                          }
                    }
                    onMouseEnter={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = '#F8FAFC';
                        (e.currentTarget as HTMLElement).style.color = '#1E293B';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        (e.currentTarget as HTMLElement).style.background = 'transparent';
                        (e.currentTarget as HTMLElement).style.color = '#64748B';
                      }
                    }}
                  >
                    <span
                      className="shrink-0"
                      style={{ color: active ? '#1E3A8A' : '#94A3B8' }}
                    >
                      {navIcons[item.view]}
                    </span>
                    {item.label}
                    {(() => {
                       const isNotifItem = [
                         'notifications',
                         'ongoing',
                         'upcoming',
                         'missing-notif',
                         'approval-notif',
                         'finalize-notif'
                       ].includes(item.view);

                       const count = isNotifItem ? getNotificationCount(item.view) : getUnreadCount(item.view);
                       if (isNotifItem || count > 0) {
                         return (
                           <span
                             className="ml-auto px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider transition-all duration-200"
                             style={{
                               background: item.accent ? `${item.accent}15` : 'rgba(30,58,138,0.08)',
                               color: item.accent || '#1E3A8A',
                             }}
                           >
                             {count}
                           </span>
                         );
                       }
                       return null;
                     })()}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>


    </aside>
  );
}

export type { View };
