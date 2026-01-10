import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';

@Component({
    selector: 'app-admin-sidebar',
    standalone: true,
    imports: [CommonModule, RouterLink, RouterLinkActive],
    templateUrl: './admin-sidebar.component.html',
    styleUrl: './admin-sidebar.component.scss'
})
export class AdminSidebarComponent {
    @Output() toggle = new EventEmitter<void>();

    constructor(public router: Router) { }
}
