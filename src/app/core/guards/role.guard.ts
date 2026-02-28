import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Functional Route Guard based on roles.
 * Checks if the current user has any of the roles specified in the route data.
 * 
 * @param allowedRoles List of roles that have access to this route.
 * @returns An implementation of CanActivateFn.
 */
export const roleGuard = (allowedRoles: string[]): CanActivateFn => {
    return (route, state) => {
        const authService = inject(AuthService);
        const router = inject(Router);

        // If no user is logged in, redirect to login
        if (!authService.getCurrentUser()) {
            router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
            return false;
        }

        const userRoles = authService.getUserRoles();
        const hasAccess = allowedRoles.some(role => userRoles.includes(role));

        if (hasAccess) {
            return true;
        }

        console.error(`Access Denied: User roles [${userRoles}] do not match allowed roles [${allowedRoles}].`);

        // Basic logic to redirect depending on role:
        if (authService.isAdmin() || authService.isSuperAdmin()) {
            router.navigate(['/admin']);
        } else if (authService.isInvestigador()) {
            router.navigate(['/app']);
        } else {
            router.navigate(['/']);
        }

        return false;
    };
};
