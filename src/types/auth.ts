export type UserRole = 'superadmin' | 'admin' | 'registrar' | 'programhead' | 'teacher' | 'student';
export type StudentStatus = 'regular' | 'irregular' | 'transferee';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  isAuthenticated: boolean;
  studentStatus?: StudentStatus; // Only for student role
}

export interface RolePermissions {
  canCreateUsers: UserRole[];
  canManageCurriculum: boolean;
  canManageGrades: boolean;
  canViewAllData: boolean;
  canManageEnrollment: boolean;
  canManageSubjects: boolean;
}

export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  superadmin: {
    canCreateUsers: ['admin', 'registrar', 'programhead', 'teacher', 'student'],
    canManageCurriculum: true,
    canManageGrades: true,
    canViewAllData: true,
    canManageEnrollment: true,
    canManageSubjects: true,
  },
  admin: {
    canCreateUsers: ['registrar', 'programhead', 'teacher', 'student'],
    canManageCurriculum: true,
    canManageGrades: true,
    canViewAllData: true,
    canManageEnrollment: true,
    canManageSubjects: true,
  },
  registrar: {
    canCreateUsers: ['programhead', 'teacher', 'student'],
    canManageCurriculum: false,
    canManageGrades: false,
    canViewAllData: true,
    canManageEnrollment: true,
    canManageSubjects: false,
  },
  programhead: {
    canCreateUsers: ['teacher', 'student'],
    canManageCurriculum: true,
    canManageGrades: false,
    canViewAllData: false,
    canManageEnrollment: false,
    canManageSubjects: true,
  },
  teacher: {
    canCreateUsers: [],
    canManageCurriculum: false,
    canManageGrades: true,
    canViewAllData: false,
    canManageEnrollment: false,
    canManageSubjects: false,
  },
  student: {
    canCreateUsers: [],
    canManageCurriculum: false,
    canManageGrades: false,
    canViewAllData: false,
    canManageEnrollment: false,
    canManageSubjects: false,
  },
}; 