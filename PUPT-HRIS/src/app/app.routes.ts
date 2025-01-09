import { Routes } from '@angular/router';
import { MainLayoutComponent } from './main-layout/main-layout.component';
import { EmployeeComponent } from './pages/employees/employees.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { EducationComponent } from './pages/education/education.component';
import { NewAccountComponent } from './pages/new-account/new-account.component';
import { LoginComponent } from './login/login.component';
import { TrainingSeminarsComponent } from './pages/training-seminars/training-seminars.component';
import { OfficershipMembershipComponent } from './pages/membership/membership.component';
import { AchievementAwardComponent } from './pages/achievement/achievement.component';
import { BasicDetailsComponent } from './pages/basic-details/basic-details.component';
import { PersonalDetailsComponent } from './pages/personal-details/personal-details.component';
import { AuthGuard } from './services/auth.guard';
import { RoleGuard } from './services/role.guard';
import { ForgotPasswordComponent } from './forgot-password/forgot-password.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import { DepartmentManagementComponent } from './pages/department-management/department-management.component';
import { ProfileImageComponent } from './pages/profile-image/profile-image.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { UserManagementComponent } from './pages/user-management/user-management.component';
import { CoordinatorManagementComponent } from './pages/coordinator-management/coordinator-management.component';
import { AcademicRankComponent } from './pages/academic-rank/academic-rank.component';
import { CollegeCampusManagementComponent } from './pages/college-campus-management/college-campus-management.component';
import { CampusGuard } from './services/campus.guard';
import { EvaluationComponent } from './pages/evaluation/evaluation.component';
import { Page404Component } from './page-404/page-404.component';
import { ResourcesComponent } from './pages/resources/resources.component';
import { ProfessionalLicenseComponent } from './pages/professional-license/professional-license.component';
import { EmploymentInformationComponent } from './pages/employment-information/employment-information.component';
import { CertificationComponent } from './pages/certification/certification.component';
import { OAuthComponent } from './oauth/oauth-login/oauth-login.component';
import { OAuthConsentComponent } from './oauth/oauth-consent/oauth-consent.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'forgot-password', component: ForgotPasswordComponent },
  { path: 'reset-password', component: ResetPasswordComponent },
  { path: 'auth/oauth', component: OAuthComponent },
  { path: 'auth/oauth/consent', component: OAuthConsentComponent },
  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [AuthGuard, CampusGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      {
        path: 'departments',
        component: DepartmentManagementComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['superadmin', 'admin'] },
      },

      {
        path: 'employees',
        component: EmployeeComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['superadmin', 'admin'] },
      },
      {
        path: 'new-account',
        component: NewAccountComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['superadmin', 'admin'] },
      },
      {
        path: 'user-management',
        component: UserManagementComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['superadmin', 'admin'] },
      },

      {
        path: 'settings',
        component: SettingsComponent,
        canActivate: [AuthGuard],
      },

      {
        path: 'basic-details',
        component: BasicDetailsComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'personal-details',
        component: PersonalDetailsComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'educational-background',
        component: EducationComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'trainings-and-seminars',
        component: TrainingSeminarsComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'outstanding-achievement',
        component: AchievementAwardComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'officer-membership',
        component: OfficershipMembershipComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'profile-image',
        component: ProfileImageComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'academic-rank',
        component: AcademicRankComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'coordinator-management',
        component: CoordinatorManagementComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['superadmin', 'admin'] },
      },
      {
        path: 'college-campuses',
        component: CollegeCampusManagementComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['superadmin'] },
      },
      {
        path: 'evaluation',
        component: EvaluationComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['admin', 'superadmin'] },
      },
      { path: 'resources', component: ResourcesComponent },
      {
        path: 'professional-license',
        component: ProfessionalLicenseComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'employment-information',
        component: EmploymentInformationComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      {
        path: 'certification',
        component: CertificationComponent,
        canActivate: [RoleGuard],
        data: { expectedRoles: ['faculty', 'staff', 'admin', 'superadmin'] },
      },
      { path: '', redirectTo: '/dashboard', pathMatch: 'full' },
    ],
  },
  { path: '**', component: Page404Component },
];
