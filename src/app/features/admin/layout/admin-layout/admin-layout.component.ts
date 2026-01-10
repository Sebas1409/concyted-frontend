import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { AdminSidebarComponent } from '../../components/admin-sidebar/admin-sidebar.component';
import { HeaderComponent } from '../../../../layout/dashboard-layout/components/header/header.component';

@Component({
    selector: 'app-admin-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, AdminSidebarComponent, HeaderComponent],
    templateUrl: './admin-layout.component.html',
    styleUrl: './admin-layout.component.scss'
})
export class AdminLayoutComponent {
    isSidebarOpen = true;

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }
}
