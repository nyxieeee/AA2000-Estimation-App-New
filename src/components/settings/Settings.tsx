import React, { useState } from 'react';
import type { User } from '../../App';
import { GEMINI_KEY_STORAGE, testGeminiConnection } from '../../services/geminiFloorPlanService';

interface Props {
  user: User;
  onBack: () => void;
  onLogout?: () => void;
}

type SettingsTab = 'account' | 'position' | 'userid' | 'privacy' | 'help' | 'accessibility' | 'ai-config';

const tabs: { key: SettingsTab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'account',
    label: 'Account Info',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
      </svg>
    ),
  },
  {
    key: 'position',
    label: 'Position in Company',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21" />
      </svg>
    ),
  },
  {
    key: 'userid',
    label: 'User ID Reference',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
      </svg>
    ),
  },
  {
    key: 'privacy',
    label: 'Settings & Privacy',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
      </svg>
    ),
  },
  {
    key: 'help',
    label: 'Help & Support',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
      </svg>
    ),
  },
  {
    key: 'accessibility',
    label: 'Display & Layout',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'ai-config',
    label: 'AI Configuration',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L9 21zm0 0h-.01m-4.24-5.24A8.003 8.003 0 0112 4v12M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

function Toggle({ defaultOn = false }: { defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn);
  return (
    <button
      type="button"
      onClick={() => setOn(!on)}
      className="w-11 h-6 rounded-full p-0.5 transition-all duration-300 relative bg-[#E2E8F0]"
      style={{
        background: on ? '#1E3A8A' : '#E2E8F0',
      }}
    >
      <div
        className="w-5 h-5 rounded-full transition-all duration-300 bg-white"
        style={{
          transform: on ? 'translateX(20px)' : 'translateX(0)',
          boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
        }}
      />
    </button>
  );
}

export default function Settings({ user, onBack, onLogout }: Props) {
  const [tab, setTab] = useState<SettingsTab>('account');
  const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem(GEMINI_KEY_STORAGE) || '');
  const [geminiSaved, setGeminiSaved] = useState(false);
  const [geminiTesting, setGeminiTesting] = useState(false);
  const [geminiTestResult, setGeminiTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showKey, setShowKey] = useState(false);

  const isAdmin = user.role === 'ADMIN';
  const initials = (user.fullName || user.email || 'Admin User').split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  const cardStyle: React.CSSProperties = {
    background: '#FFFFFF',
    border: '1px solid #E2E8F0',
    borderRadius: '16px',
    padding: '16px 20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '10px',
  };

  return (
    <div className="min-h-screen flex bg-[#F4F6FA]">
      {/* Settings sidebar */}
      <aside
        className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-white"
        style={{ borderRight: '1px solid #E5E7EB' }}
      >
        {/* Back button */}
        <div className="px-4 py-5" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-xs font-bold transition-all px-3 py-2.5 rounded-lg w-full text-slate-500 hover:text-slate-800 hover:bg-slate-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Dashboard
          </button>
        </div>

        {/* Avatar */}
        <div className="px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
              style={{ background: '#1E3A8A' }}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold truncate text-slate-800">{user.fullName || user.email}</p>
              <p className="text-[10px] truncate text-slate-400 font-bold uppercase">{isAdmin ? 'Administrator' : 'Technician'}</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto space-y-0.5">
          <p className="text-[9px] font-bold uppercase tracking-widest px-2.5 mb-2 text-[#94A3B8]">Settings Options</p>
          <div className="space-y-0.5">
            {tabs.map(t => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-semibold transition-all text-left"
                  style={
                    active
                      ? { background: 'rgba(30,58,138,0.06)', color: '#1E3A8A', border: '1px solid rgba(30,58,138,0.1)' }
                      : { color: '#64748B', border: '1px solid transparent' }
                  }
                  onMouseEnter={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = '#F8FAFC'; (e.currentTarget as HTMLElement).style.color = '#1E293B'; } }}
                  onMouseLeave={e => { if (!active) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#64748B'; } }}
                >
                  <span style={{ color: active ? '#1E3A8A' : '#94A3B8' }}>{t.icon}</span>
                  {t.label}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Logout */}
        {onLogout && (
          <div className="px-3 py-4 border-t border-slate-100 bg-slate-50">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold text-slate-500 hover:text-red-500 hover:bg-red-50 transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Log out
            </button>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="flex-1 px-8 py-8 overflow-y-auto">
        <h2 className="text-lg font-black mb-6 text-slate-800 uppercase tracking-tight">
          {tabs.find(t => t.key === tab)?.label}
        </h2>

        <div className="max-w-xl">
          {/* Account Info */}
          {tab === 'account' && (
            <div>
              {/* Avatar card */}
              <div
                className="rounded-2xl p-6 mb-4 flex items-center gap-4 bg-white border border-slate-100"
              >
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white shrink-0"
                  style={{ background: '#1E3A8A' }}
                >
                  {initials}
                </div>
                <div>
                  <p className="text-base font-black text-slate-800">{user.fullName || user.email}</p>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">{user.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Role', value: isAdmin ? 'Administrator' : 'Technician', color: '#1E3A8A' },
                  { label: 'User ID Reference', value: user.id, mono: true, color: '#64748B' },
                  { label: 'Network Connection', value: 'Live Active', color: '#10B981' },
                  { label: 'Platform Region', value: 'Philippines (PHP)', color: '#64748B' },
                ].map(item => (
                  <div key={item.label} className="rounded-xl p-4 bg-white border border-slate-200">
                    <p className="text-[9px] font-bold uppercase tracking-wider mb-1 text-slate-400">{item.label}</p>
                    <p className={`text-xs font-black ${item.mono ? 'font-mono' : ''}`} style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'position' && (
            <div className="rounded-2xl p-6 bg-white border border-slate-200">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Company Position</p>
              <p className="text-base font-black text-slate-800 mb-2">
                {isAdmin ? 'Administrator / Sales Engineer' : 'Field CCTV & Systems Technician'}
              </p>
              <p className="text-xs text-slate-400 font-semibold">Department: Security and Technology Solutions</p>
            </div>
          )}

          {tab === 'userid' && (
            <div className="rounded-2xl p-6 bg-white border border-slate-200">
              <p className="text-[9px] font-bold uppercase tracking-wider mb-2 text-slate-400">User Reference ID</p>
              <p className="font-mono text-xl font-black text-[#1E3A8A]">{user.id}</p>
            </div>
          )}

          {tab === 'privacy' && (
            <div>
              {[
                { label: 'Email Notifications', desc: 'Receive updates about assignments', on: true },
                { label: 'Push Notifications', desc: 'Get real-time alerts on your device', on: false },
                { label: 'Location Tracking', desc: 'Allow technician mapping during site survey', on: true },
                { label: 'Activity Logs', desc: 'Record your login and activity history', on: true },
              ].map(item => (
                <div key={item.label} style={cardStyle}>
                  <div>
                    <p className="text-xs font-black text-slate-700">{item.label}</p>
                    <p className="text-[11px] font-semibold mt-0.5 text-slate-400">{item.desc}</p>
                  </div>
                  <Toggle defaultOn={item.on} />
                </div>
              ))}
            </div>
          )}

          {tab === 'help' && (
            <div className="rounded-2xl p-6 space-y-4 bg-white border border-slate-200">
              <p className="text-xs font-semibold text-slate-500">
                Need help? Contact our command center support at{' '}
                <span className="font-bold text-[#1E3A8A]">support@aa2000.com.ph</span>
              </p>
              {[
                { label: '📄 Connect User Manual', desc: 'Read the platform user guide' },
                { label: '💬 Direct Tech Support', desc: 'Chat with our support team' },
                { label: 'Report system anomaly', desc: 'Submit a ticket directly' },
              ].map(item => (
                <div
                  key={item.label}
                  className="px-4 py-3 rounded-xl cursor-pointer border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors"
                >
                  <p className="text-xs font-black text-slate-700">{item.label}</p>
                  <p className="text-[11px] text-slate-400 font-semibold mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          )}

          {tab === 'ai-config' && (
            <div className="space-y-4">
              {/* Status indicator */}
              <div className="rounded-2xl p-5 bg-white border border-slate-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-blue-50 text-[#1E3A8A]">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 21m0 0l-.813-5.096L9 21zm0 0h-.01m-4.24-5.24A8.003 8.003 0 0112 4v12M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-black text-slate-800">Gemini Vision API</p>
                    <p className="text-[10px] font-bold text-slate-400">Used for floor plan AI estimation analysis</p>
                  </div>
                  <div className="ml-auto">
                    {geminiKey.trim() ? (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-emerald-50 text-emerald-600 uppercase tracking-wide">Key Set</span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-[9px] font-extrabold bg-red-50 text-red-500 uppercase tracking-wide">Not Set</span>
                    )}
                  </div>
                </div>

                {/* Key input */}
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-slate-400">Gemini API Key</label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={geminiKey}
                    onChange={e => { setGeminiKey(e.target.value); setGeminiSaved(false); setGeminiTestResult(null); }}
                    placeholder="Enter your Gemini API key..."
                    className="w-full px-4 py-3 pr-12 rounded-xl text-xs font-mono bg-slate-50 border border-slate-200 outline-none text-slate-700 focus:border-[#1E3A8A] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showKey ? (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={() => {
                      localStorage.setItem(GEMINI_KEY_STORAGE, geminiKey.trim());
                      setGeminiSaved(true);
                      setGeminiTestResult(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold text-white transition-all"
                    style={{ background: '#1E3A8A' }}
                  >
                    {geminiSaved ? '✓ Saved' : 'Save Key'}
                  </button>
                  <button
                    onClick={async () => {
                      setGeminiTesting(true);
                      setGeminiTestResult(null);
                      const keyToTest = geminiKey.trim();
                      if (!keyToTest) {
                        setGeminiTestResult({ ok: false, msg: 'Please enter a key first.' });
                        setGeminiTesting(false);
                        return;
                      }
                      try {
                        await testGeminiConnection(keyToTest);
                        setGeminiTestResult({ ok: true, msg: 'Connection successful! API key is valid.' });
                      } catch (err: unknown) {
                        const msg = err instanceof Error ? err.message : 'Connection failed';
                        setGeminiTestResult({ ok: false, msg });
                      } finally {
                        setGeminiTesting(false);
                      }
                    }}
                    disabled={geminiTesting}
                    className="flex-1 py-2.5 rounded-xl text-xs font-bold border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 transition-all disabled:opacity-60"
                  >
                    {geminiTesting ? 'Testing...' : 'Test Connection'}
                  </button>
                </div>

                {/* Test result */}
                {geminiTestResult && (
                  <div
                    className={`mt-3 px-4 py-3 rounded-xl text-xs font-bold border ${
                      geminiTestResult.ok
                        ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        : 'bg-red-50 border-red-100 text-red-600'
                    }`}
                  >
                    {geminiTestResult.ok ? '✓ ' : '✗ '}{geminiTestResult.msg}
                  </div>
                )}
              </div>

              {/* Info box */}
              <div className="rounded-2xl p-5 bg-slate-50 border border-slate-200">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">How Floor Plan AI Works</p>
                <div className="space-y-2">
                  {[
                    { icon: '📤', text: 'Upload a floor plan image (JPG, PNG) in Cost Estimation' },
                    { icon: '🤖', text: 'Gemini Vision analyzes room layout, area & entry points' },
                    { icon: '📋', text: 'Auto-fills manpower, equipment & fees based on PH standards' },
                    { icon: '🔒', text: 'Your API key is stored only in this browser — never shared' },
                  ].map(item => (
                    <div key={item.text} className="flex items-start gap-2.5">
                      <span className="text-base">{item.icon}</span>
                      <p className="text-[11px] font-semibold text-slate-500">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {tab === 'accessibility' && (
            <div>
              <div style={cardStyle}>
                <div>
                  <p className="text-xs font-black text-slate-700">Light Theme (Screenshot Standard)</p>
                  <p className="text-[11px] font-semibold mt-0.5 text-slate-400">Locked to default light mode as requested</p>
                </div>
                <div className="px-3 py-1 rounded bg-[#E0E7FF] text-[#1E3A8A] text-[9px] font-black uppercase tracking-wider">ACTIVE</div>
              </div>
              {[
                { label: 'Compact Mode Layout', desc: 'Use denser margins for small monitors', on: false },
                { label: 'High Contrast Mode', desc: 'Increase outline contrast on tables', on: false },
                { label: 'Reduced Motion Engine', desc: 'Disable spline map animations', on: false },
              ].map(item => (
                <div key={item.label} style={cardStyle}>
                  <div>
                    <p className="text-xs font-black text-slate-700">{item.label}</p>
                    <p className="text-[11px] font-semibold mt-0.5 text-slate-400">{item.desc}</p>
                  </div>
                  <Toggle defaultOn={item.on} />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
