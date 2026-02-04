import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AuthResponse } from '../../../core/models/auth.models';
import { Observable, forkJoin, of } from 'rxjs';
import { take, switchMap, map } from 'rxjs/operators';
import { CvExportService } from '../../../core/services/cv-export.service';
import { AlertService } from '../../../core/services/alert.service';
import { UbigeoService } from '../../../core/services/ubigeo.service';

@Component({
    selector: 'app-profile-layout',
    standalone: true,
    imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
    templateUrl: './profile.component.html',
    styleUrl: './profile.component.scss'
})
export class ProfileLayoutComponent implements OnInit {
    showGeneralSubTabs = false;
    user$: Observable<AuthResponse | null>;
    fullLocation$: Observable<string>;
    isExporting = false;

    constructor(
        private router: Router,
        private authService: AuthService,
        private cvExportService: CvExportService,
        private alertService: AlertService,
        private cdr: ChangeDetectorRef,
        private ubigeoService: UbigeoService
    ) {
        this.user$ = this.authService.currentUser$;
        this.fullLocation$ = this.user$.pipe(
            switchMap(user => {
                if (!user) return of('No especificado');
                // Fallback to nationality if no country ID (though residence ID is preferred for location)
                if (!user.paisResidenciaId) return of(user.nacionalidad || 'Perú');

                return forkJoin({
                    countries: this.ubigeoService.getCountries(),
                    departments: user.departamentoId ? this.ubigeoService.getDepartments(user.paisResidenciaId) : of([])
                }).pipe(
                    map(({ countries, departments }) => {
                        const country = countries.find(c => c.id === user.paisResidenciaId);
                        const countryName = country ? country.nombre.toUpperCase() : 'PERÚ';

                        if (user.departamentoId) {
                            const dep = departments.find(d => d.id === user.departamentoId);
                            const depName = dep ? dep.nombre.toUpperCase() : '';
                            return depName ? `${countryName} - ${depName}` : countryName;
                        }
                        return countryName;
                    })
                );
            })
        );
    }

    ngOnInit() {
        this.checkSubTabsVisibility();
        this.router.events.subscribe((event) => {
            if (event instanceof NavigationEnd) {
                this.checkSubTabsVisibility();
            }
        });
    }

    getPublicProfileUrl(user: any): string {
        const id = user.researcherId || user.idInvestigador || user.id;
        return `/ctivitae/search/researcher/${id}`;
    }

    getInitials(user: AuthResponse | null): string {
        if (!user) return 'Inv';
        const first = user.nombres ? user.nombres.charAt(0) : '';
        const last = user.apellidoPaterno ? user.apellidoPaterno.charAt(0) : '';
        return (first + last).toUpperCase();
    }


    private checkSubTabsVisibility() {
        const url = this.router.url;
        this.showGeneralSubTabs = url.includes('/general') ||
            url.includes('/identity') ||
            url.includes('/identifiers') ||
            url.includes('/privacy') ||
            url.endsWith('/profile') ||
            url.endsWith('/profile/');
    }

    exportCV() {
        this.user$.pipe(take(1)).subscribe(async user => {
            if (!user) return;
            const invId = (user as any).id; // Ensure AuthResponse has this or user object has it

            if (!invId) {
                this.alertService.warning('Aviso', 'No se encontró un perfil de investigador asociado para exportar.');
                return;
            }

            this.isExporting = true;

            try {
                await this.cvExportService.generateFullCV(invId, user);
                this.alertService.close();
                this.alertService.success('Éxito', 'CV exportado correctamente');
            } catch (err) {
                console.error('Error exporting CV', err);
                this.alertService.close();
                this.alertService.error('Error', 'Hubo un problema al generar el CV');
            } finally {
                this.isExporting = false;
                this.cdr.detectChanges();
            }
        });
    }
}
