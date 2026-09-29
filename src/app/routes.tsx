import { lazy,Suspense } from 'react';
import type { ComponentType } from 'react';
import { createBrowserRouter,Navigate } from 'react-router-dom';
import { AdminExperienceLayoutClean } from './layouts/AdminExperienceLayoutClean';
import { StudentExperienceLayout } from './layouts/StudentExperienceLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AdminProtectedDataGate } from './components/AdminProtectedDataGate';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { AuthRedirect } from './components/AuthRedirect';
import { LoginPage } from './pages/LoginPage';
import { SetupWizardPage } from './pages/SetupWizardPage';
import { QuickBiteLogo } from './components/brand/QuickBiteLogo';
import { StudentFeatureCenter } from './pages/student/StudentFeatureCenter';
import { CoreStudentFeaturePage } from './pages/student/CoreStudentFeaturePage';
import { CoreParentFeaturePage } from './pages/parent/CoreParentFeaturePage';
import { CoreAdminFeaturePage } from './pages/admin/CoreAdminFeaturePage';
import { CoreAdminUsersPage } from './pages/admin/CoreAdminUsersPage';
import { CoreAdminAcademicPage } from './pages/admin/CoreAdminAcademicPage';
import { CoreAdminRecessSchedulesPage } from './pages/admin/CoreAdminRecessSchedulesPage';
import { CoreStaffVerificationPage } from './pages/staff/CoreStaffVerificationPage';
import { CoreOrderVerificationPage } from './pages/CoreOrderVerificationPage';
import StudentOrderWindows from './components/student/StudentOrderWindows';

const RegisterPage=lazy(()=>import('./pages/RegisterPage').then(m=>({default:m.RegisterPage})));
const ForgotPasswordPage=lazy(()=>import('./pages/ForgotPasswordPage').then(m=>({default:m.ForgotPasswordPage})));
const ResetPasswordPage=lazy(()=>import('./pages/ResetPasswordPage').then(m=>({default:m.ResetPasswordPage})));
const RoleSelectionPage=lazy(()=>import('./pages/RoleSelectionPage').then(m=>({default:m.RoleSelectionPage})));
const AccountTypeChoicePage=lazy(()=>import('./pages/AccountTypeChoicePage').then(m=>({default:m.AccountTypeChoicePage})));
const StudentRegisterPage=lazy(()=>import('./pages/student/StudentRegisterPage').then(m=>({default:m.StudentRegisterPage})));
const ParentRegisterPage=lazy(()=>import('./pages/ParentRegisterPage').then(m=>({default:m.ParentRegisterPage})));
const StaffDashboardPage=lazy(()=>import('./pages/staff/StaffDashboardPage').then(m=>({default:m.StaffDashboardPage})));
const StaffOrdersPage=lazy(()=>import('./pages/staff/StaffOrdersPage').then(m=>({default:m.StaffOrdersPage})));
const StaffFeatureCenter=lazy(()=>import('./pages/staff/StaffFeatureCenter').then(m=>({default:m.StaffFeatureCenter})));
const QuickBiteFeatureCenter=lazy(()=>import('./pages/admin/QuickBiteFeatureCenter').then(m=>({default:m.QuickBiteFeatureCenter})));

function PageLoader(){return <div className="grid min-h-screen place-items-center bg-slate-50 text-sm font-bold text-slate-600"><div className="flex flex-col items-center gap-3"><QuickBiteLogo className="h-16 w-16 rounded-2xl"/><span>Cargando...</span></div></div>}
function lazyPage(Component:ComponentType){return <Suspense fallback={<PageLoader/>}><Component/></Suspense>}

