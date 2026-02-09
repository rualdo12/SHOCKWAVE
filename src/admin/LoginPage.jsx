import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth, createAuthUser, grantSignupStamp } from '../firebase';
import { useAuth } from './AuthContext';

const LoginPage = () => {
  const { signInWithGoogle } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/admin';

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, form.email.trim(), form.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e) => {
    e.preventDefault();
    if (form.password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const user = await createAuthUser({ email: form.email.trim(), password: form.password });
      await grantSignupStamp(user.uid, user.email || '');
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Account creation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      await signInWithGoogle();
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.message || 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-custom-dark flex items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-4xl gap-6 md:grid-cols-2">
        <div className="glass-card rounded-2xl p-8 border border-custom-gold/30">
          <p className="text-custom-gold text-xs uppercase tracking-[0.35em] mb-2">Account access</p>
          <h1 className="text-3xl font-extrabold text-white mb-2">Welcome</h1>
          <p className="text-gray-400 text-sm mb-6">
            Sign in or create a new account to manage orders, rewards, and admin access.
          </p>
          <ul className="space-y-2 text-gray-400 text-sm">
            <li>• One login for both online and in-person purchases.</li>
            <li>• Earn and sync reward stamps automatically.</li>
            <li>• Admin tools unlock if your role allows it.</li>
          </ul>
        </div>

        <div className="glass-card rounded-2xl p-8 border border-custom-gold/30">
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => { setMode('login'); setError(''); }}
              className={`flex-1 py-2 rounded-lg font-bold transition ${
                mode === 'login'
                  ? 'bg-custom-gold text-black shadow'
                  : 'bg-custom-gray text-white hover:border-custom-gold border border-white/10'
              }`}
              disabled={loading}
            >
              Sign in
            </button>
            <button
              onClick={() => { setMode('signup'); setError(''); }}
              className={`flex-1 py-2 rounded-lg font-bold transition ${
                mode === 'signup'
                  ? 'bg-custom-gold text-black shadow'
                  : 'bg-custom-gray text-white hover:border-custom-gold border border-white/10'
              }`}
              disabled={loading}
            >
              Create account
            </button>
          </div>

          <form
            onSubmit={mode === 'login' ? handleEmailLogin : handleEmailSignup}
            className="space-y-3"
          >
            <input
              className="w-full bg-custom-gray text-white px-3 py-3 rounded border border-white/10 focus:border-custom-gold focus:outline-none transition"
              placeholder="Email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
            <input
              className="w-full bg-custom-gray text-white px-3 py-3 rounded border border-white/10 focus:border-custom-gold focus:outline-none transition"
              placeholder="Password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
            />
            {mode === 'signup' && (
              <input
                className="w-full bg-custom-gray text-white px-3 py-3 rounded border border-white/10 focus:border-custom-gold focus:outline-none transition"
                placeholder="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            )}
            <button
              disabled={loading}
              className="w-full bg-custom-gold text-black font-bold py-3 rounded hover:bg-white transition disabled:opacity-50"
            >
              {loading ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
            </button>
          </form>

          <div className="my-4 text-center text-gray-400 text-sm">or</div>

          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full border border-custom-gold text-custom-gold font-bold py-3 rounded hover:bg-custom-gold hover:text-black transition disabled:opacity-50"
          >
            Continue with Google
          </button>

          {error && <p className="text-red-400 text-sm mt-4">{error}</p>}
          <p className="text-gray-500 text-xs mt-3">
            By continuing you agree to receive SHOCKWAVE updates. Opt out anytime.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
