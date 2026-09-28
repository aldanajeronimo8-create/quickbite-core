import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { ParentRegisterPage } from './pages/ParentRegisterPage';
import { StudentRegisterPage } from './pages/student/StudentRegisterPage';
import { PublicHomePage } from './pages/PublicHomePage';
import { PrivacyPage } from './pages/PrivacyPage';
import { DataRightsPage } from './pages/DataRightsPage';
import { TermsPage } from './pages/TermsPage';
import { GoogleOnboardingPage } from './pages/GoogleOnboardingPage';
import { GoogleCompletePage } from './pages/GoogleCompletePage';
import { FirebaseOnboardingPage } from './pages/FirebaseOnboardingPage';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { CoreStudentMenuPage } from './pages/student/CoreStudentMenuPage';
import { CoreParentPage } from './pages/parent/CoreParentPage';
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage';
import { StaffOrdersPage } from './pages/staff/StaffOrdersPage';
import { CoreAdminPage } from './pages/admin/CoreAdminPage';
import { CoreAdminUsersPage } from './pages/admin/CoreAdminUsersPage';
import { CoreAdminRecessSchedulesPage } from './pages/admin/CoreAdminRecessSchedulesPage';
import { CoreAdminAcademicPage } from './pages/admin/CoreAdminAcademicPage';

const router = createBrowserRouter([
  { path: '/', element: <PublicHomePage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/register-parent', element: <ParentRegisterPage /> },
  { path: '/register-student', element: <StudentRegisterPage /> },
  { path: '/privacy', element: <PrivacyPage /> },
  { path: '/data-rights', element: <DataRightsPage /> },
  { path: '/terms', element: <TermsPage /> },
  { path: '/google/onboarding', element: <GoogleOnboardingPage /> },
  { path: '/google/complete', element: <GoogleCompletePage /> },
  { path: '/firebase/onboarding', element: <FirebaseOnboardingPage /> },
  { path: '/menu', element: <RoleProtectedRoute role="student"><CoreStudentMenuPage /></RoleProtectedRoute> },
  { path: '/parent/family', element: <RoleProtectedRoute role="parent"><CoreParentPage /></RoleProtectedRoute> },
  { path: '/staff', element: <RoleProtectedRoute role="staff"><StaffDashboardPage /></RoleProtectedRoute> },
  { path: '/staff/orders', element: <RoleProtectedRoute role="staff"><StaffOrdersPage /></RoleProtectedRoute> },
  { path: '/admin', element: <RoleProtectedRoute role="admin"><CoreAdminPage /></RoleProtectedRoute> },
  { path: '/admin/users', element: <RoleProtectedRoute role="admin"><CoreAdminUsersPage /></RoleProtectedRoute> },
  { path: '/admin/recess', element: <RoleProtectedRoute role="admin"><CoreAdminRecessSchedulesPage /></RoleProtectedRoute> },
  { path: '/admin/academic', element: <RoleProtectedRoute role="admin"><CoreAdminAcademicPage /></RoleProtectedRoute> },
  { path: '*', element: <LoginPage /> },
]);

export { router };
