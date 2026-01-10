import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet } from '@angular/router';
import { RecaptchaService } from './core/services/recaptcha.service';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [CommonModule, RouterOutlet],
    template: `<router-outlet></router-outlet>`
})
export class AppComponent implements OnInit {
    constructor(private recaptchaService: RecaptchaService) { }

    ngOnInit() {
        // Execute reCAPTCHA on app load/refresh to get a fresh token
        this.recaptchaService.execute('initial_load').subscribe({
            next: (token) => {
                console.log('App Initialized: Recaptcha token saved to localStorage', token);
                localStorage.setItem('recaptcha_token', token);
            },
            error: (err) => {
                console.error('Failed to get initial recaptcha token', err);
            }
        });
    }
}
