import { Component, EventEmitter, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive, Router } from '@angular/router';
import { AuthService } from '../../../../core/services/auth.service';

@Component({
  selector: 'app-dashboard-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  @Output() toggle = new EventEmitter<void>();
  private authService = inject(AuthService);
  router = inject(Router);

  get isAdmin(): boolean {
    const user = this.authService.getCurrentUser();
    // Specified user 'jcastillo' or matching admin roles
    return this.authService.isAdmin() || user?.username === 'jcastillo';
  }
}
