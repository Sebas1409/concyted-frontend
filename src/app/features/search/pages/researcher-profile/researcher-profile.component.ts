import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HeaderComponent } from '../../../landing/components/header/header.component';
import { FooterComponent } from '../../../landing/components/footer/footer.component';
import { ResearcherCvComponent } from '../../../../shared/components/researcher-cv/researcher-cv.component';
import { AuthService } from '../../../../core/services/auth.service';
import { UbigeoService } from '../../../../core/services/ubigeo.service';
import { CatalogService } from '../../../../core/services/catalog.service';
import { EducationService } from '../../../../core/services/education.service';
import { WorkExperienceService } from '../../../../core/services/work-experience.service';
import { LanguageService } from '../../../../core/services/language.service';
import { IntellectualPropertyService } from '../../../../core/services/intellectual-property.service';
import { DistinctionService } from '../../../../core/services/distinction.service';
import { FileService } from '../../../../core/services/file.service';
import { CapitalizePipe } from '../../../../shared/pipes/capitalize.pipe';
import { forkJoin, of } from 'rxjs';
import { catchError, finalize } from 'rxjs/operators';

@Component({
    selector: 'app-researcher-profile',
    standalone: true,
    imports: [CommonModule, RouterLink, HeaderComponent, FooterComponent, ResearcherCvComponent],
    templateUrl: './researcher-profile.component.html',
    styleUrls: ['./researcher-profile.component.scss']
})
export class ResearcherPublicProfileComponent implements OnInit {
    private route = inject(ActivatedRoute);
    private authService = inject(AuthService);
    private ubigeoService = inject(UbigeoService);
    private catalogService = inject(CatalogService);
    private educationService = inject(EducationService);
    private workExperienceService = inject(WorkExperienceService);
    private languageService = inject(LanguageService);
    private ipService = inject(IntellectualPropertyService);
    private distinctionService = inject(DistinctionService);
    private fileService = inject(FileService);
    private cdr = inject(ChangeDetectorRef);

    researcherId: string | null = null;
    isLoading = true;

    // Data for ResearcherCvComponent
    researcher: any = null;
    generalData: any = null;

    // Tabs Data
    academicFormation: any[] = [];
    technicalFormation: any[] = [];
    workExperience: any[] = [];
    docenteExperience: any[] = [];
    ctiManagementExperience: any[] = [];
    boardExperience: any[] = [];
    projects: any[] = [];
    scientificProduction: any[] = [];
    languages: any[] = [];
    thesisAdvisory: any[] = [];
    thesisJury: any[] = [];

    // Catalogs for translation
    projectRoles: any[] = [];
    projectTypes: any[] = [];
    institutionTypes: any[] = [];
    docentTypes: any[] = [];

    ngOnInit(): void {
        this.loadCatalogs();
        this.route.paramMap.subscribe(params => {
            const id = params.get('id');
            if (id) {
                this.researcherId = id;
                this.loadResearcherData(Number(id));
            }
        });
    }

    private loadCatalogs() {
        this.catalogService.getMasterDetailsByCode('TIPEXP').subscribe(data => this.projectRoles = data);
        this.catalogService.getMasterDetailsByCode('TIPPRO').subscribe(data => this.projectTypes = data);
        this.catalogService.getMasterDetailsByCode('TIPINS').subscribe(data => this.institutionTypes = data);
        this.catalogService.getMasterDetailsByCode('TIPDOC').subscribe(data => this.docentTypes = data);
    }

