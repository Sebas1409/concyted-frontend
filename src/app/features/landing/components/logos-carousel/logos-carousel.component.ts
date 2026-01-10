import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'app-logos-carousel',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './logos-carousel.component.html',
    styleUrl: './logos-carousel.component.scss'
})
export class LogosCarouselComponent implements OnInit {

    @Input() logos: string[] = [
        'assets/images/landing/carousel-logos/logo1.png',
        'assets/images/landing/carousel-logos/logo2.png',
        'assets/images/landing/carousel-logos/logo3.png',
        'assets/images/landing/carousel-logos/logo4.png',
        'assets/images/landing/carousel-logos/logo5.png'
    ];

    logosToShow: string[] = [];

    ngOnInit() {
        this.initCarousel();
    }

    initCarousel() {
        // Duplicate logos to create a seamless infinite scroll loop with CSS
        // The CSS animation translates X by -50%, so we need double the content.
        this.logosToShow = [...this.logos, ...this.logos, ...this.logos];
        // Tripling it just to be safe if screen is very wide and logos are few
    }
}
