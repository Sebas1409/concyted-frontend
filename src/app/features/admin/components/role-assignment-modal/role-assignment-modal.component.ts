import { Component, EventEmitter, Output, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';
import { UserService, UserProfileApi, UserRequestDTO } from '../../../../core/services/user.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ROLES } from '../../../../core/constants/roles.constants';

@Component({
    selector: 'app-role-assignment-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, FormModalComponent],
    template: `
    <app-form-modal title="Asignar rol" (close)="close.emit()" (save)="save()">
        <p class="description">Busca un usuario registrado en la base de datos y define su nivel de acceso.</p>
        
        <div class="form-grid">
             <div class="form-group full-width">
                 <label>Rol de Acceso *</label>
                 <select [(ngModel)]="data.role">
                    <option value="">Selecciona el nivel de permiso...</option>
                    <option *ngFor="let r of availableRoles" [value]="r.nombre">{{ r.nombre }}</option>
                 </select>
            </div>

            <div class="form-group full-width">
                 <label>Buscar Usuarios Sin Rol</label>
                 <div class="search-row">
                     <div class="input-wrapper">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="text" placeholder="Escribe nombre, DNI o correo..." [(ngModel)]="searchUser">
                     </div>
                     <button class="btn-add" (click)="addUser()">+ Agregar</button>
                 </div>
            </div>

            <!-- Internal Table -->
             <div class="table-container full-width">
                <table>
                    <thead>
                        <tr>
                            <th>Usuario ⇅</th>
                            <th>Doc. ⇅</th>
                            <th>Rol a Asignar ⇅</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                     <tbody>
                        <tr *ngFor="let item of paginatedAssignedUsers">
                            <td>{{ item.user.nombres }} {{ item.user.apellidoPaterno }}</td>
                            <td>{{ item.user.numDoc }}</td>
                            <td>{{ item.roleLabel }}</td>
                            <td class="action-cell">
                                <button class="btn-icon delete" (click)="removeUser(item)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 0 0 1 2-2h4a2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                                </button>
                            </td>
                        </tr>
                        <tr *ngIf="assignedUsers.length === 0">
                            <td colspan="4" class="empty-state">No hay usuarios seleccionados</td>
                        </tr>
                    </tbody>
                </table>
             </div>
             
             <div class="pagination-lite full-width" *ngIf="assignedUsers.length > 0">
                <div class="limit-selector">
                    <span>Mostrar</span>
                    <select [(ngModel)]="pageSize" (change)="setPage(1)">
                        <option [ngValue]="10">10</option>
                        <option [ngValue]="20">20</option>
                        <option [ngValue]="50">50</option>
                    </select>
                    <span>elementos</span>
                </div>
                <div class="pages">
                    <button (click)="setPage(currentPage - 1)" [disabled]="currentPage === 1" style="width: auto; padding: 0 8px;">Anterior</button>
                    <button *ngFor="let p of pagesArray" [class.active]="p === currentPage" (click)="setPage(p)">{{ p }}</button>
                    <button (click)="setPage(currentPage + 1)" [disabled]="currentPage === totalPages" style="width: auto; padding: 0 8px;">Siguiente</button>
                </div>
             </div>
        </div>

        <div class="modal-footer" footer>
            <button class="btn-cancel" (click)="close.emit()">Cancelar</button>
            <button class="btn-save" (click)="save()">Asignar Roles</button>
        </div>
    </app-form-modal>
  `,
    styles: [`
    .description { font-size: 13px; color: #64748B; margin-bottom: 20px; }
    .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    .full-width { grid-column: 1 / -1; }
    
    .form-group {
        display: flex; flex-direction: column; gap: 6px;
        label { font-size: 13px; font-weight: 500; color: #334155; }
        input, select {
            padding: 10px; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 14px;
            &:focus { outline: none; border-color: #005470; }
        }
    }

    .search-row {
        display: flex; gap: 12px;
        .input-wrapper {
            flex: 1; position: relative;
            svg { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: #94A3B8; }
            input { width: 100%; padding-left: 32px; }
        }
        .btn-add {
            background: white; border: 1px solid #005470; color: #005470;
            padding: 10px 24px; border-radius: 6px; font-weight: 500; cursor: pointer;
            white-space: nowrap;
            &:hover { background: #F0F9FF; }
        }
    }

    .table-container {
        border: 1px solid #E2E8F0; border-radius: 6px; overflow: hidden;
        table {
            width: 100%; border-collapse: collapse;
            th, td { padding: 10px; text-align: left; font-size: 13px; border-bottom: 1px solid #E2E8F0; }
            th { background: #F8FAFC; color: #475569; font-weight: 600; }
            .action-cell { text-align: center; }
            .empty-state { text-align: center; color: #94A3B8; padding: 20px; font-style: italic; }
        }
    }

    .btn-icon.delete {
        background: white; border: 1px solid #FECACA; color: #EF4444;
        width: 32px; height: 32px; border-radius: 6px; cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
        svg { width: 16px; height: 16px; stroke-width: 1.5; }
        &:hover { background: #FEF2F2; }
    }

    .pagination-lite {
        display: flex; align-items: center; justify-content: space-between; 
        font-size: 14px; color: #64748B; margin-top: 16px;

        .limit-selector {
            display: flex; align-items: center; gap: 8px;
            select {
                padding: 6px 12px; border: none; background: #F1F5F9; 
                border-radius: 6px; font-weight: 500; color: #334155; cursor: pointer;
                &:focus { outline: none; background: #E2E8F0; }
            }
        }
        
        .pages { 
            display: flex; gap: 4px; align-items: center;
            button { 
                width: 32px; height: 32px; border: none; background: transparent; 
                border-radius: 6px; cursor: pointer; color: #64748B; font-weight: 500;
                display: flex; align-items: center; justify-content: center; /* Center numbers */
                &:hover:not(.active) { background: #F8FAFC; color: #0F172A; }
                &.active { background: #E0F2FE; color: #005470; }
            }
            .dots { padding: 0 4px; color: #94A3B8; }
        }
    }

    .modal-footer {
        display: flex; justify-content: flex-end; gap: 12px;
        button {
            padding: 10px 20px; border-radius: 6px; font-weight: 500; cursor: pointer; border: none;
            &.btn-cancel { background: white; border: 1px solid #E2E8F0; color: #64748B; }
            &.btn-save { background: #005470; color: white; }
        }
    }
  `]
})
export class RoleAssignmentModalComponent implements OnInit {
    @Output() close = new EventEmitter<void>();

    private userService = inject(UserService);
    private authService = inject(AuthService); // Inject AuthService
    private alertService = inject(AlertService);

    data = { role: '' };
    searchUser = '';

    availableRoles: any[] = []; // Roles Store

    // Cache for search
    allUsers: UserProfileApi[] = [];

    // Pending assignments
    assignedUsers: { user: UserProfileApi, role: string, roleLabel: string }[] = [];

    // Pagination
    currentPage = 1;
    pageSize = 10;

    get paginatedAssignedUsers() {
        const start = (this.currentPage - 1) * this.pageSize;
        return this.assignedUsers.slice(start, start + this.pageSize);
    }

    get totalPages() {
        return Math.ceil(this.assignedUsers.length / this.pageSize) || 1;
    }

    get pagesArray() {
        return Array(this.totalPages).fill(0).map((x, i) => i + 1);
    }

    setPage(page: number) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
        }
    }

    ngOnInit() {
        this.loadUsers();
        this.loadRoles();
    }

    loadRoles() {
        this.authService.getRoles().subscribe({
            next: (data) => {
                // Filter out non-assignable administrative roles
                this.availableRoles = data.filter((r: any) =>
                    r.codigo !== ROLES.INVESTIGADOR &&
                    r.codigo !== ROLES.SUPERADMIN
                );
            },
            error: (err) => {
                console.error('Error loading roles from API:', err);
                // Fallback roles based on your data
                this.availableRoles = [
                    { id: 1, nombre: 'Usuario', codigo: ROLES.USER, descripcion: 'Usuario estándar' },
                    { id: 3, nombre: 'Administrador', codigo: ROLES.ADMIN, descripcion: 'Role Administrador' },
                    { id: 4, nombre: 'Consulta', codigo: ROLES.CONSULTA, descripcion: 'Rol Consulta' }
                ];
            }
        });
    }

    loadUsers() {
        this.userService.getUsers().subscribe({
            next: (users) => {
                this.allUsers = users;
            },
            error: (err) => console.error('Error loading users for search', err)
        });
    }

    addUser() {
        if (!this.data.role) {
            this.alertService.warning('Campo incompleto', 'Seleccione el rol antes de agregar.');
            return;
        }

        if (!this.searchUser.trim()) {
            this.alertService.warning('Campo vacío', 'Ingrese el nombre, DNI o correo del usuario.');
            return;
        }

        const term = this.searchUser.toLowerCase().trim();
        const foundUser = this.allUsers.find(u =>
            (u.username && u.username.toLowerCase().includes(term)) ||
            (u.numDoc && u.numDoc.includes(term)) ||
            (u.email && u.email.toLowerCase().includes(term)) ||
            (`${u.nombres} ${u.apellidoPaterno} ${u.apellidoMaterno}`.toLowerCase().includes(term))
        );

        if (!foundUser) {
            this.alertService.error('No encontrado', 'No se encontró ningún usuario con esos datos.');
            return;
        }

        // Check for duplicates in the pending list
        if (this.assignedUsers.some(item => item.user.id === foundUser.id)) {
            this.alertService.warning('Duplicado', 'El usuario ya ha sido agregado a la lista.');
            return;
        }

        // Add to list
        const roleLabel = this.getRoleLabel(this.data.role);

        this.assignedUsers.push({
            user: foundUser,
            role: this.data.role,
            roleLabel: roleLabel
        });

        this.searchUser = ''; // Clear search
    }

    getRoleLabel(roleVal: string): string {
        const found = this.availableRoles.find(r => r.nombre === roleVal || r.codigo === roleVal);
        return found ? found.nombre : roleVal;
    }

    removeUser(item: any) {
        this.assignedUsers = this.assignedUsers.filter(u => u.user.id !== item.user.id);
    }

    save() {
        if (this.assignedUsers.length === 0) {
            this.alertService.warning('Lista vacía', 'Agregue al menos un usuario para asignar roles.');
            return;
        }

        const requests = this.assignedUsers.map(item => {
            const currentRoles = item.user.roles || [];
            // Add new role if not present (simple casing check? assuming uppercase backend)
            // Mapping UI role 'admin' -> 'ADMIN', etc.
            const newRole = item.role.toUpperCase();
            const updatedRoles = Array.from(new Set([...currentRoles, newRole]));

            const dto: UserRequestDTO = {
                nombres: item.user.nombres,
                apellidoPaterno: item.user.apellidoPaterno,
                apellidoMaterno: item.user.apellidoMaterno,
                tipoDoc: item.user.tipodoc || 'DNI',
                numDoc: item.user.numDoc,
                email: item.user.email || '',
                telefono: item.user.telefono || '',
                username: item.user.username,
                roles: updatedRoles,
                enabled: item.user.enabled,
                active: (item.user as any).active ?? item.user.activo ?? true,
                accountNonExpired: true,
                accountNonLocked: true,
                credentialsNonExpired: true,
                areaId: item.user.areaId
            };

            return this.userService.updateUser(item.user.id, dto);
        });

        this.alertService.loading('Asignando roles...');

        // Use forkJoin to execute all updates
        // We need to import forkJoin
        import('rxjs').then(({ forkJoin }) => {
            forkJoin(requests).subscribe({
                next: () => {
                    this.alertService.close();
                    this.alertService.success('Éxito', 'Roles asignados correctamente.');
                    this.close.emit();
                },
                error: (err) => {
                    console.error(err);
                    this.alertService.close();
                    this.alertService.error('Error', 'Ocurrió un error al asignar roles.');
                }
            });
        });
    }
}
