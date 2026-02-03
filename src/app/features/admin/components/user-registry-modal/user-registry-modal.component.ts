import { Component, EventEmitter, Output, Input, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';
import { UserService, UserProfileApi, UserRequestDTO } from '../../../../core/services/user.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { AlertService } from '../../../../core/services/alert.service';
import { AuthService } from '../../../../core/services/auth.service';
import { ROLES } from '../../../../core/constants/roles.constants';
import { environment } from '../../../../../environments/environment';

@Component({
    selector: 'app-user-registry-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, FormModalComponent],
    template: `
    <app-form-modal [title]="userData ? 'Editar Usuario' : 'Registrar Nuevo Usuario'" (close)="close.emit()" (save)="save()">
        <p class="description">Ingresa las credenciales de acceso y los datos personales para dar de alta a un nuevo administrador en el sistema.</p>
        
        <div class="form-grid">
            <div class="form-group full-width">
                 <label>Cuenta de Usuario *</label>
                 <input type="text" [(ngModel)]="data.username" placeholder="Ingresa el usuario (ej. jperez)">
            </div>
            
            <div class="form-group full-width">
                 <label>Rol de Acceso *</label>
                 <select [(ngModel)]="data.selectedRole">
                    <option value="">Selecciona el nivel de permiso...</option>
                    <option *ngFor="let role of availableRoles" [value]="role.codigo">{{ role.nombre }}</option>
                 </select>
            </div>

            <div class="form-group full-width">
                 <label>Área *</label>
                 <select [(ngModel)]="data.area">
                    <option value="">Selecciona el área...</option>
                    <option *ngFor="let area of areas" [value]="area.id || area.idArea">{{ area.nombre || area.descripcion || area.name || area.label || ' - ' }}</option>
                 </select>
            </div>

            <!-- Password fields only for new users using *ngIf="!userData" -->
            <div class="form-group" *ngIf="!userData">
                 <label>Contraseña *</label>
                 <div class="password-wrapper">
                    <input [type]="showPassword ? 'text' : 'password'" [(ngModel)]="data.password" placeholder="Mínimo 8 caracteres">
                    <button class="toggle-pass" (click)="showPassword = !showPassword" type="button">
                        <svg *ngIf="!showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <svg *ngIf="showPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    </button>
                 </div>
            </div>

            <div class="form-group" *ngIf="!userData">
                 <label>Confirmar Contraseña *</label>
                 <div class="password-wrapper">
                    <input [type]="showConfirmPassword ? 'text' : 'password'" [(ngModel)]="data.confirmPassword" placeholder="Repite la contraseña">
                    <button class="toggle-pass" (click)="showConfirmPassword = !showConfirmPassword" type="button">
                         <svg *ngIf="!showConfirmPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        <svg *ngIf="showConfirmPassword" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#64748B" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                    </button>
                 </div>
            </div>


            <div class="form-group">
                 <label>Cuenta Activa</label>
                 <div class="toggle-switch">
                     <label class="switch">
                        <input type="checkbox" [(ngModel)]="data.active">
                        <span class="slider round"></span>
                    </label>
                    <span class="status-text">{{ data.active ? 'Activo' : 'Inactivo' }}</span>
                 </div>
            </div>

             <div class="form-group">
                 <label>Nombres *</label>
                 <input type="text" [(ngModel)]="data.names" placeholder="Ej. Juan Carlos">
            </div>

            <div class="form-group">
                 <label>Apellido Paterno *</label>
                 <input type="text" [(ngModel)]="data.surname1" placeholder="Ej. Pérez">
            </div>

            <div class="form-group">
                 <label>Apellido Materno *</label>
                 <input type="text" [(ngModel)]="data.surname2" placeholder="Ej. Gómez">
            </div>

            <div class="form-group">
                 <label>Correo Electrónico *</label>
                 <input type="email" [(ngModel)]="data.email" placeholder="nombre@institucion.gob.pe">
            </div>
        </div>

        <div class="modal-footer" footer>
            <button class="btn-cancel" (click)="close.emit()">Cancelar</button>
            <button class="btn-save" (click)="save()">{{ userData ? 'Grabar' : 'Crear Usuario' }}</button>
        </div>
    </app-form-modal>
  `,
    styles: [`
    .description { font-size: 13px; color: #64748B; margin-bottom: 20px; }
    .form-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
    }
    .full-width { grid-column: 1 / -1; }
    
    .form-group {
        display: flex;
        flex-direction: column;
        gap: 6px;
        label { font-size: 13px; font-weight: 500; color: #334155; }
        input, select {
            padding: 10px; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 14px;
            &:focus { outline: none; border-color: #005470; }
        }
        input[type="checkbox"] {
            appearance: none; -webkit-appearance: none;
            width: 16px; height: 16px;
            border: 1px solid #CBD5E1; border-radius: 4px;
            cursor: pointer; background-color: white;
            display: grid; place-content: center;
            
            &:checked {
                background-color: #005470; border-color: #005470;
                background-image: url("data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e");
            }
            
            &:checked::before {
                display: none;
            }
            
            &:focus { outline: none; }
        }
    }

    .password-wrapper {
        position: relative;
        input { width: 100%; padding-right: 35px; }
        .toggle-pass {
            position: absolute; right: 8px; top: 50%; transform: translateY(-50%);
            background: none; border: none; cursor: pointer; font-size: 12px;
        }
    }

    .checkbox-align {
        justify-content: center; /* Center vertically in the grid cell if needed, or flex-end to align with inputs */
        padding-top: 24px; /* Approximate alignment with label of other fields */
    }

    .toggle-switch {
        display: flex; align-items: center; gap: 12px;
        .status-text { font-size: 13px; color: #64748B; }
    }

    /* Toggle Switch CSS */
    .switch {
        position: relative; display: inline-block; width: 36px; height: 20px;
        flex-shrink: 0;
    }
    .switch input { opacity: 0; width: 0; height: 0; }
    .slider {
        position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0;
        background-color: #CBD5E1; transition: .4s;
    }
    .slider.round { border-radius: 34px; }
    .slider.round:before { border-radius: 50%; }
    .slider:before {
        position: absolute; content: ""; height: 16px; width: 16px; left: 2px; bottom: 2px;
        background-color: white; transition: .4s;
    }
    input:checked + .slider { background-color: #005470; }
    input:checked + .slider:before { transform: translateX(16px); }

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
export class UserRegistryModalComponent implements OnInit {
    @Input() userData: UserProfileApi | null = null;
    @Output() close = new EventEmitter<void>();

    private userService = inject(UserService);
    private alertService = inject(AlertService);
    private catalogService = inject(CatalogService);
    private authService = inject(AuthService);
    private cdr = inject(ChangeDetectorRef);

    areas: any[] = [];
    availableRoles: any[] = [];

    data = {
        username: '', area: '', password: '', confirmPassword: '',
        active: true,
        names: '', surname1: '', surname2: '', email: '',
        selectedRole: ''
    };

    showPassword = false;
    showConfirmPassword = false;

    ngOnInit() {
        this.loadRoles();
        this.catalogService.getAreas().subscribe(res => {
            console.log('Areas Data for Edit:', res);
            this.areas = res;

            // Set area based on userData once areas are loaded
            if (this.userData && (this.userData.areaId !== undefined && this.userData.areaId !== null)) {
                const areaIdToMatch = this.userData.areaId.toString();
                const matchingArea = this.areas.find(a =>
                    (a.id?.toString() === areaIdToMatch) ||
                    (a.idArea?.toString() === areaIdToMatch) ||
                    (a.codigo?.toString() === areaIdToMatch)
                );

                if (matchingArea) {
                    this.data.area = (matchingArea.id || matchingArea.idArea || matchingArea.codigo).toString();
                } else {
                    this.data.area = areaIdToMatch;
                }
            }
            this.cdr.detectChanges();
        });

        if (this.userData) {
            this.data.username = this.userData.username;
            this.data.names = this.userData.nombres;
            this.data.surname1 = this.userData.apellidoPaterno;
            this.data.surname2 = this.userData.apellidoMaterno;
            this.data.email = this.userData.email || '';
            this.data.active = (this.userData as any).active ?? this.userData.activo ?? this.userData.enabled;

            // Map roles
            if (this.userData.roles) {
                const rolesArray = typeof this.userData.roles === 'string' ? [this.userData.roles] : (this.userData.roles || []);
                // Take the first role that is NOT ROLE_INVESTIGADOR if possible, or just the first one
                const mainRole = rolesArray.find((r: string) => r !== ROLES.INVESTIGADOR) || rolesArray[0];
                this.data.selectedRole = mainRole || '';
            }

            // this.data.area is now handled in subscription for safety, but set here as fallback
            if (!this.data.area) {
                this.data.area = this.userData.areaId ? this.userData.areaId.toString() : '';
            }
        }
    }

    loadRoles() {
        this.authService.getRoles().subscribe({
            next: (data) => {
                this.availableRoles = data.filter((r: any) =>
                    r.codigo !== ROLES.INVESTIGADOR &&
                    r.codigo !== ROLES.SUPERADMIN
                );

                // Set selectedRole based on userData once roles are loaded
                if (this.userData && this.userData.roles) {
                    const r = this.userData.roles;
                    const rolesArray: any[] = Array.isArray(r) ? r : [r];

                    // Normalize roles to strings (codigo)
                    const roleCodes = rolesArray.map(role => {
                        if (typeof role === 'string') return role;
                        return role.codigo || role.name || role.authority || '';
                    }).filter(c => !!c);

                    const mainRole = roleCodes.find(c => c !== ROLES.INVESTIGADOR) || roleCodes[0];
                    if (mainRole) {
                        this.data.selectedRole = mainRole;
                    }
                }
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading roles:', err);
                this.availableRoles = [
                    { id: 1, nombre: 'Usuario', codigo: ROLES.USER },
                    { id: 3, nombre: 'Administrador', codigo: ROLES.ADMIN },
                    { id: 4, nombre: 'Consulta', codigo: ROLES.CONSULTA }
                ];
            }
        });
    }

    save() {
        if (!this.data.username || !this.data.names || !this.data.surname1 || !this.data.email || !this.data.selectedRole) {
            this.alertService.warning('Advertencia', 'Por favor complete los campos obligatorios, incluyendo el Rol de Acceso.');
            return;
        }

        if (!this.userData && !this.data.password) {
            this.alertService.warning('Advertencia', 'La contraseña es obligatoria para nuevos usuarios.');
            return;
        }

        if (this.data.password && this.data.password !== this.data.confirmPassword) {
            this.alertService.warning('Advertencia', 'Las contraseñas no coinciden.');
            return;
        }

        const dto: UserRequestDTO = {
            username: this.data.username,
            nombres: this.data.names,
            apellidoPaterno: this.data.surname1,
            apellidoMaterno: this.data.surname2,
            email: this.data.email,
            enabled: this.data.active,
            active: this.data.active,
            tipoDoc: '',
            numDoc: this.data.username,
            telefono: '',
            roles: [this.data.selectedRole],
            password: this.data.password,
            accountNonExpired: true,
            accountNonLocked: true,
            credentialsNonExpired: true,
            areaId: this.data.area ? Number(this.data.area) : undefined
        };

        if (this.userData) {
            if (!dto.password) delete dto.password; // Don't send if empty on update

            this.alertService.loading('Actualizando...');
            this.userService.updateUser(this.userData.id, dto).subscribe({
                next: () => {
                    this.alertService.close();
                    this.alertService.success('Éxito', 'Usuario actualizado correctamente');
                    this.close.emit();
                },
                error: (err) => {
                    console.error(err);
                    this.alertService.close();

                    if (err.status === 409) {
                        const errorMessage = err.error?.message || err.error?.error || 'El usuario ya existe';
                        this.alertService.warning(
                            'Usuario duplicado',
                            `${errorMessage}. Por favor, utiliza otro nombre de usuario o correo electrónico.`
                        );
                    } else if (err.status === 400) {
                        const errorMessage = err.error?.message || err.error?.error || 'Los datos ingresados no son válidos';
                        this.alertService.error('Error de validación', errorMessage);
                    } else if (err.status === 404) {
                        this.alertService.error('Error', 'El usuario no fue encontrado');
                    } else if (err.status === 0) {
                        this.alertService.error(
                            'Error de conexión',
                            'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
                        );
                    } else {
                        const errorMessage = err.error?.message || err.error?.error || 'No se pudo actualizar el usuario';
                        this.alertService.error('Error', errorMessage);
                    }
                }
            });
        } else {
            this.alertService.loading('Registrando...');
            this.userService.createUser(dto).subscribe({
                next: () => {
                    this.alertService.close();
                    this.alertService.success('Éxito', 'Usuario creado correctamente');
                    this.close.emit();
                },
                error: (err) => {
                    console.error(err);
                    this.alertService.close();

                    if (err.status === 409) {
                        const errorMessage = err.error?.message || err.error?.error || 'El usuario ya existe';
                        this.alertService.warning(
                            'Usuario duplicado',
                            `${errorMessage}. Por favor, utiliza otro nombre de usuario o correo electrónico.`
                        );
                    } else if (err.status === 400) {
                        const errorMessage = err.error?.message || err.error?.error || 'Los datos ingresados no son válidos';
                        this.alertService.error('Error de validación', errorMessage);
                    } else if (err.status === 0) {
                        this.alertService.error(
                            'Error de conexión',
                            'No se pudo conectar con el servidor. Verifica tu conexión a internet.'
                        );
                    } else if (err.status === 500) {
                        this.alertService.error(
                            'Error del servidor',
                            'Ocurrió un error en el servidor. Por favor, intenta nuevamente más tarde.'
                        );
                    } else {
                        const errorMessage = err.error?.message || err.error?.error || 'No se pudo crear el usuario';
                        this.alertService.error('Error', errorMessage);
                    }
                }
            });
        }
    }
}
