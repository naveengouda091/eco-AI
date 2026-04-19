import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, ShieldCheck, User, Building2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState('personal');
  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    if (!email || !password) { setError('Please enter both email and password.'); return; }
    setLoading(true);
    try {
      await login(email, password, accountType);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to login.');
    } finally {
      setLoading(false);
    }
  };

  const isOrg = accountType === 'organisation';

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md rounded-[32px] border border-slate-800 bg-slate-900/95 p-10 shadow-2xl shadow-slate-950/40">

        <div className="mb-8 text-center">
          <div className={`mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-3xl ${isOrg ? 'bg-cyan-500/15 text-cyan-400' : 'bg-emerald-500/15 text-emerald-400'}`}>
            <ShieldCheck size={32} />
          </div>
          <h1 className="text-3xl font-semibold text-slate-100">
            <span className="text-emerald-400 font-extrabold">EC</span><span>🌍</span>
            <span className="text-slate-300 font-medium ml-2">Login</span>
          </h1>
          <p className="mt-2 text-sm text-slate-400">Access your carbon footprint dashboard.</p>
        </div>

        {/* Tab Switcher */}
        <div className="mb-6 flex w-full rounded-2xl border border-slate-700 bg-slate-950 p-1 gap-1">
          {[
            { key: 'personal', label: 'Personal', Icon: User },
            { key: 'organisation', label: 'Organisation', Icon: Building2 },
          ].map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => { setAccountType(key); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold transition-all ${
                accountType === key
                  ? key === 'personal'
                    ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20'
                    : 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 rounded-3xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm font-medium text-slate-200">
            {isOrg ? 'Organisation Email' : 'Email'}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 text-slate-100 outline-none transition ${isOrg ? 'focus:border-cyan-500' : 'focus:border-emerald-500'}`}
              placeholder={isOrg ? 'admin@company.com' : 'you@example.com'}
            />
          </label>

          <label className="block text-sm font-medium text-slate-200 relative">
            Password
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`mt-2 w-full rounded-3xl border border-slate-800 bg-slate-950 px-4 py-3 pr-12 text-slate-100 outline-none transition ${isOrg ? 'focus:border-cyan-500' : 'focus:border-emerald-500'}`}
              placeholder="Enter your password"
            />
            <button
              type="button"
              className="absolute right-4 top-[56px] text-slate-400 hover:text-slate-200"
              onClick={() => setShowPassword((p) => !p)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </label>

          <button
            type="submit"
            disabled={loading}
            className={`w-full rounded-3xl px-4 py-3 text-sm font-semibold text-slate-950 transition disabled:cursor-not-allowed disabled:opacity-60 ${isOrg ? 'bg-cyan-500 hover:bg-cyan-400' : 'bg-emerald-500 hover:bg-emerald-400'}`}
          >
            {loading ? 'Signing in…' : `Login as ${isOrg ? 'Organisation' : 'Personal'}`}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-slate-500">
          New to EC🌍?{' '}
          <Link to="/signup" className={`font-semibold ${isOrg ? 'text-cyan-400 hover:text-cyan-300' : 'text-emerald-400 hover:text-emerald-300'}`}>
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}
