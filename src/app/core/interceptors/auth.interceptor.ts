import { HttpInterceptorFn, HttpErrorResponse, HttpRequest, HttpHandlerFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, Subject, Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

// State to manage the refreshing process safely
let isRefreshing = false;
let refreshTokenSubject = new Subject<string | null>();

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const authService = inject(AuthService);
    const router = inject(Router);

    // Check if it's a public API
    let isExcluded = req.url.includes('/public/');

    if (!isExcluded) {
        // Only exclude these exact paths if they are in the URL
        const exactExclusions = [
            '/auth/login',
            '/auth/register',
            '/auth/password-reset',
            '/auth/refresh'
        ];
        // Ensure we don't accidentally match part of a larger URL inappropriately
        isExcluded = exactExclusions.some(url => req.url.includes(url));
    }

    // El registro de investigadores es público (POST), pero las consultas de perfil (GET, PUT) sí requieren token
    // Y debemos asegurarnos de que NO se excluya '/v2/investigadores/usuario'
    if (req.url.includes('/v2/investigadores') && req.method === 'POST' && !req.url.includes('/usuario')) {
        isExcluded = true;
    }

    if (isExcluded) {
        console.log(`[Interceptor] Petición EXCLUIDA de token: ${req.url}`);
        return next(req);
    }

    // Retrieve the token directly from local storage
    const token = localStorage.getItem('accessToken');
    let clonedReq = req;

    if (token) {
        clonedReq = addTokenHeader(req, token);
        console.log(`[Interceptor] Token adjuntado para: ${req.url}. Cabecera Authorization:`, clonedReq.headers.get('Authorization'));
    } else {
        console.warn(`[Interceptor] NO SE ENCONTRÓ TOKEN para: ${req.url}`);
    }

    return next(clonedReq).pipe(
        catchError((error: HttpErrorResponse) => {
            if (error.status === 401) {
                console.error('[Interceptor] 401 Unauthorized detected. Clearing session and redirecting.');
                authService.logout();
                router.navigate(['/auth/login']);
            }
            return throwError(() => error);
        })
    );
};

function addTokenHeader(request: HttpRequest<any>, token: string) {
    return request.clone({
        setHeaders: {
            Authorization: `Bearer ${token}`
        }
    });
}
