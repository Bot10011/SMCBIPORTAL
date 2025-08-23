import React from 'react';
import { useSearchParams, Navigate } from 'react-router-dom';
import ResetPassword from './ResetPassword';

const ResetPasswordWrapper: React.FC = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email');

  if (!email) {
    // Redirect to home if no email provided
    return <Navigate to="/" replace />;
  }

  const handleBack = () => {
    // Go back to the previous page or home
    window.history.back();
  };

  return <ResetPassword email={email} onBack={handleBack} />;
};

export default ResetPasswordWrapper;





