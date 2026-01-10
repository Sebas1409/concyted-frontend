import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-form-modal',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './form-modal.component.html',
    styleUrls: ['./form-modal.component.scss']
})
export class FormModalComponent {
    @Input() title: string = '';
    @Input() subtitle: string = '';
    @Output() close = new EventEmitter<void>();

    onClose() {
        this.close.emit();
    }
}
