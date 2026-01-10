import { Directive, HostListener, Input } from '@angular/core';

@Directive({
    selector: '[appPasswordStrength]',
    exportAs: 'appPasswordStrength',
    standalone: true
})
export class PasswordStrengthDirective {
    hasUpperCase = false;
    hasLowerCase = false;
    hasNumber = false;
    hasSpecialChar = false;
    hasMinLength = false;

    @HostListener('input', ['$event'])
    onInput(event: Event) {
        const input = event.target as HTMLInputElement;
        this.validate(input.value);
    }

    // Allow manual update if value changes programmatically
    validate(value: string | null | undefined) {
        if (!value) {
            this.hasUpperCase = false;
            this.hasLowerCase = false;
            this.hasNumber = false;
            this.hasSpecialChar = false;
            this.hasMinLength = false;
            return;
        }
        this.hasUpperCase = /[A-Z]/.test(value);
        this.hasLowerCase = /[a-z]/.test(value);
        this.hasNumber = /[0-9]/.test(value);
        this.hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(value);
        this.hasMinLength = value.length >= 8;
    }
}
