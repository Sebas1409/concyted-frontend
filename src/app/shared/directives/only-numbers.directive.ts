import { Directive, HostListener } from '@angular/core';

@Directive({
    selector: '[appOnlyNumbers]',
    standalone: true
})
export class OnlyNumbersDirective {
    @HostListener('keypress', ['$event'])
    onKeyPress(event: KeyboardEvent) {
        const pattern = /[0-9]/;
        const inputChar = String.fromCharCode(event.charCode);
        if (!pattern.test(inputChar)) {
            event.preventDefault();
        }
    }
}
