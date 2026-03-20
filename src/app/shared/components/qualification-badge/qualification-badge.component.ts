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
    @Input() customTooltip: string = '';

    get tooltipText(): string {
        if (this.customTooltip) return this.customTooltip;
        return this.type === 'renacyt'
            ? 'Considerado para calificación en Renacyt'
            : 'Considerado para calificación en Vinculate';
    }
}
