import { AfterViewInit, Component, ElementRef, Input, QueryList, ViewChildren, ViewChild, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LandingSection } from '../../../../core/services/landing.service';
import { FileService } from '../../../../core/services/file.service';

interface Testimonial {
    image: string;
    logo: string;
    quote: string;
    avatar: string;
    name: string;
    role: string;
}

@Component({
    selector: 'app-testimonials',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './testimonials.component.html',
    styleUrl: './testimonials.component.scss'
})
export class TestimonialsComponent implements AfterViewInit, OnChanges {
    @Input() sectionData: LandingSection | undefined;
    @Input() loading: boolean = true;

    testimonials: Testimonial[] = [];
    // Fallback skeleton loop
    skeletonItems = [1, 2];

    activeIndex = 0;
    sectionTitle = 'Voces que impulsan la ciencia<br>en el Perú';

    @ViewChildren('card') cards!: QueryList<ElementRef>;

    constructor(
        private fileService: FileService,
        private cdr: ChangeDetectorRef
    ) { }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['sectionData'] && this.sectionData) {
            this.processData(this.sectionData);
        } else if (changes['loading']) {
            if (!this.loading && (!this.sectionData || !this.sectionData.detalles || this.sectionData.detalles.length === 0)) {
                this.testimonials = []; // Or keep empty if no data
            }
        }
    }

    private processData(data: LandingSection) {
        if (data.encabezado && data.encabezado.titulo) {
            this.sectionTitle = data.encabezado.titulo;
        }

        if (data.detalles) {
            this.testimonials = data.detalles
                .filter(d => d.activo && d.publicado)
                .sort((a, b) => a.orden - b.orden)
                .map(d => ({
                    // Mapping logic:
                    // principal image (lifestyle) -> fotoToken
                    // user icon/avatar -> logoToken
                    image: d.fotoToken ? this.fileService.getFileUrl(d.fotoToken, true) : 'assets/images/placeholder.jpg',
                    avatar: d.logoToken ? this.fileService.getFileUrl(d.logoToken, true) : 'assets/images/placeholder_avatar.png',
                    logo: '', // We don't have a third token field, so generic or empty. 
                    // If needed we could use a static brand logo or check if detail3 is a url.
                    quote: d.detalle1 || '',
                    name: d.nombre || '',
                    role: d.detalle2 || ''
                }));
        }
    }

    ngAfterViewInit() {
        this.cards.changes.subscribe(() => {
            this.initObserver();
        });

        if (this.cards.length > 0) {
            this.initObserver();
        }

        // Start auto-rotation
        this.startAutoCarousel();
    }

    private initObserver() {
        // Fallback safety if no cards
        if (!this.cards || this.cards.length === 0) return;

        const options = {
            root: null, // Use viewport or ancestor
            rootMargin: '0px',
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = Number(entry.target.getAttribute('data-index'));
                    this.activeIndex = index;
                    this.cdr.detectChanges();
                }
            });
        }, options);

        this.cards.forEach(card => observer.observe(card.nativeElement));
    }

    // Auto Scroll Logic
    private intervalId: any;

    startAutoCarousel() {
        this.stopAutoCarousel();

        this.intervalId = setInterval(() => {
            if (this.testimonials.length === 0) return;

            let nextIndex = this.activeIndex + 1;
            if (nextIndex >= this.testimonials.length) {
                nextIndex = 0;
            }

            this.scrollToIndex(nextIndex);
        }, 5000); // 5 seconds per slide
    }

    stopAutoCarousel() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    @ViewChild('gridContainer') gridContainer!: ElementRef;

    scrollToIndex(index: number) {
        if (!this.cards || !this.gridContainer) return;
        const cardArray = this.cards.toArray();
        if (cardArray[index]) {
            // Calculate position to scroll to
            const cardElement = cardArray[index].nativeElement;
            const container = this.gridContainer.nativeElement;

            // Simple calculation: scroll strictly to the card's position inside the container
            // This avoids window scrolling completely
            const leftPos = cardElement.offsetLeft - container.offsetLeft;

            container.scrollTo({
                left: leftPos,
                behavior: 'smooth'
            });

            // activeIndex is updated by the observer, but we can set it here too just in case
            // the observer update lags or threshold isn't met perfectly during smooth scroll
            this.activeIndex = index;
        }
    }
}
