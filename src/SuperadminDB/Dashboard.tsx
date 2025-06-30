import React from 'react';
import { Routes, Route } from 'react-router-dom';
import DashboardLayout from '../components/Sidebar';
import AccessControl from './AccessControl';
import SystemMonitoring from './SystemMonitoring';
import UserOverview from './UserOverview';
import AuditLogs from './AuditLogs';
import SystemSettings from './SystemSettings';
import { FeedbackViewer } from './FeedbackViewer';

const SuperadminDashboard: React.FC = () => {
  return (
    <DashboardLayout>
      <Routes>
        <Route path="/" element={<SystemMonitoring />} />
        <Route path="/users" element={<UserOverview />} />
        <Route path="/access-control" element={<AccessControl />} />
        <Route path="/audit-logs" element={<AuditLogs />} />
        <Route path="/settings" element={<SystemSettings />} />
        <Route path="/feedback" element={<FeedbackViewer />} />
      </Routes>
    </DashboardLayout>
  );
};

export default SuperadminDashboard;
