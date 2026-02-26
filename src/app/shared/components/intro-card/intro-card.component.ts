import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-intro-card',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './intro-card.component.html',
    styleUrls: ['./intro-card.component.scss']
})
export class IntroCardComponent {
    @Input() cardTitle: string = '';
    @Input() subtitle: string = '';
}
