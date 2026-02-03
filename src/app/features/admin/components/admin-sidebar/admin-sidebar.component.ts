import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
    selector: 'app-admin-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './admin-sidebar.component.html',
    styleUrl: './admin-sidebar.component.scss'
})
export class AdminSidebarComponent {
    @Output() toggle = new EventEmitter<void>();
    private authService = inject(AuthService);
    router = inject(Router);

    get isInvestigador(): boolean {
        return this.authService.isInvestigador();
    }

    get isSuperAdmin(): boolean {
        return this.authService.isSuperAdmin();
    }

    get isAdmin(): boolean {
        return this.authService.isAdmin();
    }

    get isConsulta(): boolean {
        return this.authService.isConsulta();
    }

    canSee(menu: string): boolean {
        if (this.isSuperAdmin || this.isAdmin) return true;

        switch (menu) {
            case 'researchers':
                return this.isConsulta; // Rol consulta solo tiene acceso a gestión de investigadores
            default:
                return false;
        }
    }
}
