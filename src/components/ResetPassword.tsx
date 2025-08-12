import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Eye, EyeOff, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';

const ResetPassword: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    // Supabase v2 establishes a temporary recovery session from the link (hash params)
    // detectSessionInUrl is enabled in our client config, but on SPA routes it may run after router.
    // This ensures we wait a moment for session to be picked up before enabling the form.
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setTokenReady(!!session);
      } catch {
        setTokenReady(false);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, []);

  const validate = (pw: string) => {
    if (pw.length < 8) return 'At least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'At least one uppercase letter';
    if (!/[a-z]/.test(pw)) return 'At least one lowercase letter';
    if (!/\d/.test(pw)) return 'At least one number';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const err = validate(password);
    if (err) {
      toast.error(err);
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success('Password updated. You can now sign in.');
      window.location.replace('/login');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to update password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-6 sm:p-8">
        <h1 className="text-xl font-bold mb-2 flex items-center gap-2">
          <Lock className="w-5 h-5 text-blue-600" /> Reset your password
        </h1>
        <p className="text-sm text-gray-600 mb-6">Enter a new password for your account.</p>
        {!tokenReady ? (
          <div className="text-gray-600">Preparing secure session...</div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all pr-12"
                placeholder="New password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                disabled={loading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600"
                onClick={() => setShowPw((v) => !v)}
                tabIndex={-1}
                aria-label={showPw ? 'Hide password' : 'Show password'}
              >
                {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            <input
              type="password"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              disabled={loading}
            />
            <div className="text-xs text-gray-500">Must be at least 8 characters and include uppercase, lowercase, and a number.</div>
            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60"
              disabled={loading}
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;


