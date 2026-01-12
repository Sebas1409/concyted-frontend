import { Component, Input, OnInit, OnChanges, SimpleChanges, ChangeDetectorRef, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingSection } from '../../../../core/services/landing.service';
import { FileService } from '../../../../core/services/file.service';

interface FeatureItem {
    title: string;
    description: string;
    image: string;
}

@Component({
    selector: 'app-features',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './features.component.html',
    styleUrl: './features.component.scss'
})
export class FeaturesComponent implements OnChanges {
    @Input() sectionData: LandingSection | undefined;
    @Input() loading: boolean = true;

    featuresList: FeatureItem[] = []; // Empty initially

    // If you need carousel logic identical to audience, we can replicate it
    // Assuming simple flex layout or snap scroll for now as per "cards" request

    constructor(
        private fileService: FileService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['sectionData'] && this.sectionData) {
            this.processData(this.sectionData);
        } else if (changes['loading']) {
            if (!this.loading && !this.sectionData) {
                this.featuresList = [];
            }
        }
    }

    private processData(data: LandingSection) {
        if (data.detalles) {
            this.featuresList = data.detalles
                .filter(d => d.activo && d.publicado)
                .sort((a, b) => a.orden - b.orden)
                .map(d => ({
                    title: d.nombre || '',
                    description: d.detalle1 || '',
                    image: d.fotoToken ? this.fileService.getFileUrl(d.fotoToken, true) : 'assets/images/placeholder.jpg'
                }));
        }
    }
}
