import { AfterViewInit, Component, ElementRef, Input, OnChanges, SimpleChanges, ViewChild, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingDetail, LandingSection } from '../../../../core/services/landing.service';
import { environment } from '../../../../../environments/environment';
import { FileService } from '../../../../core/services/file.service';

interface AudienceItem {
    title: string;
    tags: string;
    description: string;
    image: string;
}

@Component({
    selector: 'app-audience',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './audience.component.html',
    styleUrl: './audience.component.scss'
})
export class AudienceComponent implements AfterViewInit, OnChanges {
    @Input() sectionData: LandingSection | undefined;
    @Input() loading: boolean = true;
    @ViewChild('carousel') carousel!: ElementRef<HTMLElement>;

    audienceList: AudienceItem[] = [];
    sectionTitle: string = 'Nuestro Publico: Un ecosistema conectado para el desarrollo del país'; // Default title

    currentSlide = 1;
    cardWidth = 400 + 32;

    constructor(
        private cdr: ChangeDetectorRef,
        private fileService: FileService
    ) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['sectionData'] && this.sectionData) {
            this.processData(this.sectionData);
        } else if (changes['loading']) {
            if (!this.loading && !this.sectionData) {
                this.audienceList = [];
            }
        }
    }

    private processData(data: LandingSection) {
        if (data.encabezado) {
            this.sectionTitle = data.encabezado.titulo || this.sectionTitle;
        }

        if (data.detalles) {
            this.audienceList = data.detalles.filter(d => d.activo && d.publicado).sort((a, b) => a.orden - b.orden)
                .map(d => ({
                    title: d.nombre || '',
                    tags: d.detalle2 || '',
                    description: d.detalle1 || '',
                    image: d.fotoToken ? this.fileService.getFileUrl(d.fotoToken, true) : 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?q=80&w=600&auto=format&fit=crop'
                }));
        }
    }

    ngAfterViewInit() {
        if (this.carousel) {
            this.carousel.nativeElement.addEventListener('scroll', () => this.updateIndexFromScroll());
        }
    }

    get totalSlides() {
        return this.audienceList.length;
    }

    prev() {
        if (this.currentSlide > 1) {
            this.currentSlide--;
            this.scrollToSlide();
        }
    }

    next() {
        if (this.currentSlide < this.totalSlides) {
            this.currentSlide++;
            this.scrollToSlide();
        }
    }

    private scrollToSlide() {
        if (!this.carousel) return;
        const position = (this.currentSlide - 1) * this.cardWidth;
        this.carousel.nativeElement.scrollTo({
            left: position,
            behavior: 'smooth'
        });
    }

    private updateIndexFromScroll() {
        if (!this.carousel) return;
        const scrollLeft = this.carousel.nativeElement.scrollLeft;
        const index = Math.round(scrollLeft / this.cardWidth) + 1;
        if (index !== this.currentSlide) {
            this.currentSlide = index;
        }
    }

}
