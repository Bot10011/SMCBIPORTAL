import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import { ModalProvider } from './contexts/ModalContext';
import { DashboardAccessProvider } from './contexts/DashboardAccessContext';
import ProtectedRoute from './components/ProtectedRoute';
import { motion, AnimatePresence } from 'framer-motion';
import CreateUserModal from './components/CreateUserModal';
import { useModal } from './contexts/ModalContext';
import EditUserModal from './components/EditUserModal';
import MessageModal from './components/MessageModal';

// Import dashboard components
import LandingPage from './LandingPage';
import Login from './Login';
import AdminDashboard from './AdminDB/Dashboard';
import RegistrarDashboard from './RegistrarDB/Dashboard';
import ProgramHeadDashboard from './ProgramheadDB/Dashboard';
import TeacherDashboard from './TeacherDB/Dashboard';
import StudentDashboard from './StudentDB/Dashboard';
import SuperadminDashboard from './SuperadminDB/Dashboard';

// Create a separate component for the modal to use the context
function GlobalModal() {
  const { showCreateUserModal, setShowCreateUserModal } = useModal();

  return (
    <AnimatePresence>
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
    </AnimatePresence>
  );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ModalProvider>
        <DashboardAccessProvider>
          <div>
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
              }}
            />
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<Login />} />

              {/* SuperAdmin dashboard route */}
              <Route
                path="/superadmin/dashboard/*"
                element={
                  <ProtectedRoute allowedRoles={['superadmin']}>
                    <SuperadminDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Protected dashboard routes */}
              <Route
                path="/admin/dashboard/*"
                element={
                  <ProtectedRoute allowedRoles={['admin']} requiresAccessCheck={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />              <Route
                path="/registrar/dashboard/*"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'registrar']} requiresAccessCheck={true}>
                    <RegistrarDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/programhead/dashboard/*"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'registrar', 'program_head']} requiresAccessCheck={true}>
                    <ProgramHeadDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/teacher/dashboard/*"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'registrar', 'program_head', 'teacher']} requiresAccessCheck={true}>
                    <TeacherDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/student/dashboard/*"
                element={
                  <ProtectedRoute allowedRoles={['admin', 'registrar', 'program_head', 'teacher', 'student']} requiresAccessCheck={true}>
                    <StudentDashboard />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
          <GlobalModal />
          <EditUserModal />
          <MessageModal />
        </DashboardAccessProvider>
      </ModalProvider>
    </AuthProvider>
  );
};

export default App; 
