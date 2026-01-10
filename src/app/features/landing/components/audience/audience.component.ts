import { AfterViewInit, Component, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-audience',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './audience.component.html',
    styleUrl: './audience.component.scss'
})
export class AudienceComponent implements AfterViewInit {

    @ViewChild('carousel') carousel!: ElementRef<HTMLElement>;

    audienceList = [
        {
            title: 'Talento Humano',
            tags: 'Investigadores | Profesionales | Técnicos',
            description: 'Diseñado para quienes crean conocimiento. Gestiona tu perfil, visibiliza tu producción y encuentra oportunidades de crecimiento profesional.',
            image: 'assets/images/landing/audiencie/img1.png'
        },
        {
            title: 'Gobierno y Sector Productivo',
            tags: 'Empresas | Estado | Organismos Internacionales',
            description: 'Conectamos la demanda con la oferta tecnológica. Encuentra expertos para proyectos de I+D+i y toma decisiones basadas en evidencia científica.',
            image: 'assets/images/landing/audiencie/img2.png'
        },
        {
            title: 'Instituciones Académicas',
            tags: 'Universidades | Institutos de Investigación',
            description: 'Herramientas de gestión de la producción intelectual, visibilidad institucional y fomento de la colaboración académica.',
            image: 'assets/images/landing/audiencie/img3.png'
        },
        {
            title: 'Sociedad Civil',
            tags: 'Ciudadanos | Estudiantes',
            description: 'Accede a información científica confiable y descubre cómo la ciencia impacta en tu vida diaria y en el desarrollo de tu comunidad.',
            image: 'https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?w=500&auto=format&fit=crop&q=60'
        },
        {
            title: 'Cooperación Internacional',
            tags: 'Embajadas | Agencias de Cooperación',
            description: 'Facilitamos alianzas estratégicas y conectamos investigadores peruanos con oportunidades globales de financiamiento y desarrollo.',
            image: 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=500&auto=format&fit=crop&q=60'
        }
    ];

    currentSlide = 1;
    cardWidth = 400 + 32; // Card width (400) + gap (32)

    ngAfterViewInit() {
        this.updateCarouselState();
        // Listen to scroll to update index if user scrolls manually
        this.carousel.nativeElement.addEventListener('scroll', () => this.updateIndexFromScroll());
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
        const position = (this.currentSlide - 1) * this.cardWidth;
        this.carousel.nativeElement.scrollTo({
            left: position,
            behavior: 'smooth'
        });
    }

    private updateIndexFromScroll() {
        const scrollLeft = this.carousel.nativeElement.scrollLeft;
        const index = Math.round(scrollLeft / this.cardWidth) + 1;
        if (index !== this.currentSlide) {
            this.currentSlide = index;
        }
    }

    // Update state helper if needed
    updateCarouselState() {
        // Any initialization
    }
}
