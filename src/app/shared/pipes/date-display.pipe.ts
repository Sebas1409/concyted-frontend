
import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'dateDisplay',
    standalone: true
})
export class DateDisplayPipe implements PipeTransform {

    transform(date: string | null | undefined, isCurrent: boolean = false): string {
        if (isCurrent) {
            return 'A la actualidad';
        }
        if (!date) return '';

        try {
            // Check if YYYY-MM-DD
            if (date.match(/^\d{4}-\d{2}-\d{2}$/)) {
                const [year, month, day] = date.split('-').map(Number);
                const d = new Date(year, month - 1, day);
                const formatter = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' });
                const formatted = formatter.format(d);
                // Capitalize first letter: "diciembre 2024" -> "Diciembre 2024"
                return formatted.charAt(0).toUpperCase() + formatted.slice(1);
            }
            return date;
        } catch (e) {
            return date;
        }
    }

}
