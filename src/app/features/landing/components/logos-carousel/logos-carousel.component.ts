import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingSection } from '../../../../core/services/landing.service';
import { FileService } from '../../../../core/services/file.service';

@Component({
    selector: 'app-logos-carousel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './logos-carousel.component.html',
    styleUrl: './logos-carousel.component.scss'
})
export class LogosCarouselComponent implements OnInit, OnChanges {
    @Input() sectionData: LandingSection | undefined;
    @Input() loading: boolean = true;

    @Input() logos: string[] = [];

    logosToShow: string[] = [];
    sectionTitle: string = 'Más de <span>120,000</span> usuarios <br> registrados.';

    constructor(
        private fileService: FileService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnInit() {
        this.initCarousel();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['sectionData'] && this.sectionData) {
            this.processData(this.sectionData);
        }
    }

    private processData(data: LandingSection) {
        if (data.encabezado) {
            if (data.encabezado.titulo) {
                this.sectionTitle = data.encabezado.titulo;
            }
        }

        if (data.detalles && data.detalles.length > 0) {
            const mappedLogos = data.detalles
                .filter(d => d.publicado && d.fotoToken)
                .map(d => this.fileService.getFileUrl(d.fotoToken, true));

            if (mappedLogos.length > 0) {
                this.logos = mappedLogos;
                this.initCarousel();
            }
        }
    }

    initCarousel() {
        if (this.logos.length === 0) return;
        this.logosToShow = [...this.logos, ...this.logos, ...this.logos];
    }
}
