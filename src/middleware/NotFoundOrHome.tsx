import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import LandingPage from '../LandingPage';
import NotFound from './404';
import { useNavigate } from 'react-router-dom';

const NotFoundOrHome: React.FC = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  // Show NotFound and a button to go to dashboard
  return (
    <div>
      <NotFound reason="not_found" />
      <div className="flex justify-center mt-4">
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          onClick={() => navigate('/dashboard')}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  );
};

export default NotFoundOrHome; 