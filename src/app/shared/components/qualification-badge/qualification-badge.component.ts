import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-qualification-badge',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './qualification-badge.component.html',
    styleUrls: ['./qualification-badge.component.scss']
})
export class QualificationBadgeComponent {
    @Input() type: 'renacyt' | 'vinculate' = 'renacyt';

    get tooltipText(): string {
        return this.type === 'renacyt'
            ? 'Considerado para calificación en Renacyt'
            : 'Considerado para calificación en Vinculate';
    }
}
