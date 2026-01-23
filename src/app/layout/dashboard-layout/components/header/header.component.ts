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

    getPhotoUrl(): string {
        if (this.user && this.user.fotoToken) {
            // Photos are public by default based on upload config
            return this.fileService.getFileUrl(this.user.fotoToken, true);
        }
        // Fallback to placeholder
        const username = this.user ? this.user.username : 'User';
        return `https://i.pravatar.cc/150?u=${username}`;
    }

    logout() {
        console.log('HeaderComponent: Logout clicked');
        this.authService.logout();
        this.router.navigate(['/auth/login']);
    }
}
