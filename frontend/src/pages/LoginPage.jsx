import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api';

const LoginPage = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({
        username: username.trim(),
        password: password.trim(),
      });
      localStorage.setItem('tr_token', res.token);
      localStorage.setItem('tr_user', JSON.stringify(res.user));
      navigate('/');
    } catch (err) {
      const status = err.response?.status;
      const serverMessage = err.response?.data?.message;
      setError(serverMessage || (status ? `Login failed (${status})` : `Login failed: ${err.message}`));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden font-body bg-[var(--bg)]">
      <div className="absolute inset-0 bg-[var(--auth-bg)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_24%_18%,var(--backdrop-primary),transparent_30%),radial-gradient(circle_at_78%_74%,var(--backdrop-secondary),transparent_32%)]" />
      <div
        className="absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage: 'linear-gradient(var(--border) 1px, transparent 1px), linear-gradient(90deg, var(--border) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage: 'radial-gradient(var(--primary) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />
      <div className="absolute left-[-12%] top-[18%] h-[420px] w-[420px] rounded-full bg-[var(--primary)]/10 blur-[120px]" />
      <div className="absolute right-[-10%] bottom-[-8%] h-[520px] w-[520px] rounded-full bg-[var(--primary)]/8 blur-[140px]" />

      <div className="w-full max-w-sm bg-[var(--card)]/95 border border-[var(--border)] rounded-2xl p-8 z-10 shadow-[0_28px_90px_rgba(0,0,0,0.55)] relative overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,transparent,var(--primary),transparent)]" />
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(28,105,212,0.12),transparent_36%)]" />
        <div className="relative">
        <div className="flex flex-col items-center mb-8">
          <svg width="64" height="64" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className="mb-4">
            <path d="M50 5L93.3013 30V80L50 105L6.69873 80V30L50 5Z" fill="var(--primary-dim)" stroke="var(--primary)" strokeWidth="4" />
            <text x="50" y="58" fontFamily="Inter" fontSize="32" fontWeight="700" fill="var(--primary)" textAnchor="middle">TR</text>
          </svg>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text)]">Rico TraceVision</h1>
          <p className="text-[12px] font-medium tracking-wide text-[var(--text-muted)] mt-1 uppercase">BMW Gen-6 | Bawal Plant</p>
        </div>

        {error && (
          <div className="mb-6 bg-[var(--ng-bg)] border border-[var(--ng-border)] text-[var(--ng)] px-4 py-3 rounded-md text-[13px] font-medium text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5" autoComplete="off">
          <div>
            <label htmlFor="login-username" className="block text-[11px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Username</label>
            <input
              id="login-username"
              name="username"
              type="text"
              autoComplete="off"
              className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors placeholder:text-[var(--text-dim)]"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              required
            />
          </div>
          <div>
            <label htmlFor="login-password" className="block text-[11px] font-bold text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="new-password"
              className="w-full bg-[var(--input-bg)] border border-[var(--border)] rounded-lg px-4 py-2.5 text-[14px] text-[var(--text-main)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/15 transition-colors placeholder:text-[var(--text-dim)]"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[var(--primary)] text-white font-bold tracking-wide py-3 rounded-lg mt-2 hover:brightness-110 active:scale-[0.99] transition-all disabled:opacity-50 shadow-[0_14px_34px_var(--primary-glow)]"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-7 border-t border-[var(--border)] pt-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--text-dim)]">
            Powered by <span className="text-[var(--primary)]">Rico</span>
          </p>
          <p className="mt-1 text-[10px] text-[var(--text-dim)]">
            Developed for intelligent traceability operations
          </p>
        </div>

        </div>
      </div>
    </div>
  );
};
export default LoginPage;
