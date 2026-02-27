import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

import { QualificationBadgeComponent } from '../../../../../shared/components/qualification-badge/qualification-badge.component';

@Component({
    selector: 'app-other-identifiers',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, QualificationBadgeComponent],
    templateUrl: './other-identifiers.component.html',
    styleUrl: './other-identifiers.component.scss'
})
export class OtherIdentifiersComponent { }
