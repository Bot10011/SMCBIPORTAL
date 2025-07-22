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
import { useModal } from './contexts/ModalContext';
import NotFoundOrHome from './middleware/NotFoundOrHome';

// Import public components (not lazy loaded for immediate access)
import LandingPage from './LandingPage';
import Login from './Login';

// Lazy load dashboard components for better performance
// NEW: Import DashboardRouter
const DashboardRouter = lazy(() => import('./middleware/DashboardRouter'));

// Loading component for lazy-loaded routes
const DashboardLoading: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="w-16 h-16 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4"></div>
      <p className="text-gray-600 font-medium">Loading dashboard...</p>
      <p className="text-sm text-gray-500 mt-2">Please wait while we prepare your workspace</p>
    </div>
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
              <Route path="/test-redirect" element={<Navigate to="/" replace />} />

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
