import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from './components/header/header.component';
import { HeroComponent } from './components/hero/hero.component';
import { LogosCarouselComponent } from './components/logos-carousel/logos-carousel.component';
import { FeaturesComponent } from './components/features/features.component';
import { InteroperabilityComponent } from './components/interoperability/interoperability.component';
import { AudienceComponent } from './components/audience/audience.component';
import { TestimonialsComponent } from './components/testimonials/testimonials.component';
import { MetricsComponent } from './components/metrics/metrics.component';
import { FooterComponent } from './components/footer/footer.component';

@Component({
  selector: 'app-landing-page',
  standalone: true,
  imports: [
    CommonModule,
    HeaderComponent,
    HeroComponent,
    LogosCarouselComponent,
    FeaturesComponent,
    InteroperabilityComponent,
    AudienceComponent,
    TestimonialsComponent,
    MetricsComponent,
    FooterComponent
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss'
})
export class LandingPageComponent { }
