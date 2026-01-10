import { Component, ChangeDetectorRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserRegistryModalComponent } from '../../components/user-registry-modal/user-registry-modal.component';
import { RoleAssignmentModalComponent } from '../../components/role-assignment-modal/role-assignment-modal.component';
import { UserService, UserProfileApi } from '../../../../core/services/user.service';
import { AlertService } from '../../../../core/services/alert.service';

interface User {
    id: string;
    account: string;
    name: string;
    email: string;
    area: string;
    status: string;
    selected: boolean;
    raw?: UserProfileApi;
}

@Component({
    selector: 'app-user-management',
    standalone: true,
    imports: [CommonModule, FormsModule, UserRegistryModalComponent, RoleAssignmentModalComponent],
    templateUrl: './user-management.component.html',
    styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit {
    private userService = inject(UserService);
    private alertService = inject(AlertService);
    activeTab: 'users' | 'roles' = 'users';
    searchTerm: string = '';

    // Data
    users: User[] = [];
    selectedUser: UserProfileApi | null = null;

    // Pagination
    currentPage: number = 1;
    pageSize: number = 10;
    totalItems: number = 0;

    // Modals
    showRegistryModal: boolean = false;
    showRoleModal: boolean = false;

    constructor(private cdr: ChangeDetectorRef) { }

    ngOnInit() {
        this.loadUsers();
    }

    loadUsers() {
        this.userService.getUsers().subscribe({
            next: (data) => {
                this.users = data.map(u => ({
                    id: u.id.toString(),
                    account: u.numDoc || u.username || 'Sin registro',
                    name: `${u.nombres || ''} ${u.apellidoPaterno || ''} ${u.apellidoMaterno || ''}`.trim() || 'Sin registro',
                    email: u.email || 'Sin registro',
                    area: 'Sin registro',
                    status: u.enabled ? 'Activo' : 'Inactivo',
                    selected: false,
                    raw: u
                }));
                this.totalItems = this.users.length;
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading users', err);
                this.alertService.error('Error', 'No se pudieron cargar los usuarios');
            }
        });
    }

    toggleTab(tab: 'users' | 'roles') {
        this.activeTab = tab;
    }

    openRegistryModal() {
        this.selectedUser = null;
        this.showRegistryModal = true;
    }

    closeRegistryModal() {
        this.showRegistryModal = false;
        this.selectedUser = null;
        this.loadUsers(); // Refresh after registry
    }

    openRoleModal() {
        this.showRoleModal = true;
    }

    closeRoleModal() {
        this.showRoleModal = false;
    }

    editUser(user: User) {
        if (user.raw) {
            this.selectedUser = user.raw;
            this.showRegistryModal = true;
        }
    }

    deleteUser(user: User) {
        this.alertService.confirm(
            'Eliminar Usuario',
            `¿Estás seguro de que deseas eliminar al usuario ${user.name}?`,
            'Sí, eliminar'
        ).then((confirmed) => {
            if (confirmed) {
                this.alertService.loading('Eliminando...');
                this.userService.deleteUser(user.id).subscribe({
                    next: () => {
                        this.alertService.close();
                        this.alertService.success('Éxito', 'Usuario eliminado correctamente');
                        this.loadUsers();
                    },
                    error: (err) => {
                        this.alertService.close();
                        this.alertService.error('Error', 'No se pudo eliminar el usuario');
                    }
                });
            }
        });
    }



    onSearch() {
        console.log('Search:', this.searchTerm);
    }
}
