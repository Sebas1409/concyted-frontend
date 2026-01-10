import { Component, EventEmitter, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';

@Component({
    selector: 'app-role-assignment-modal',
    standalone: true,
    imports: [CommonModule, FormsModule, FormModalComponent],
    template: `
    <app-form-modal title="Asignar rol" (close)="close.emit()" (save)="save()">
        <p class="description">Busca un usuario registrado en la base de datos y define su nivel de acceso.</p>
        
        <div class="form-grid">
            <div class="form-group">
                 <label>Sistema de Destino *</label>
                 <select [(ngModel)]="data.system">
                    <option value="">Selecciona la plataforma...</option>
                    <option value="admin">Admin DINA</option>
                    <option value="cti">CTI Vitae</option>
                 </select>
            </div>
            
             <div class="form-group">
                 <label>Rol de Acceso *</label>
                 <select [(ngModel)]="data.role">
                    <option value="">Selecciona el nivel de permiso...</option>
                    <option value="admin">Mesa de Ayuda</option>
                    <option value="editor">Editor</option>
                    <option value="viewer">Consulta</option>
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
                            <th>Sistema Destino ⇅</th>
                            <th>Rol a Asignar ⇅</th>
                            <th>Acción</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr *ngFor="let item of assignedUsers">
                            <td>{{ item.name }}</td>
                            <td>{{ item.doc }}</td>
                            <td>{{ item.system }}</td>
                            <td>{{ item.role }}</td>
                            <td class="action-cell">
                                <button class="btn-icon delete" (click)="removeUser(item)">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                                </button>
                            </td>
                        </tr>
                        <tr *ngIf="assignedUsers.length === 0">
                            <td colspan="5" class="empty-state">No hay usuarios seleccionados</td>
                        </tr>
                    </tbody>
                </table>
             </div>
             
             <div class="pagination-lite full-width">
                <div class="limit-selector">
                    <span>Mostrar</span>
                    <select>
                        <option>10</option>
                        <option>20</option>
                        <option>50</option>
                    </select>
                    <span>elementos</span>
                </div>
                <div class="pages">
                    <button class="active">1</button>
                    <button>2</button>
                    <span class="dots">...</span>
                    <button>5</button>
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
export class RoleAssignmentModalComponent {
    @Output() close = new EventEmitter<void>();

    data = { system: '', role: '' };
    searchUser = '';

    assignedUsers = [
        { id: 1, name: 'Juan Maximo', doc: '10293847', system: 'Admin DINA', role: 'Mesa de Ayuda' },
        { id: 2, name: 'Maria Gomez', doc: '48291029', system: 'Admin DINA', role: 'Consulta' },
        { id: 3, name: 'Pedro Ruiz', doc: '12345678', system: 'CTI Vitae', role: 'Editor' }
    ];

    addUser() {
        console.log('Adding user:', this.searchUser);
        // Mock logic
    }

    removeUser(item: any) {
        this.assignedUsers = this.assignedUsers.filter(u => u.id !== item.id);
    }

    save() {
        console.log('Saving assignments');
        this.close.emit();
    }
}
