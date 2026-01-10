import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/auth.models';
import { Observable } from 'rxjs';

@Component({
    selector: 'app-profile-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss'
})
export class ProfileLayoutComponent implements OnInit {
    showGeneralSubTabs = false;
    user$: Observable<AuthResponse | null>;

    constructor(
        private router: Router,
        private authService: AuthService
    ) {
        this.user$ = this.authService.currentUser$;
    }

    ngOnInit() {
        this.checkSubTabsVisibility();
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.checkSubTabsVisibility();
            }
        });
    }

    getInitials(user: AuthResponse | null): string {
        if (!user) return 'Inv';
        const first = user.nombres ? user.nombres.charAt(0) : '';
        const last = user.apellidoPaterno ? user.apellidoPaterno.charAt(0) : '';
        return (first + last).toUpperCase();
    }

    getLocation(user: AuthResponse | null): string {
        if (!user) return 'No especificado';
        const parts = [user.distrito, user.provincia, user.departamento].filter(Boolean);
        return parts.length > 0 ? parts.join(', ') : 'Perú';
    }

    private checkSubTabsVisibility() {
        const url = this.router.url;
        // Show subtabs only if we are in the "General" section (including its subs)
        this.showGeneralSubTabs = url.includes('/general') ||
            url.includes('/identity') ||
            url.includes('/identifiers') ||
            url.includes('/privacy') ||
            url.endsWith('/profile') ||
            url.endsWith('/profile/'); // Default redirect
    }
}
