import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ResetPasswordProps {
  email: string;
  onBack: () => void;
}

const ResetPassword: React.FC<ResetPasswordProps> = ({ email, onBack }) => {
  const [step, setStep] = useState<'code' | 'password'>('code');
  const [verificationCode, setVerificationCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);

  const navigate = useNavigate();

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return 'At least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'At least one uppercase letter';
    if (!/[a-z]/.test(pw)) return 'At least one lowercase letter';
    if (!/\d/.test(pw)) return 'At least one number';
    return '';
  };

  const handleVerifyCode = async () => {
    const code = verificationCode.trim();
    if (!code || !/^SMCBI-\d{6}$/.test(code)) {
      toast.error('Please enter a valid verification code (SMCBI-######)');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/verify-reset-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          code: code
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        setCodeVerified(true);
        setStep('password');
        toast.success('Code verified successfully! Now set your new password.');
      } else {
        toast.error(result.message || 'Invalid verification code');
      }
    } catch (error) {
      console.error('Code verification error:', error);
      toast.error('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validatePassword(password);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          newPassword: password
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('Password reset successfully! You can now sign in with your new password.');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        toast.error(result.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/send-password-reset-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        toast.success('New verification code sent to your email!');
        setVerificationCode('');
        setStep('code');
      } else {
        toast.error(result.message || 'Failed to send new code');
      }
    } catch (error) {
      console.error('Resend code error:', error);
      toast.error('Failed to send new code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-4">
      <div className="w-full max-w-md bg-white/90 rounded-2xl shadow-xl p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Lock className="w-5 h-5 text-blue-600" />
              {step === 'code' ? 'Enter Verification Code' : 'Set New Password'}
            </h1>
            <p className="text-sm text-gray-600">
              {step === 'code' 
                ? `We sent a verification code to ${email}` 
                : 'Enter your new password below'
              }
            </p>
          </div>
        </div>

        {step === 'code' ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Verification Code
              </label>
              <input
                type="text"
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-center text-lg font-mono tracking-wider"
                placeholder="SMCBI-000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                disabled={loading}
                maxLength={10}
              />
              <p className="text-xs text-gray-500 mt-2 text-center">
                Format: SMCBI-###### (6 digits after SMCBI-)
              </p>
            </div>

            <button
              onClick={handleVerifyCode}
              disabled={loading || !verificationCode.trim() || !/^SMCBI-\d{6}$/.test(verificationCode)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Verifying...' : 'Verify Code'}
            </button>

            <div className="text-center">
              <button
                onClick={handleResendCode}
                disabled={loading}
                className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-60"
              >
                Didn't receive the code? Resend
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmitPassword} className="space-y-4">
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

            <div className="text-xs text-gray-500">
              Must be at least 8 characters and include uppercase, lowercase, and a number.
            </div>

            <button
              type="submit"
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
              disabled={loading}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>

            {codeVerified && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 p-3 rounded-lg">
                <CheckCircle className="w-4 h-4" />
                Code verified successfully
              </div>
            )}
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;