export const router=createBrowserRouter([
 {path:'/',element:<LoginPage/>},{path:'/login',element:<LoginPage/>},
 {path:'/register-student',element:lazyPage(AccountTypeChoicePage)},{path:'/register-student/form',element:lazyPage(StudentRegisterPage)},{path:'/register-parent',element:lazyPage(ParentRegisterPage)},
 {path:'/parent/family',element:<RoleProtectedRoute role="parent"><CoreParentFeaturePage/></RoleProtectedRoute>},{path:'/parent/food-controls',element:<RoleProtectedRoute role="parent"><CoreParentFeaturePage/></RoleProtectedRoute>},{path:'/parent/wellbeing',element:<RoleProtectedRoute role="parent"><CoreParentFeaturePage/></RoleProtectedRoute>},
 {path:'/verify-order',element:<CoreOrderVerificationPage/>},
 {path:'/menu',element:<RoleProtectedRoute role="student"><StudentExperienceLayout/></RoleProtectedRoute>},
 {path:'/student/features',element:<RoleProtectedRoute role="student"><StudentFeatureCenter/></RoleProtectedRoute>},
 {path:'/student/order-windows',element:<RoleProtectedRoute role="student"><StudentOrderWindows/></RoleProtectedRoute>},
 {path:'/student/reviews',element:<RoleProtectedRoute role="student"><CoreStudentFeaturePage/></RoleProtectedRoute>},{path:'/student/account',element:<RoleProtectedRoute role="student"><CoreStudentFeaturePage/></RoleProtectedRoute>},{path:'/student/wallet',element:<RoleProtectedRoute role="student"><CoreStudentFeaturePage/></RoleProtectedRoute>},{path:'/student/history',element:<RoleProtectedRoute role="student"><CoreStudentFeaturePage/></RoleProtectedRoute>},{path:'/student/rewards',element:<RoleProtectedRoute role="student"><CoreStudentFeaturePage/></RoleProtectedRoute>},{path:'/student/favorites',element:<RoleProtectedRoute role="student"><CoreStudentFeaturePage/></RoleProtectedRoute>},{path:'/student/link-code',element:<RoleProtectedRoute role="student"><CoreStudentFeaturePage/></RoleProtectedRoute>},{path:'/student/notifications',element:<RoleProtectedRoute role="student"><CoreStudentFeaturePage/></RoleProtectedRoute>},
 {path:'/choose-role',element:lazyPage(RoleSelectionPage)},
 {path:'/staff',element:<RoleProtectedRoute role="staff">{lazyPage(StaffDashboardPage)}</RoleProtectedRoute>},{path:'/staff/features',element:<RoleProtectedRoute role="staff">{lazyPage(StaffFeatureCenter)}</RoleProtectedRoute>},{path:'/staff/orders',element:<RoleProtectedRoute role="staff">{lazyPage(StaffOrdersPage)}</RoleProtectedRoute>},{path:'/staff/verification',element:<RoleProtectedRoute role="staff"><CoreStaffVerificationPage/></RoleProtectedRoute>},
 {path:'/register',element:<AuthRedirect><Suspense fallback={<PageLoader/>}><RegisterPage/></Suspense></AuthRedirect>},{path:'/forgot-password',element:lazyPage(ForgotPasswordPage)},{path:'/reset-password',element:lazyPage(ResetPasswordPage)},{path:'/setup',element:<SetupWizardPage/>},
 {path:'/admin',element:<ProtectedRoute><AdminProtectedDataGate><AdminExperienceLayoutClean/></AdminProtectedDataGate></ProtectedRoute>,children:[
   {index:true,element:<CoreAdminFeaturePage/>},{path:'features',element:lazyPage(QuickBiteFeatureCenter)},{path:'operations',element:<CoreAdminFeaturePage/>},{path:'rankings',element:<CoreAdminFeaturePage/>},{path:'reviews',element:<CoreAdminFeaturePage/>},{path:'orders',element:<CoreAdminFeaturePage/>},{path:'payments',element:<CoreAdminFeaturePage/>},{path:'wallet',element:<CoreAdminFeaturePage/>},{path:'inventory',element:<CoreAdminFeaturePage/>},{path:'menu',element:<CoreAdminFeaturePage/>},{path:'nutrition',element:<CoreAdminFeaturePage/>},{path:'verification',element:<CoreAdminFeaturePage/>},{path:'users',element:<CoreAdminUsersPage/>},{path:'academic',element:<CoreAdminAcademicPage/>},{path:'recess',element:<CoreAdminRecessSchedulesPage/>},{path:'loyalty',element:<CoreAdminFeaturePage/>},{path:'reports',element:<CoreAdminFeaturePage/>},{path:'history',element:<CoreAdminFeaturePage/>},{path:'system',element:<CoreAdminFeaturePage/>},{path:'reset',element:<CoreAdminFeaturePage/>}
 ]},
 {path:'*',element:<Navigate to="/" replace/>}
]);