import { Component, Input, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingDetail, LandingSection } from '../../../../core/services/landing.service';

@Component({
    selector: 'app-metrics',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './metrics.component.html',
    styleUrl: './metrics.component.scss'
})
export class MetricsComponent implements OnChanges {
    @Input() sectionData: LandingSection | undefined;
    @Input() loading: boolean = true;

    metrics: LandingDetail[] = [];

    constructor(
        private cdr: ChangeDetectorRef
    ) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['sectionData'] && this.sectionData) {
            this.processData(this.sectionData);
        } else if (changes['loading']) {
            if (!this.loading && !this.sectionData) {
                this.metrics = [];
            }
        }
    }

    private processData(data: LandingSection) {
        if (data && data.detalles) {
            this.metrics = data.detalles.filter(d => d.activo && d.publicado).sort((a, b) => a.orden - b.orden);
        }
        this.cdr.detectChanges();
    }
}
