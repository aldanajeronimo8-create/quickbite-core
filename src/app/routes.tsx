import { createBrowserRouter } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { CoreStudentMenuPage } from './pages/student/CoreStudentMenuPage';
import { CoreParentPage } from './pages/parent/CoreParentPage';
import { StaffDashboardPage } from './pages/staff/StaffDashboardPage';
import { StaffOrdersPage } from './pages/staff/StaffOrdersPage';
import { CoreAdminPage } from './pages/admin/CoreAdminPage';
import { CoreAdminUsersPage } from './pages/admin/CoreAdminUsersPage';

const router = createBrowserRouter([
  { path: '/', element: <LoginPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/menu', element: <RoleProtectedRoute role="student"><CoreStudentMenuPage /></RoleProtectedRoute> },
  { path: '/parent/family', element: <RoleProtectedRoute role="parent"><CoreParentPage /></RoleProtectedRoute> },
  { path: '/staff', element: <RoleProtectedRoute role="staff"><StaffDashboardPage /></RoleProtectedRoute> },
  { path: '/staff/orders', element: <RoleProtectedRoute role="staff"><StaffOrdersPage /></RoleProtectedRoute> },
  { path: '/admin', element: <RoleProtectedRoute role="admin"><CoreAdminPage /></RoleProtectedRoute> },
  { path: '/admin/users', element: <RoleProtectedRoute role="admin"><CoreAdminUsersPage /></RoleProtectedRoute> },
  { path: '*', element: <LoginPage /> },
]);

export { router };
