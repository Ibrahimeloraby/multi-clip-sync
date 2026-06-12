import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function HubLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Demo bypass: any credentials work for prototype
    await new Promise(r => setTimeout(r, 600));
    localStorage.setItem('hub_session', JSON.stringify({ email, name: email.split('@')[0] }));
    navigate('/hub');

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo */}
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-2xl mx-auto mb-4">
            🧠
          </div>
          <h1 className="text-white text-xl font-bold">KnowledgeHub</h1>
          <p className="text-slate-400 text-sm mt-1">Corporate AI Brain</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="bg-slate-800 border border-slate-700 rounded-2xl p-6 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Work email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@company.com"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500 transition-colors"
            />
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-violet-600 text-white py-2.5 rounded-lg font-medium text-sm hover:bg-violet-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p className="text-center text-slate-500 text-xs">
          Demo mode — any credentials grant access
        </p>
      </div>
    </div>
  );
}
