import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { LandingService, LandingHeader } from '../../../../core/services/landing.service';
import { LandingSectionCode } from '../../../../core/constants/landing-section-codes';

@Component({
    selector: 'app-landing-header',
    standalone: true,
    imports: [CommonModule, RouterLink],
    templateUrl: './header.component.html',
    styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit {
    public openMobile = false;
    public ctaHeader: LandingHeader | null = null;

    constructor(private landingService: LandingService) { }

    ngOnInit(): void {
        this.landingService.getHeaderByCode(LandingSectionCode.AYUDA).subscribe({
            next: (data) => {
                if (this.isBannerActive(data)) {
                    this.ctaHeader = data;
                } else {
                    this.ctaHeader = null;
                }
            },
            error: (err) => {
                console.error('Error fetching CTA Header', err);
            }
        });
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
