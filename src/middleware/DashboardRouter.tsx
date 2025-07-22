import React, { lazy } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const AdminDashboard = lazy(() => import('../AdminDB/Dashboard'));
const RegistrarDashboard = lazy(() => import('../RegistrarDB/Dashboard'));
const ProgramHeadDashboard = lazy(() => import('../ProgramheadDB/Dashboard'));
const TeacherDashboard = lazy(() => import('../TeacherDB/Dashboard'));
const StudentDashboard = lazy(() => import('../StudentDB/Dashboard'));
const SuperadminDashboard = lazy(() => import('../SuperadminDB/Dashboard'));

const DashboardRouter: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;

  switch (user.role) {
    case 'superadmin':
      return <SuperadminDashboard />;
    case 'admin':
      return <AdminDashboard />;
    case 'registrar':
      return <RegistrarDashboard />;
    case 'program_head':
      return <ProgramHeadDashboard />;
    case 'teacher':
      return <TeacherDashboard />;
    case 'student':
      return <StudentDashboard />;
    default:
      return <div>Access Denied: Unknown role</div>;
  }
};

export default DashboardRouter; 