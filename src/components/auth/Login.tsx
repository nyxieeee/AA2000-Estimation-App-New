import { useState } from 'react';
import type { User } from '../../App';

interface Props {
  onLogin: (user: User) => void;
}

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
      </svg>
    ),
    label: 'Site Survey',
    desc: 'On-location security system assessments',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
      </svg>
    ),
    label: 'Cost Estimation',
    desc: 'Labor, materials & fees in one report',
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
      </svg>
    ),
    label: 'Workflow Tracking',
    desc: 'Assignment → Approval → Finalize pipeline',
  },
];

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<{ email?: boolean; password?: boolean }>({});
  const [role, setRole] = useState<'technician' | 'sales' | 'admin'>('technician');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const errors: { email?: boolean; password?: boolean } = {};
    if (!email.trim()) errors.email = true;
    if (!password.trim()) errors.password = true;
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    setLoading(false);
    onLogin({
      id: role === 'admin' ? 'admin-1' : role === 'sales' ? 'sales-1' : 'tech-1',
      fullName: role === 'admin' ? 'Admin User' : role === 'sales' ? 'Sales User' : 'John Technician',
      email: email || (role === 'admin' ? 'admin@aa2000.com' : role === 'sales' ? 'sales@aa2000.com' : 'tech@aa2000.com'),
      role: role === 'admin' ? 'ADMIN' : role === 'sales' ? 'SALES' : 'TECHNICIAN',
    });
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'radial-gradient(ellipse at 50% 30%, rgba(191, 219, 254, 0.35) 0%, #EEF5FF 50%, #F8FAFC 100%)' }}>
      {/* Left Brand Panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[480px] shrink-0 p-10 relative overflow-hidden"
        style={{ background: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}
      >
        {/* Grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(#1E3A8A 1px, transparent 1px), linear-gradient(90deg, #1E3A8A 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-black text-lg"
              style={{ background: '#1E3A8A' }}
            >
              A
            </div>
            <span className="text-xl font-black tracking-tight text-[#1E3A8A]">AA2000</span>
          </div>
          <p className="text-sm font-bold text-[#94A3B8]" style={{ letterSpacing: '0.1em' }}>CONNECT SURVEY PLATFORM</p>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1 className="text-4xl font-black leading-tight mb-4 text-[#0F172A]">
            Survey smarter,<br />
            <span style={{ color: '#1E3A8A' }}>
              estimate faster.
            </span>
          </h1>
          <p className="text-sm leading-relaxed mb-8 text-slate-500 font-semibold">
            Built for field technicians and sales teams managing electronic security installations across multiple sites in the Philippines.
          </p>

          {/* Feature list */}
          <div className="space-y-4">
            {features.map((f) => (
              <div key={f.label} className="flex items-start gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 bg-slate-50 border border-slate-100 text-[#1E3A8A]"
                >
                  {f.icon}
                </div>
                <div>
                  <p className="text-xs font-black text-[#1E293B]">{f.label}</p>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10">
          <p className="text-[10px] font-bold text-[#94A3B8]">© 2026 AA2000 CONNECT. All rights reserved.</p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-sm bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2.5 mb-8 justify-center">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black"
              style={{ background: '#1E3A8A' }}
            >
              A
            </div>
            <span className="text-xl font-black text-[#1E3A8A]">AA2000</span>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-black mb-1.5 text-slate-800">Welcome back</h2>
            <p className="text-xs text-slate-400 font-semibold">Sign in to your command center account</p>
          </div>

          {/* Role Toggle */}
          <div
            className="flex gap-1 p-1 rounded-xl mb-6 bg-slate-50 border border-slate-200"
          >
            {(['technician', 'sales', 'admin'] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                className="flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-200"
                style={
                  role === r
                    ? { background: r === 'admin' ? '#1E3A8A' : r === 'sales' ? '#065F46' : '#334155', color: '#fff', boxShadow: '0 2px 8px rgba(30,58,138,0.2)' }
                    : { color: '#64748B' }
                }
              >
                {r === 'technician' ? 'Technician' : r === 'sales' ? 'Sales' : 'Admin'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-slate-400">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setFieldErrors(prev => ({ ...prev, email: false })); }}
              placeholder={role === 'admin' ? 'admin@aa2000.com' : role === 'sales' ? 'sales@aa2000.com' : 'tech@aa2000.com'}
                className={"w-full px-4 py-3 rounded-xl text-xs font-semibold bg-slate-50 border outline-none text-slate-700 focus:bg-white " + (fieldErrors.email ? 'border-red-400' : 'border-slate-200 focus:border-[#1E3A8A]')}
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold mb-1.5 uppercase tracking-wider text-slate-400">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => { setPassword(e.target.value); setFieldErrors(prev => ({ ...prev, password: false })); }}
                placeholder="Enter your password"
                className={"w-full px-4 py-3 rounded-xl text-xs font-semibold bg-slate-50 border outline-none text-slate-700 focus:bg-white " + (fieldErrors.password ? 'border-red-400' : 'border-slate-200 focus:border-[#1E3A8A]')}
              />
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-xl text-xs font-bold bg-red-50 border border-red-100 text-red-500"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl text-xs font-bold text-white transition-all duration-200 shadow-sm"
              style={{
                background: loading ? '#E2E8F0' : '#1E3A8A',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-[10px] font-bold text-slate-400 mt-6">
            Any password works for this demo
          </p>
        </div>
      </div>
    </div>
  );
}
