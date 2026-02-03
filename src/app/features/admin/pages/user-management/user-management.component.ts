import { Component, ChangeDetectorRef, OnInit, AfterViewInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserRegistryModalComponent } from '../../components/user-registry-modal/user-registry-modal.component';
import { RoleAssignmentModalComponent } from '../../components/role-assignment-modal/role-assignment-modal.component';
import { IntroCardComponent } from '../../../../shared/components/intro-card/intro-card.component';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';
import { UserService, UserProfileApi } from '../../../../core/services/user.service';
import { AlertService } from '../../../../core/services/alert.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { ROLES } from '../../../../core/constants/roles.constants';

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
    imports: [CommonModule, FormsModule, UserRegistryModalComponent, RoleAssignmentModalComponent, IntroCardComponent, FormModalComponent],
    templateUrl: './user-management.component.html',
    styleUrl: './user-management.component.scss'
})
export class UserManagementComponent implements OnInit, AfterViewInit {
    private userService = inject(UserService);
    private alertService = inject(AlertService);
    private catalogService = inject(CatalogService);
    activeTab: 'users' | 'roles' = 'users';
    searchTerm: string = '';

    appliedSearchTerm: string = '';
    sortColumn: string = '';
    sortDirection: 'asc' | 'desc' = 'asc';

    // Data
    users: User[] = [];
    areas: any[] = [];
    selectedUser: UserProfileApi | null = null;

    // Pagination
    currentPage: number = 1;
    pageSize: number = 10;
    totalElements: number = 0;

    // Modals
    showRegistryModal: boolean = false;
    showRoleModal: boolean = false;
    showAccessModal: boolean = false;
    showEditModal: boolean = false;

    // Access Form
    selectedUserForAccess: User | null = null;
    accessForm = {
        username: '',
        fullName: '',
        email: '',
        active: true
    };

    // Edit Form
    editForm = {
        fullName: '',
        email: '',
        birthDate: '',
        gender: 'M' as 'M' | 'F'
    };
    currentResearcherProfile: any = null;

    constructor(private cdr: ChangeDetectorRef) { }

    ngOnInit() {
        // Reset all modals to prevent overlay issues
        this.showRegistryModal = false;
        this.showRoleModal = false;
        this.showAccessModal = false;
        this.showEditModal = false;

        this.loadAreas();
        this.loadUsers();
    }

    ngAfterViewInit() {
        // Clean up any orphaned modal overlays after view initialization
        setTimeout(() => {
            const overlays = document.querySelectorAll('.modal-overlay');
            overlays.forEach(overlay => {
                const parent = overlay.parentElement;
                if (parent && !parent.querySelector('*[ng-reflect-show-registry-modal="true"]') &&
                    !parent.querySelector('*[ng-reflect-show-role-modal="true"]') &&
                    !parent.querySelector('*[ng-reflect-show-access-modal="true"]') &&
                    !parent.querySelector('*[ng-reflect-show-edit-modal="true"]')) {
                    overlay.remove();
                }
            });
        }, 100);
    }

    loadAreas() {
        this.catalogService.getAreas().subscribe({
            next: (data) => {
                this.areas = data;
                // If users already loaded, re-map their areas
                if (this.users.length > 0) {
                    this.mapUserAreas();
                }
            },
            error: (err) => console.error('Error loading areas', err)
        });
    }

