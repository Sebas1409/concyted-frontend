import { Component, EventEmitter, Output, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';
import { FileService } from '../../../../core/services/file.service';

@Component({
    selector: 'app-dashboard-header',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent {
    @Output() toggle = new EventEmitter<void>();
    @Input() isSidebarClosed = false;
    user: any = null;

    constructor(
        private authService: AuthService,
        private router: Router,
        private fileService: FileService
    ) {
        this.authService.currentUser$.subscribe(u => {
            this.user = u;
        });

        // Try to restore session if null (e.g. on refresh)
        if (!this.user) {
            this.authService.restoreSession();
        }
    }

    getPhotoUrl(): string | null {
        if (this.user && this.user.fotoToken) {
            return this.fileService.getFileUrl(this.user.fotoToken, true);
        }
        return null;
    }

    get initials(): string {
        if (!this.user) return '';
        const first = this.user.nombres ? this.user.nombres.charAt(0) : '';
        const last = this.user.apellidoPaterno ? this.user.apellidoPaterno.charAt(0) : '';
        if (!first && !last && this.user.username) return this.user.username.charAt(0).toUpperCase();
        return (first + last).toUpperCase();
    }

    logout() {
        console.log('HeaderComponent: Logout clicked');
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}
