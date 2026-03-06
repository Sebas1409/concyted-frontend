import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LandingSection, LandingHeader } from '../../../../core/services/landing.service';

@Component({
    selector: 'app-landing-header',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnChanges {
    @Input() sectionData: LandingSection | undefined;

    public openMobile = false;
    public ctaHeader: LandingHeader | null = null;

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['sectionData'] && this.sectionData && this.sectionData.encabezado) {
            if (this.isBannerActive(this.sectionData.encabezado)) {
                this.ctaHeader = this.sectionData.encabezado;
            } else {
                this.ctaHeader = null;
            }
        }
    }

    private isBannerActive(header: LandingHeader): boolean {
        if (!header || !header.titulo) return false;

        const now = new Date();
        let isValid = true;

        if (header.fechaInicio) {
            const start = this.parseDateLocal(header.fechaInicio);
            start.setHours(0, 0, 0, 0);
            if (now < start) isValid = false;
        }

        if (header.fechaFin) {
            const end = this.parseDateLocal(header.fechaFin);
            end.setHours(23, 59, 59, 999);
            if (now > end) isValid = false;
        }

        return isValid;
    }

    private parseDateLocal(dateStr: string): Date {
        const cleanDate = dateStr.split('T')[0];
        const parts = cleanDate.split('-');
        if (parts.length === 3) {
            const year = parseInt(parts[0], 10);
            const month = parseInt(parts[1], 10) - 1;
            const day = parseInt(parts[2], 10);
            return new Date(year, month, day);
        }
        return new Date(dateStr);
    }
}
