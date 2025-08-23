import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';

interface PasswordResetFormProps {
  email: string;
  onClose: () => void;
}

const PasswordResetForm: React.FC<PasswordResetFormProps> = ({ email, onClose }) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Check if all password requirements are met
  const arePasswordRequirementsMet = () => {
    return (
      password.length >= 8 &&
      /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      password === confirmPassword &&
      password.length > 0 &&
      confirmPassword.length > 0
    );
  };

  const validatePassword = (pw: string) => {
    if (pw.length < 8) return 'Password must be at least 8 characters';
    if (!/[A-Z]/.test(pw)) return 'Password must include at least one uppercase letter';
    if (!/[a-z]/.test(pw)) return 'Password must include at least one lowercase letter';
    if (!/\d/.test(pw)) return 'Password must include at least one number';
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate password
    const validationError = validatePassword(password);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    
    // Confirm passwords match
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
        setSuccess(true);
        toast.success('Password reset successfully! You can now login with your new password.');
        // Close the modal after a delay
        setTimeout(() => {
          onClose();
        }, 3000);
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
  
  return (
    <div className="space-y-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">Create New Password</h3>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center text-lg font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors duration-200"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <p className="text-sm text-gray-600 mb-4">
        Your verification code has been confirmed. Please create a new password for your account.
      </p>
      
      {success ? (
        <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-500" />
          <div>
            <p className="font-medium">Password reset successful!</p>
            <p className="text-sm">You can now login with your new password.</p>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">New Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Enter new password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                placeholder="Confirm new password"
                required
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>Password requirements:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li className={password.length >= 8 ? 'text-green-600' : ''}>
                At least 8 characters
              </li>
              <li className={/[A-Z]/.test(password) ? 'text-green-600' : ''}>
                At least one uppercase letter
              </li>
              <li className={/[a-z]/.test(password) ? 'text-green-600' : ''}>
                At least one lowercase letter
              </li>
              <li className={/\d/.test(password) ? 'text-green-600' : ''}>
                At least one number
              </li>
              <li className={password && confirmPassword && password === confirmPassword ? 'text-green-600' : ''}>
                Passwords match
              </li>
            </ul>
          </div>
          
          <button
            type="submit"
            disabled={loading || !arePasswordRequirementsMet()}
            className="w-full py-2.5 rounded-lg bg-[#2C3E50] text-white font-semibold hover:bg-[#1a2634] transition-all duration-200 shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            title={arePasswordRequirementsMet() ? "" : "Please meet all password requirements before proceeding"}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Lock className="w-4 h-4 animate-pulse" />
                Resetting Password...
              </span>
            ) : (
              'Reset Password'
            )}
          </button>
        </form>
      )}
    </div>
  );
};

export default PasswordResetForm;
