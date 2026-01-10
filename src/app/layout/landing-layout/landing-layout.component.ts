import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';

@Component({
    selector: 'app-landing-layout',
    standalone: true,
    imports: [
        CommonModule,
        RouterOutlet
    ],
    templateUrl: './landing-layout.component.html',
    styleUrl: './landing-layout.component.scss'
})
export class LandingLayoutComponent { }
