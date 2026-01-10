import { Routes } from '@angular/router';
import { AuthLayoutComponent } from './layout/auth-layout/auth-layout.component';
import { LandingLayoutComponent } from './layout/landing-layout/landing-layout.component';
import { DashboardLayoutComponent } from './layout/dashboard-layout/dashboard-layout.component';

export const routes: Routes = [
    // 1. Rutas Públicas de Landing
    {
        path: '',
        component: LandingLayoutComponent,
        children: [
            {
                path: '',
                loadComponent: () => import('./features/landing/landing.component').then(m => m.LandingPageComponent)
            },
            {
                path: 'search',
                loadComponent: () => import('./features/search/pages/advanced-search/advanced-search.component').then(m => m.AdvancedSearchComponent)
            },
            {
                path: 'search/researcher/:id',
                loadComponent: () => import('./features/search/pages/researcher-profile/researcher-profile.component').then(m => m.ResearcherPublicProfileComponent)
            }
        ]
    },

    // 2. Rutas Públicas de Autenticación
    {
        path: 'auth',
        component: AuthLayoutComponent,
        children: [
            {
                path: 'login',
                loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
            },
            {
                path: 'register',
                loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
            },
            {
                path: 'recover-password',
                loadComponent: () => import('./features/auth/recover-password/recover-password.component').then(m => m.RecoverPasswordComponent)
            },
            { path: '', redirectTo: 'login', pathMatch: 'full' }
        ]
    },

    // 3. Rutas Privadas del Dashboard
    {
        path: 'app',
        component: DashboardLayoutComponent,
        children: [
            { path: '', redirectTo: 'profile', pathMatch: 'full' },
            {
                path: 'profile',
                loadComponent: () => import('./features/dashboard/profile/profile.component').then(m => m.ProfileLayoutComponent),
                children: [
                    { path: '', redirectTo: 'general', pathMatch: 'full' },
                    {
                        path: 'general',
                        loadComponent: () => import('./features/dashboard/profile/pages/general-info/general-info.component').then(m => m.GeneralInfoComponent)
                    },
                    {
                        path: 'identity',
                        loadComponent: () => import('./features/dashboard/profile/pages/identity-validation/identity-validation.component').then(m => m.IdentityValidationComponent)
                    },
                    {
                        path: 'languages',
                        loadComponent: () => import('./features/dashboard/profile/pages/languages/languages.component').then(m => m.LanguagesComponent)
                    },
                    {
                        path: 'identifiers',
                        loadComponent: () => import('./features/dashboard/profile/pages/other-identifiers/other-identifiers.component').then(m => m.OtherIdentifiersComponent)
                    },
                    {
                        path: 'education',
                        loadComponent: () => import('./features/dashboard/profile/pages/education/education.component').then(m => m.EducationComponent)
                    },
                    {
                        path: 'work-experience',
                        loadComponent: () => import('./features/dashboard/profile/pages/work-experience/work-experience.component').then(m => m.WorkExperienceComponent)
                    },
                    {
                        path: 'research-lines',
                        loadComponent: () => import('./features/dashboard/profile/pages/research-lines/research-lines.component').then(m => m.ResearchLinesComponent)
                    },
                    {
                        path: 'projects',
                        loadComponent: () => import('./features/dashboard/profile/pages/projects/projects.component').then(m => m.ProjectsComponent)
                    },
                    {
                        path: 'technological-production',
                        loadComponent: () => import('./features/dashboard/profile/pages/technological-production/technological-production.component').then(m => m.TechnologicalProductionComponent)
                    },
                    {
                        path: 'scientific-production',
                        loadComponent: () => import('./features/dashboard/profile/pages/scientific-production/scientific-production.component').then(m => m.ScientificProductionComponent)
                    },
                    {
                        path: 'distinctions',
                        loadComponent: () => import('./features/dashboard/profile/pages/distinctions/distinctions.component').then(m => m.DistinctionsComponent)
                    },
                    {
                        path: 'settings',
                        loadComponent: () => import('./features/dashboard/profile/pages/settings/settings.component').then(m => m.SettingsComponent)
                    },
                    // Reusing GeneralInfoComponent for privacy tab for now
                    {
                        path: 'privacy',
                        loadComponent: () => import('./features/dashboard/profile/pages/privacy-security/privacy-security.component').then(m => m.PrivacySecurityComponent)
                    }
                ]
            }
        ]
    },

    // 4. Panel Administrativo (Nuevo)
    {
        path: 'admin',
        loadComponent: () => import('./features/admin/layout/admin-layout/admin-layout.component').then(m => m.AdminLayoutComponent),
        children: [
            { path: '', redirectTo: 'analytics', pathMatch: 'full' },
            {
                path: 'analytics',
                loadComponent: () => import('./features/admin/pages/analytics/analytics.component').then(m => m.AnalyticsComponent)
            },
            {
                path: 'users',
                loadComponent: () => import('./features/admin/pages/user-management/user-management.component').then(m => m.UserManagementComponent)
            },
            {
                path: 'researchers',
                loadComponent: () => import('./features/admin/pages/researcher-management').then(m => m.ResearcherManagementComponent)
            },
            {
                path: 'researchers/:id/public-profile',
                loadComponent: () => import('./features/admin/pages/admin-researcher-profile/admin-researcher-profile.component').then(m => m.AdminResearcherProfileComponent)
            },
            {
                path: 'landing-config',
                loadComponent: () => import('./features/admin/pages/landing-config/landing-config.component').then(m => m.LandingConfigComponent)
            },
            {
                path: 'portal-config',
                loadComponent: () => import('./features/admin/pages/portal-config/portal-config.component').then(m => m.PortalConfigComponent)
            },
            {
                path: 'institutions',
                loadComponent: () => import('./features/admin/pages/institution-management/institution-management.component').then(m => m.InstitutionManagementComponent)
            }
        ]
    },

    // Fallback
    { path: '**', redirectTo: '' }
];
