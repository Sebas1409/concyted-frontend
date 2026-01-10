import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-action-buttons',
    standalone: true,
    imports: [CommonModule],
    template: `
    <div class="actions-container">
      <button *ngIf="canEdit" 
              class="btn-icon edit" 
              [title]="editTitle" 
              (click)="onEdit($event)">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
        </svg>
      </button>
      <button *ngIf="canDelete" 
              class="btn-icon delete" 
              [title]="deleteTitle" 
              (click)="onDelete($event)">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" width="20" height="20">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  `,
    styles: [`
    .actions-container {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-icon {
      background: none;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 50%;
      transition: background-color 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .btn-icon:hover {
      background-color: #F3F4F6;
    }

    .btn-icon.edit {
      color: #1F2937; /* Dark/Black */
    }

    .btn-icon.delete {
      color: #EF4444; /* Red */
    }
  `]
})
export class ActionButtonsComponent {
    @Input() canEdit = true;
    @Input() canDelete = true;
    @Input() editTitle = 'Editar';
    @Input() deleteTitle = 'Eliminar';

    @Output() edit = new EventEmitter<void>();
    @Output() delete = new EventEmitter<void>();

    onEdit(event: Event) {
        event.stopPropagation();
        this.edit.emit();
    }

    onDelete(event: Event) {
        event.stopPropagation();
        this.delete.emit();
    }
}
