import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { LandingSection, LandingHeader } from '../../../../core/services/landing.service';
import { AuthService } from '../../../../core/services/auth.service';
import { AuthResponse } from '../../../../core/models/auth.models';
import { FileService } from '../../../../core/services/file.service';
import { ROLES } from '../../../../core/constants/roles.constants';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-landing-header',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnChanges, OnInit {
    @Input() sectionData: LandingSection | undefined;

    public openMobile = false;
    public ctaHeader: LandingHeader | null = null;
    public currentUser: AuthResponse | null = null;
    public manualUrl = (environment as any).manualUrl || '/docs/manual.pdf';
    public showUserMenu = false;
    public userPhotoUrl: string | null = null;

    constructor(
        private authService: AuthService,
        private fileService: FileService,
        private router: Router
    ) { }

    ngOnInit(): void {
        this.authService.currentUser$.subscribe(user => {
            this.currentUser = user;
            if (user && user.fotoToken) {
                this.userPhotoUrl = this.fileService.getFileUrl(user.fotoToken, true);
            } else {
                this.userPhotoUrl = null;
            }
        });
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['sectionData'] && this.sectionData && this.sectionData.encabezado) {
            if (this.isBannerActive(this.sectionData.encabezado)) {
                this.ctaHeader = this.sectionData.encabezado;
            } else {
                this.ctaHeader = null;
            }
        }
    }

    getInitials(): string {
        if (!this.currentUser) return '?';
        const n = this.currentUser.nombres?.charAt(0) || '';
        const a = this.currentUser.apellidoPaterno?.charAt(0) || '';
        return (n + a).toUpperCase();
    }

    getDisplayName(): string {
        if (!this.currentUser) return '';
        return `${this.currentUser.nombres || ''} ${this.currentUser.apellidoPaterno || ''}`.trim();
    }

    getProfileRoute(): string {
        const roles = this.authService.getUserRoles();
        if (roles.includes(ROLES.INVESTIGADOR)) {
            return '/app';
        }
        return '/admin';
    }

    toggleUserMenu(event: Event) {
        event.stopPropagation();
        this.showUserMenu = !this.showUserMenu;
    }

    closeUserMenu() {
        this.showUserMenu = false;
    }

    logout() {
        this.showUserMenu = false;
        // Clear session without letting AuthService redirect to /auth/login
        localStorage.clear();
        this.currentUser = null;
        this.userPhotoUrl = null;
        // Navigate to landing page so the header shows 'Iniciar sesión'
        this.router.navigate(['/']);
    }

    private isBannerActive(header: LandingHeader): boolean {
        if (!header || !header.titulo) return false;

        const now = new Date();
        let isValid = true;

        if (header.fechaInicio) {
            const start = this.parseDateLocal(header.fechaInicio);
            start.setHours(0, 0, 0, 0);
            if (now < start) isValid = false;
        }

        if (header.fechaFin) {
            const end = this.parseDateLocal(header.fechaFin);
            end.setHours(23, 59, 59, 999);
            if (now > end) isValid = false;
        }

        return isValid;
    }

    private parseDateLocal(dateStr: string): Date {
        const cleanDate = dateStr.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        return new Date(dateStr);
    }
}
