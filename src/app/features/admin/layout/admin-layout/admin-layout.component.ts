import { Component, OnInit } from '@angular/core';
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
export class AdminLayoutComponent implements OnInit {
    isSidebarOpen = true;

    ngOnInit() {
        // Remove any orphaned modal overlays that might be blocking the UI
        this.removeOrphanedOverlays();
    }

    removeOrphanedOverlays() {
        // Remove any modal-overlay elements that might be stuck in the DOM
        const overlays = document.querySelectorAll('.modal-overlay');
        overlays.forEach(overlay => overlay.remove());
    }

    toggleSidebar() {
        this.isSidebarOpen = !this.isSidebarOpen;
    }
}