    /* Computed Properties */
    get filteredUsers(): User[] {
        let result = this.users;

        if (this.appliedSearchTerm) {
            const term = this.appliedSearchTerm.toLowerCase();
            result = result.filter(u =>
                u.name.toLowerCase().includes(term) ||
                u.account.toLowerCase().includes(term) ||
                u.email.toLowerCase().includes(term) ||
                u.area.toLowerCase().includes(term)
            );
        }

        if (this.sortColumn) {
            result = [...result].sort((a: any, b: any) => {
                const valA = a[this.sortColumn]?.toString().toLowerCase() || '';
                const valB = b[this.sortColumn]?.toString().toLowerCase() || '';

                if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
                if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return result;
    }

    get paginatedUsers() {
        const filtered = this.filteredUsers;
        const start = (this.currentPage - 1) * this.pageSize;
        return filtered.slice(start, start + this.pageSize);
    }

    get totalPages() {
        return Math.ceil(this.filteredUsers.length / this.pageSize);
    }

    get totalFilteredItems() {
        return this.filteredUsers.length;
    }

    get pagesArray() {
        const total = this.totalPages;
        const current = this.currentPage;
        const maxPagesToShow = 5;

        let startPage: number, endPage: number;
        if (total <= maxPagesToShow) {
            startPage = 1;
            endPage = total;
        } else {
            if (current <= 3) {
                startPage = 1;
                endPage = maxPagesToShow;
            } else if (current + 2 >= total) {
                startPage = total - 4;
                endPage = total;
            } else {
                startPage = current - 2;
                endPage = current + 2;
            }
        }
        return Array.from({ length: (endPage + 1) - startPage }, (_, i) => startPage + i);
    }

    loadUsers() {
        // Fetch all users for front-end pagination and filtering
        this.userService.getOnlyUsers(true, 0, 9999, '').subscribe({
            next: (data) => {
                const usersList = Array.isArray(data) ? data : (data.content || []);
                this.totalElements = Array.isArray(data) ? data.length : (data.totalElements || 0);

                this.users = usersList.map((u: UserProfileApi) => {
                    const rolesArray = typeof u.roles === 'string' ? [u.roles] : (u.roles || []);
                    return {
                        id: u.id.toString(),
                        account: u.numDoc || u.username || 'Sin registro',
                        name: `${u.nombres || ''} ${u.apellidoPaterno || ''} ${u.apellidoMaterno || ''}`.trim() || 'Sin registro',
                        email: u.email || 'Sin registro',
                        area: this.getAreaName(u.areaId),
                        status: (u.active ?? u.activo) ? 'Activo' : 'Inactivo',
                        selected: false,
                        raw: { ...u, roles: rolesArray }
                    };
                });
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading users', err);
                this.alertService.error('Error', 'No se pudieron cargar los usuarios');
            }
        });
    }

    private mapUserAreas() {
        this.users = this.users.map(u => ({
            ...u,
            area: this.getAreaName(u.raw?.areaId)
        }));
        this.cdr.markForCheck();
    }

    private getAreaName(areaId: number | string | undefined | null): string {
        if (!areaId) return 'Sin área';
        const area = this.areas.find(a => (a.id || a.idArea).toString() === areaId.toString());
        return area ? (area.nombre || area.descripcion || area.name || area.label) : 'Sin área';
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

    manageAccess(user: User) {
        this.selectedUserForAccess = user;
        this.accessForm = {
            username: user.account,
            fullName: user.name,
            email: user.email,
            active: user.raw?.active ?? user.raw?.activo ?? (user.status === 'Activo')
        };
        this.showAccessModal = true;
    }

    saveAccess() {
        if (!this.selectedUserForAccess?.raw?.id) return;

        const userId = this.selectedUserForAccess.raw.id;
        const action = this.accessForm.active ?
            this.userService.activateUser(userId) :
            this.userService.deactivateUser(userId);

        this.alertService.loading('Actualizando estado...');
        action.subscribe({
            next: () => {
                this.alertService.close();
                this.alertService.success('Éxito', `Usuario ${this.accessForm.active ? 'activado' : 'desactivado'} correctamente`);
                this.showAccessModal = false;

                // Optimistic update
                this.selectedUserForAccess!.status = this.accessForm.active ? 'Activo' : 'Inactivo';

                setTimeout(() => this.loadUsers(), 300);
            },
            error: (err) => {
                console.error(err);
                this.alertService.close();
                this.alertService.error('Error', 'No se pudo actualizar el estado de la cuenta');
            }
        });
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
        this.appliedSearchTerm = (this.searchTerm || '').trim();
        this.currentPage = 1;
        // The filtering happens automatically via the filteredUsers computed property
    }

    toggleSort(column: string) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortColumn = column;
            this.sortDirection = 'asc';
        }
        this.currentPage = 1;
    }

    setPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    getRoleDisplayName(role: string): string {
        const roleNames: { [key: string]: string } = {
            [ROLES.USER]: 'Usuario',
            [ROLES.INVESTIGADOR]: 'Investigador',
            [ROLES.ADMIN]: 'Administrador',
            [ROLES.CONSULTA]: 'Consulta',
            [ROLES.SUPERADMIN]: 'Super Administrador'
        };
        return roleNames[role] || role.replace('ROLE_', '');
    }

    shouldShowRole(role: string): boolean {
        // Hide user and researcher roles from the roles tab list as per common admin requirement
        return role !== ROLES.INVESTIGADOR && role !== ROLES.USER;
    }
}
