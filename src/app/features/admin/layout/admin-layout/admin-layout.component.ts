import { Component, OnInit, HostListener } from '@angular/core';
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
    isSidebarOpen = window.innerWidth > 992;

    ngOnInit() {
        // Remove any orphaned modal overlays that might be blocking the UI
        this.removeOrphanedOverlays();
    }

    @HostListener('window:resize', ['$event'])
    onResize(event: any) {
        // Automatically hide sidebar on mobile/tablet when resizing
        if (event.target.innerWidth <= 992 && this.isSidebarOpen) {
            this.isSidebarOpen = false;
        } else if (event.target.innerWidth > 992 && !this.isSidebarOpen) {
            this.isSidebarOpen = true;
        }
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