    loadResearcherData(investigatorId: number) {
        this.isLoading = true;
        this.authService.getInvestigatorByUserId(investigatorId).subscribe({
            next: (data) => {
                const res = data.data || data;
                console.log('Researcher Profile Loaded:', res);
                const investigatorId = res.id;

                // 1. Basic Researcher Header
                this.researcher = {
                    name: `${res.nombres || ''} ${res.apellidoPaterno || ''} ${res.apellidoMaterno || ''}`.trim().toUpperCase() || 'INVESTIGADOR',
                    bio: res.resumenEjecutivo || 'Sin resumen profesional registrado.',
                    photo: res.fotoToken ? this.fileService.getFileUrl(res.fotoToken) : null,
                    renacytCode: res.codigoUnico || '---',
                    scopusId: res.scopusAuthorId || '---',
                    orcidId: res.orcid || '---',
                    conductDate: res.fechaValidacion || '---',
                    lastUpdate: res.updatedAt ? new Date(res.updatedAt).toLocaleDateString() : '---'
                };

                // 2. Personal Table Data
                this.generalData = {
                    gender: res.sexo || '---',
                    nationality: res.nacionalidad || '---',
                    email: res.emailPublico || res.email || '---',
                    phone: res.celular || res.telefono || '---',
                    residence: '---'
                };

                // 3. Fetch names for IDs
                this.loadMappedNames(res);

                // 4. Load All Sections
                if (investigatorId) {
                    this.loadAllSections(investigatorId);
                } else {
                    this.isLoading = false;
                }
            },
            error: (err) => {
                console.error('Error loading researcher data', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }

    private loadMappedNames(res: any) {
        if (res.sexo) {
            this.catalogService.getMasterDetails(2).subscribe(genders => {
                const gender = genders.find(g => g.codigo === res.sexo || g.id === Number(res.sexo));
                if (gender) this.generalData.gender = gender.nombre;
            });
        }

        const countryId = res.paisResidenciaId || res.paisId;

        if (countryId) {
            this.ubigeoService.getCountries().subscribe(countries => {
                const country = countries.find(c => Number(c.id) === Number(countryId));
                if (country) {
                    let residence = country.nombre;
                    if (res.departamentoId) {
                        this.ubigeoService.getDepartments(Number(countryId)).subscribe(depts => {
                            const dept = depts.find(d => Number(d.id) === Number(res.departamentoId));
                            if (dept) {
                                residence += ` / ${dept.nombre}`;
                                if (res.provinciaId) {
                                    this.ubigeoService.getDistricts(Number(res.provinciaId)).subscribe(districts => {
                                        const dist = districts.find(d => Number(d.id) === Number(res.distritoId));
                                        if (dist) {
                                            residence += ` / ${dist.nombre}`;
                                        }
                                        this.generalData.residence = residence;
                                        this.cdr.detectChanges();
                                    });
                                } else {
                                    this.generalData.residence = residence;
                                    this.cdr.detectChanges();
                                }
                            } else {
                                this.generalData.residence = residence;
                                this.cdr.detectChanges();
                            }
                        });
                    } else {
                        this.generalData.residence = residence;
                        this.cdr.detectChanges();
                    }

                    if (!res.nacionalidad) {
                        this.generalData.nationality = country.nombre.toUpperCase() === 'PERÚ' ? 'PERUANA' : 'EXTRANJERA';
                    }
                }
            });
        }
    }

    private loadAllSections(investigatorId: number) {
        const sections$ = {
            academic: this.educationService.getAcademicByInvestigator(investigatorId).pipe(catchError(() => of([]))),
            technical: this.educationService.getTechnicalByInvestigator(investigatorId, false).pipe(catchError(() => of([]))),
            work: this.workExperienceService.getWorkExperiences(investigatorId).pipe(catchError(() => of([]))),
            docente: this.workExperienceService.getDocentExperiences(investigatorId).pipe(catchError(() => of([]))),
            languages: this.languageService.getLanguagesByInvestigator(investigatorId).pipe(catchError(() => of([]))),
            projects: this.workExperienceService.getProjects(investigatorId).pipe(catchError(() => of([]))),
            thesis: this.workExperienceService.getThesisAdvisors(investigatorId).pipe(catchError(() => of([]))),
            ip: this.ipService.getIntellectualPropertiesByInvestigator(investigatorId).pipe(catchError(() => of([]))),
            distinctions: this.distinctionService.getDistinctions(investigatorId).pipe(catchError(() => of([])))
        };

        forkJoin(sections$).pipe(
            finalize(() => {
                this.isLoading = false;
                this.cdr.detectChanges();
            })
        ).subscribe({
            next: results => {
                // Map Academic
                this.academicFormation = results.academic.map(item => ({
                    institution: item.institucionNombre,
                    degree: item.nivelAcademicoNombre,
                    title: item.nombreTituloGrado,
                    endDate: item.fechaFin,
                    source: item.esSunedu ? 'SUNEDU' : 'MANUAL'
                }));

                // Map Technical
                this.technicalFormation = results.technical.map(item => ({
                    institution: item.institucionNombre,
                    career: item.carreraTecnica,
                    startDate: item.fechaInicio,
                    endDate: item.fechaFin
                }));

                // Map Work
                this.workExperience = results.work.map(item => ({
                    institution: item.nombreInstitucion,
                    position: item.cargo,
                    description: item.descripcion,
                    startDate: item.fechaInicio,
                    endDate: item.actualmenteTrabaja ? 'Actualidad' : item.fechaFin
                }));

                // Map Docente
                this.docenteExperience = results.docente.map(item => {
                    const instType = this.institutionTypes.find(t => t.codigo === item.tipoInstitucion);
                    const docType = this.docentTypes.find(t => t.codigo === item.tipoDocente);

                    return {
                        institution: item.nombreInstitucion,
                        type: instType ? instType.nombre : item.tipoInstitucion,
                        docenteType: docType ? docType.nombre : item.tipoDocente,
                        description: item.cargo || '---',
                        startDate: item.fechaInicio,
                        endDate: item.actualmenteDicta ? 'Actualidad' : item.fechaFin
                    };
                });

                // Map Languages
                this.languages = results.languages.map(item => ({
                    language: item.idiomaNombre,
                    level: item.nivelConversacionNombre,
                    reading: item.nivelLecturaNombre,
                    writing: item.nivelEscrituraNombre,
                    speaking: item.nivelConversacionNombre
                }));

                // Map Projects
                this.projects = results.projects.map(item => {
                    const roleCode = item.rolDesempenado || item.rol;
                    const typeCode = item.tipoProyectoCti || item.tipoProyecto;
                    const role = this.projectRoles.find(r => r.codigo === roleCode);
                    const type = this.projectTypes.find(t => t.codigo === typeCode);

                    return {
                        title: item.nombreConcurso || '---',
                        type: type ? type.nombre : (typeCode || '---'),
                        role: role ? role.nombre : (roleCode || '---'),
                        amount: item.montoUsd || 0,
                        status: 'Activo' // Or map from data if available
                    };
                });

                // Map Thesis
                this.thesisAdvisory = results.thesis.map(item => ({
                    student: item.tesistas || '---',
                    thesis: item.titulo || '---',
                    university: item.nombreInstitucion || '---',
                    year: item.fechaAceptacion ? new Date(item.fechaAceptacion).getFullYear() : '---'
                }));

                // Map Industrial/IP & Distinctions to Scientific Production tab
                const ipItems = results.ip.map(item => ({
                    type: item.tipoPropiedadNombre || 'Propiedad Intelectual',
                    title: item.titulo,
                    details: `${item.entidadRegistroNombre || ''} - ${item.numeroRegistro || ''}`,
                    year: item.createdAt ? new Date(item.createdAt).getFullYear() : '---'
                }));

                const distinctionItems = results.distinctions.map(item => ({
                    type: 'Distinción / Premio',
                    title: item.nombre,
                    details: item.nombreInstitucion,
                    year: item.fechaReconocimiento ? new Date(item.fechaReconocimiento).getFullYear() : '---'
                }));

                this.scientificProduction = [...ipItems, ...distinctionItems];
                this.cdr.detectChanges();
            },
            error: (err) => {
                console.error('Error loading sections', err);
                this.isLoading = false;
                this.cdr.detectChanges();
            }
        });
    }
}
