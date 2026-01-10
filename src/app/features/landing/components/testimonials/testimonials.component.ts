import { AfterViewInit, Component, ElementRef, QueryList, ViewChildren } from '@angular/core';
import { CommonModule } from '@angular/common';

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
export class TestimonialsComponent implements AfterViewInit {

    testimonials: Testimonial[] = [
        {
            image: 'assets/images/landing/testimonios/testimonio1.png',
            logo: 'assets/images/landing/testimonios/logo-white.png',
            quote: 'La integración automática con ORCID facilitó mi postulación a los fondos de ProCiencia. Menos tiempo llenando formularios significó más tiempo para mi investigación en biología molecular.',
            avatar: 'assets/images/landing/avatar/avatar1.png',
            name: 'Dra. Elena Magallanes',
            role: 'INVESTIGADORA RENACYT NIVEL I'
        },
        {
            image: 'assets/images/landing/testimonios/testimonio2.png',
            logo: 'assets/images/landing/testimonios/logo-mini.png',
            quote: 'La nueva plataforma CTI Vitae ha simplificado enormemente la gestión de mis publicaciones y certificaciones.',
            avatar: 'assets/images/landing/avatar/avatar2.png',
            name: 'Dr. Juan Perez',
            role: 'INVESTIGADOR RENACYT NIVEL II'
        }
    ];

    activeIndex = 0;

    @ViewChildren('card') cards!: QueryList<ElementRef>;

    ngAfterViewInit() {
        // Setup IntersectionObserver to detect which card is centered/active
        const options = {
            root: null,
            rootMargin: '0px',
            threshold: 0.6 // Trigger when 60% visible
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const index = Number(entry.target.getAttribute('data-index'));
                    this.activeIndex = index;
                }
            });
        }, options);

        this.cards.forEach(card => observer.observe(card.nativeElement));
    }
}
