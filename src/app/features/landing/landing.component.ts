import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
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
import { LandingService, LandingSection } from '../../core/services/landing.service';
import { LandingSectionCode } from '../../core/constants/landing-section-codes';

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
export class LandingPageComponent implements OnInit, OnDestroy {
  landingData: LandingSection[] = [];
  metricsSection: LandingSection | undefined;
  publicoSection: LandingSection | undefined;
  alliesSection: LandingSection | undefined;
  benefitsSection: LandingSection | undefined;
  testimonialsSection: LandingSection | undefined;
  heroSection: LandingSection | undefined;
  loading = true;

  constructor(
    private landingService: LandingService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit() {
    // Hide ReCaptcha badge on landing page
    const badge = document.querySelector('.grecaptcha-badge') as HTMLElement;
    if (badge) {
      badge.style.visibility = 'hidden';
    }

    this.landingService.getPublicContent().subscribe({
      next: (data) => {

        this.landingData = data;

        // Hero Section
        this.heroSection = data.find(s => s.encabezado?.codigo === LandingSectionCode.HERO);

        this.metricsSection = data.find(s => s.encabezado?.codigo === LandingSectionCode.METRICAS);

        if (!this.metricsSection) {
          this.metricsSection = data.find(s =>
            s.encabezado?.codigo?.includes('MET') ||
            s.encabezado?.titulo?.toLowerCase().includes('metr')
          );
        }

        this.publicoSection = data.find(s => s.encabezado?.codigo === LandingSectionCode.PUBLICO);
        if (!this.publicoSection) {
          this.publicoSection = data.find(s => s.encabezado?.codigo === LandingSectionCode.PUBLICO);
        }

        this.alliesSection = data.find(s => s.encabezado?.codigo === LandingSectionCode.ALIADOS);

        if (!this.alliesSection) {
          this.alliesSection = data.find(s => s.encabezado?.codigo === 'ALIINS');
        }

        // Beneficios Section
        this.benefitsSection = data.find(s => s.encabezado?.codigo === LandingSectionCode.BENEFICIOS);

        if (!this.benefitsSection) {
          this.benefitsSection = data.find(s => s.encabezado?.codigo === 'BENVTJ');
        }

        // Testimonios Section
        this.testimonialsSection = data.find(s => s.encabezado?.codigo === LandingSectionCode.TESTIMONIOS);
        if (!this.testimonialsSection) {
          this.testimonialsSection = data.find(s => s.encabezado?.codigo === 'TESTVO');
        }

        setTimeout(() => {
          this.loading = false;
          this.cdr.detectChanges();
        }, 2000);
      },
      error: () => {
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  ngOnDestroy() {
    // Restore ReCaptcha badge when leaving landing page
    const badge = document.querySelector('.grecaptcha-badge') as HTMLElement;
    if (badge) {
      badge.style.visibility = 'visible';
    }
  }
}
