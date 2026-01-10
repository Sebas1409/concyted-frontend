import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    // Excluded endpoints that should not receive the token
    const excludedUrls = [
        '/auth/login',
        '/auth/register',
        '/auth/password-reset',
        '/investigadores' // registration endpoint
    ];

    // Check if the current request URL matches any excluded URL
    const isExcluded = excludedUrls.some(url => req.url.includes(url));

    if (isExcluded) {
        return next(req);
    }

    // Retrieve the token directly from local storage
    const token = localStorage.getItem('accessToken');

    if (token) {
        const clonedReq = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        });
        return next(clonedReq);
    }

    return next(req);
};
