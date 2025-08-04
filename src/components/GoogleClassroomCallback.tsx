import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

const GoogleClassroomCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const isProcessingRef = useRef(false);
  const hasProcessedRef = useRef(false);

  useEffect(() => {
    const handleCallback = async () => {
      // Prevent multiple processing and ensure we only process once
      if (isProcessingRef.current || hasProcessedRef.current) {
        return;
      }

      try {
        isProcessingRef.current = true;
        hasProcessedRef.current = true;
        
        // Get the authorization code from URL parameters
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const error = searchParams.get('error');

        // Check for OAuth errors
        if (error) {
          setStatus('error');
          setErrorMessage(`OAuth error: ${error}`);
          return;
        }

        // Validate state parameter for security
        if (!user?.id) {
          setStatus('error');
          setErrorMessage('User not authenticated.');
          return;
        }
        
        const savedState = localStorage.getItem(`google_oauth_state_${user.id}`);
        if (state !== savedState) {
          setStatus('error');
          setErrorMessage('Invalid state parameter. Please try again.');
          return;
        }

        // Check if we have the required parameters
        if (!code) {
          setStatus('error');
          setErrorMessage('No authorization code received.');
          return;
        }

        // Check if we already have tokens (prevent duplicate exchange)
        const existingToken = localStorage.getItem(`google_classroom_token_${user.id}`);
        if (existingToken) {
          setStatus('success');
          localStorage.removeItem(`google_oauth_state_${user.id}`);
          // Redirect immediately for better UX
          setTimeout(() => {
            navigate('/dashboard/google-classroom');
          }, 1500);
          return;
        }

        // Get Google OAuth credentials from environment
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        const clientSecret = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
        const redirectUri = `${window.location.origin}/google-classroom-callback`;

        if (!clientId || !clientSecret) {
          console.error('Missing environment variables');
          setStatus('error');
          setErrorMessage('Google OAuth is not configured. Please contact your administrator.');
          return;
        }

        // Exchange authorization code for access token directly with Google
        const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            code,
            client_id: clientId,
            client_secret: clientSecret,
            redirect_uri: redirectUri,
            grant_type: 'authorization_code',
          }),
        });

        if (!tokenResponse.ok) {
          const errorText = await tokenResponse.text();
          console.error('Google OAuth error:', errorText);
          
          // If it's an invalid_grant error, check if we already have tokens
          if (errorText.includes('invalid_grant')) {
            const currentToken = localStorage.getItem(`google_classroom_token_${user.id}`);
            if (currentToken) {
              setStatus('success');
              localStorage.removeItem(`google_oauth_state_${user.id}`);
              setTimeout(() => {
                navigate('/dashboard/google-classroom');
              }, 1500);
              return;
            }
          }
          
          setStatus('error');
          setErrorMessage('Failed to exchange authorization code for token');
          return;
        }

        const tokenData = await tokenResponse.json();
        const { access_token, refresh_token } = tokenData;

        // Store the tokens securely
        localStorage.setItem(`google_classroom_token_${user.id}`, access_token);
        if (refresh_token) {
          localStorage.setItem(`google_classroom_refresh_token_${user.id}`, refresh_token);
        }

        // Clean up the auth code since we now have tokens
        localStorage.removeItem(`google_auth_code_${user.id}`);
        
        setStatus('success');
        
        // Clean up the state
        localStorage.removeItem(`google_oauth_state_${user.id}`);

        // Redirect back to the Google Classroom page after a short delay
        setTimeout(() => {
          navigate('/dashboard/google-classroom');
        }, 1500);

      } catch (error) {
        console.error('Google Classroom callback error:', error);
        setStatus('error');
        setErrorMessage(error instanceof Error ? error.message : 'An unexpected error occurred.');
      } finally {
        isProcessingRef.current = false;
      }
    };

    handleCallback();
  }, [searchParams, user?.id, navigate]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connecting to Google Classroom
            </h2>
            <p className="text-gray-600">
              Please wait while we complete the connection...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              Connection Failed
            </h2>
            <p className="text-gray-600 mb-6">
              {errorMessage}
            </p>
            <button
              onClick={() => navigate('/dashboard/google-classroom')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Successfully Connected!
          </h2>
          <p className="text-gray-600 mb-6">
            Your Google Classroom account has been connected successfully.
          </p>
          <div className="text-sm text-gray-500">
            Redirecting to Google Classroom...
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoogleClassroomCallback; 