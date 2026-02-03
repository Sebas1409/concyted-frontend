import { Component, Input, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { LandingSection } from '../../../../core/services/landing.service';
import { FileService } from '../../../../core/services/file.service';

interface HeroSlide {
    image: string;
    name: string;
    role: string;
    stats: string;
    level: string;
}

@Component({
    selector: 'app-hero',
    standalone: true,
    imports: [CommonModule, RouterLink, FormsModule],
    templateUrl: './hero.component.html',
    styleUrl: './hero.component.scss'
})
export class HeroComponent implements OnChanges, OnDestroy {
    @Input() sectionData: LandingSection | undefined;
    @Input() loading: boolean = true;
    searchText: string = '';

    titleHtml = 'El directorio oficial del <br /><span class="text-primary">talento científico</span> del Perú';
    description = 'Explora la producción académica y tecnológica del país. Conecta con investigadores calificados y verifica su nivel RENACYT.';

    slides: HeroSlide[] = [];
    currentSlideIndex = 0;
    currentSlide: HeroSlide | null = null;

    private intervalId: any;

    constructor(
        private fileService: FileService,
        private cdr: ChangeDetectorRef,
        private router: Router
    ) { }

    onSearch() {
        if (this.searchText.trim()) {
            this.router.navigate(['/search'], { queryParams: { q: this.searchText.trim() } });
        }
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['sectionData'] && this.sectionData) {
            this.processData(this.sectionData);
        }
    }

    private processData(data: LandingSection) {

        if (data.encabezado) {
            if (data.encabezado.titulo) {
                this.titleHtml = data.encabezado.titulo.replace(/\n/g, '<br/>');
            }
            if (data.encabezado.subtitulo) {
                this.description = data.encabezado.subtitulo;
            }
        }

        if (data.detalles && data.detalles.length > 0) {
            this.slides = data.detalles
                .filter(d => d.activo && d.publicado)
                .sort((a, b) => a.orden - b.orden)
                .map(d => ({
                    image: d.fotoToken ? this.fileService.getFileUrl(d.fotoToken, true) : 'assets/images/landing/investigador-nivel2.png',
                    name: d.nombre || '',
                    role: d.detalle1 || '',    // Specialty / Institution
                    stats: d.detalle2 || '',   // Metrics
                    level: d.detalle3 || ''    // Level
                }));

            if (this.slides.length > 0) {
                this.currentSlideIndex = 0;
                this.currentSlide = this.slides[0];
                this.startCarousel();
            }
        }
    }

    startCarousel() {
        this.stopCarousel();
        if (this.slides.length > 1) {
            this.intervalId = setInterval(() => {
                this.nextSlide();
            }, 6000); // 6 seconds per slide
        }
    }

    stopCarousel() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    nextSlide() {
        this.currentSlideIndex = (this.currentSlideIndex + 1) % this.slides.length;
        this.currentSlide = this.slides[this.currentSlideIndex];
        this.cdr.markForCheck(); // Using OnPush or just safe check
    }

    ngOnDestroy() {
        this.stopCarousel();
    }
}
