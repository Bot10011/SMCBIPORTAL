import React, { Suspense, lazy, memo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { DashboardAccessProvider } from './contexts/DashboardAccessContext';
import ProtectedRoute from './middleware/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import CreateUserModal from './components/CreateUserModal';
import EditUserModal from './components/EditUserModal';
import GoogleClassroomCallback from './components/GoogleClassroomCallback';
import { useModal } from './contexts/ModalContext';
import NotFoundOrHome from './middleware/NotFoundOrHome';
import ResetPassword from './components/ResetPassword';

// Import public components (not lazy loaded for immediate access)
import LandingPage from './LandingPage';
import Login from './Login';

// Lazy load dashboard components for better performance
// NEW: Import DashboardRouter
const DashboardRouter = lazy(() => import('./middleware/DashboardRouter'));

// Loading component for lazy-loaded routes (styled to match LandingPage)
const DashboardLoading: React.FC = () => (
  <div className="relative min-h-screen overflow-hidden bg-[#031730]">
    {/* Background video and overlays */}
    <div className="fixed inset-0 w-full h-full">
      <video
        className="absolute inset-0 w-full h-full object-cover scale-[1.02] transform-gpu"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
      >
        <source src="/img/bg.mp4" type="video/mp4" />
      </video>
      <div className="absolute inset-0 bg-[#031730]/80" />
      <div className="absolute inset-0 bg-black/30" />
    </div>

    {/* Decorative gradient blobs */}
    <div className="pointer-events-none absolute -top-20 -left-20 w-72 h-72 bg-gradient-to-br from-blue-400/20 to-cyan-400/10 blur-3xl rounded-full" />
    <div className="pointer-events-none absolute -bottom-20 -right-20 w-72 h-72 bg-gradient-to-br from-indigo-400/20 to-purple-400/10 blur-3xl rounded-full" />

    {/* Foreground content */}
    <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
      <div className="text-center max-w-md w-full">
        {/* Floating logo with subtle glow */}
        <div className="relative mb-8 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: [0, -8, 0] }}
            transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
            className="relative"
          >
            <img
              src="/img/logo3.png"
              alt="School Logo"
              className="w-24 h-24 mx-auto object-contain drop-shadow-2xl relative z-10"
            />
            {/* Glow ring */}
            <div className="absolute inset-0 -z-0 rounded-full blur-2xl bg-white/10" />
            {/* Pulsing halo */}
            <div className="absolute inset-0 -z-0 rounded-full border border-white/20 animate-ping" />
          </motion.div>
        </div>

        {/* Shimmer loading bar */}
        <div className="mx-auto w-64 h-2 rounded-full bg-white/10 overflow-hidden relative loading-bar mb-6" />

        {/* Loading text */}
        <div className="space-y-2">
          <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide">Loading Dashboard</h2>
          <p className="text-white/70 text-sm">Please wait while we prepare your workspace</p>
        </div>

        {/* Subtle bouncing dots for liveliness */}
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce" />
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0.12s' }} />
          <span className="w-2 h-2 rounded-full bg-white/80 animate-bounce" style={{ animationDelay: '0.24s' }} />
        </div>
      </div>
    </div>

    {/* Local styles for shimmer animation and reduced motion */}
    <style>{`
      .loading-bar::after {
        content: '';
        position: absolute;
        inset: 0;
        width: 40%;
        left: -40%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.7), transparent);
        animation: shimmer 1.2s ease-in-out infinite;
        border-radius: 9999px;
      }
      @keyframes shimmer {
        0% { left: -40%; }
        100% { left: 100%; }
      }
      @media (prefers-reduced-motion: reduce) {
        .loading-bar::after { animation: none; }
      }
    `}</style>
  </div>
);

// Error boundary for lazy-loaded components
const DashboardErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Suspense fallback={<DashboardLoading />}>
    {children}
  </Suspense>
);

// Memoized GlobalModal component for better performance
const GlobalModal = memo(() => {
  const { showCreateUserModal, setShowCreateUserModal, showEditUserModal } = useModal();

  return (
    <AnimatePresence mode="wait">
      {showCreateUserModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <CreateUserModal
            isOpen={showCreateUserModal}
            onClose={() => setShowCreateUserModal(false)}
          />
        </motion.div>
      )}
      {showEditUserModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          style={{ backdropFilter: 'blur(8px)' }}
        >
          <EditUserModal />
        </motion.div>
      )}
    </AnimatePresence>
  );
});

GlobalModal.displayName = 'GlobalModal';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ModalProvider>
        <DashboardAccessProvider>
          <div className="app-container">
            {/* Enhanced Toaster with better performance */}
            <Toaster
              position="top-center"
              reverseOrder={false}
              gutter={8}
              containerStyle={{
                zIndex: 9999
              }}
              toastOptions={{
                className: '',
                duration: 5000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  maxWidth: '90vw',
                  width: 'fit-content',
                  minWidth: '250px',
                  padding: '16px',
                  borderRadius: '8px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
                  fontSize: '14px',
                  margin: '0 auto',
                  textAlign: 'center',
                  zIndex: 9999
                },
                success: {
                  style: {
                    background: '#10B981',
                  },
                  iconTheme: {
                    primary: 'white',
                    secondary: '#10B981',
                  },
                },
                error: {
                  style: {
                    background: '#EF4444',
                  },
                  iconTheme: {
                    primary: 'white',
                    secondary: '#EF4444',
                  },
                },
                loading: {
                  style: {
                    background: '#3B82F6',
                  },
                  iconTheme: {
                    primary: 'white',
                    secondary: '#3B82F6',
                  },
                },
              }}
            />
            
            <Routes>
              {/* Public routes - no lazy loading for immediate access */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/test-redirect" element={<Navigate to="/" replace />} />

              {/* Google Classroom OAuth Callback */}
              <Route path="/google-classroom-callback" element={<GoogleClassroomCallback />} />

              {/* Redirect old dashboard URLs to /dashboard for security */}
              <Route path="/admin/dashboard/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/student/dashboard/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/superadmin/dashboard/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/teacher/dashboard/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/program_head/dashboard/*" element={<Navigate to="/dashboard" replace />} />
              <Route path="/registrar/dashboard/*" element={<Navigate to="/dashboard" replace />} />

              {/* NEW: Single dashboard route for all roles */}
              <Route
                path="/dashboard/*"
                element={
                  <ProtectedRoute>
                    <DashboardErrorBoundary>
                      <DashboardRouter />
                    </DashboardErrorBoundary>
                  </ProtectedRoute>
                }
              >
                <Route
                  index
                  element={
                    <ProtectedRoute>
                      <DashboardErrorBoundary>
                        <DashboardRouter />
                      </DashboardErrorBoundary>
                    </ProtectedRoute>
                  }
                />
              </Route>

              {/* Catch-all route for 404 - must be last */}
              <Route path="*" element={<NotFoundOrHome />} />
            </Routes>
          </div>
          <GlobalModal />
        </DashboardAccessProvider>
      </ModalProvider>
    </AuthProvider>
  );
};

export default App; 
