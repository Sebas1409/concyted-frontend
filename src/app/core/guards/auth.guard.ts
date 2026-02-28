import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

/**
 * Guard to protect private routes by ensuring the user is logged in.
 */
export const authGuard: CanActivateFn = (route, state) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (authService.getCurrentUser()) {
        return true;
    }

    console.warn('Access denied: User not authenticated. Redirecting to login.');
    router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
    return false;
};
