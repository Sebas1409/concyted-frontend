import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@Component({
    selector: 'app-other-identifiers',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './other-identifiers.component.html',
    styleUrl: './other-identifiers.component.scss'
})
export class OtherIdentifiersComponent { }
