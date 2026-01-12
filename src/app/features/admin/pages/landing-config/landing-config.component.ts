import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IntroCardComponent } from '../../../../shared/components/intro-card/intro-card.component';
import { FormModalComponent } from '../../../../shared/components/form-modal/form-modal.component';
import { LandingService, LandingHeader, LandingDetail } from '../../../../core/services/landing.service';
import { AlertService } from '../../../../core/services/alert.service';
import { LandingSectionCode } from '../../../../core/constants/landing-section-codes';
import { FileService } from '../../../../core/services/file.service';
import { SingleImageUploadComponent } from '../../../../shared/components/single-image-upload/single-image-upload.component';
import { FileType } from '../../../../core/constants/file-upload.constants';

interface SlideItem {
    id: string;
    image: string;
    researcherName: string;
    specialty: string;
    metrics: string;
    level: string;
    published: boolean;
}

interface AllyItem {
    id: string;
    logo: string;
    name: string;
    published: boolean;
}

interface ObjectivePublicItem {
    id: string;
    image: string;
    title: string;
    description: string;
    tags: string;
    published: boolean;
}

interface TestimonyItem {
    id: string;
    image: string; // Photo
    logo: string; // Logo
    researcherName: string;
    role: string;
    quote: string;
    published: boolean;
}

interface MetricItem {
    id: string;
    title: string;
    value: string;
    source: 'db' | 'manual';
    published: boolean;
}

interface BenefitItem {
    id: string;
    image: string;
    title: string;
    description: string;
    published: boolean;
}

@Component({
    selector: 'app-landing-config',
    standalone: true,
    imports: [CommonModule, FormsModule, IntroCardComponent, FormModalComponent, SingleImageUploadComponent],
    templateUrl: './landing-config.component.html',
    styleUrl: './landing-config.component.scss'
})
export class LandingConfigComponent implements OnInit {
    private landingService = inject(LandingService);
    private alertService = inject(AlertService);
    private cdr = inject(ChangeDetectorRef);

    activeTab: 'hero' | 'aliados' | 'beneficios' | 'publico' | 'testimonios' | 'metricas' | 'notificacion' = 'hero';
    protected readonly FileType = FileType;

    // Header State
    currentHeader: LandingHeader | null = null;
    headerForm = {
        title: '',
        subtitle: ''
    };

    // Modal State - Hero
    showSlideModal: boolean = false;
    slideForm = {
        id: '',
        researcherName: '',
        specialty: '',
        metrics: '',
        level: '',
        published: true,
        image: null as string | null
    };

    // Modal State - Allies
    showAllyModal: boolean = false;
    allyForm = {
        id: '',
        name: '',
        published: true,
        logo: null as string | null
    };

    // Modal State - Publico
    showPublicModal: boolean = false;
    publicForm = {
        id: '',
        title: '',
        description: '',
        tags: '',
        image: null,
        published: true,
        mainTitle: '',
        mainDescription: ''
    };

    // Modal State - Testimonios
    showTestimonyModal: boolean = false;
    testimonyForm: {
        id: string;
        researcherName: string;
        role: string;
        quote: string;
        image: string | null;
        logo: string | null;
        published: boolean;
    } = {
            id: '',
            researcherName: '',
            role: '',
            quote: '',
            image: null,
            logo: null,
            published: true
        };

    // Carousel Table State
    pageSize: number = 10;
    slides: SlideItem[] = [];

    // Allies Table State
    alliesPageSize: number = 10;
    allies: AllyItem[] = [
        { id: '01', logo: 'Logo', name: 'Sofia Herrera', published: true },
        { id: '02', logo: 'Logo', name: 'Ricardo Palma', published: true },
        { id: '03', logo: 'Logo', name: 'Gabriela Mistral', published: true },
        { id: '03', logo: 'Logo', name: 'Javier Pérez de Cuéllar', published: true },
        { id: '03', logo: 'Logo', name: 'Chabuca Granda', published: true },
        { id: '03', logo: 'Logo', name: 'César Vallejo', published: true },
        { id: '03', logo: 'Logo', name: 'María Rostworowski', published: true },
        { id: '03', logo: 'Logo', name: 'Daniel Alcides Carrión', published: true },
    ];

    // Publico Objetivo State (Mock data)
    publicItems: ObjectivePublicItem[] = [
        {
            id: '01',
            image: 'JA',
            title: 'Ej: Financiamiento y Concursos...',
            description: 'Breve descripción que aparecerá en la tarjeta...',
            tags: 'Investigadores',
            published: true
        },
        {
            id: '02',
            image: 'JA',
            title: 'Ej: Financiamiento y Concursos...',
            description: 'Breve descripción que aparecerá en la tarjeta...',
            tags: 'Investigadores',
            published: true
        },
        {
            id: '03',
            image: 'JA',
            title: 'Ej: Financiamiento y Concursos...',
            description: 'Breve descripción que aparecerá en la tarjeta...',
            tags: 'Investigadores',
            published: true
        }
    ];

    // Publico Header Form
    publicHeader = {
        title: 'Un ecosistema conectado...',
        description: 'Breve descripción que aparecerá en la tarjeta...'
    };

    // Testimonios State
    testimoniesPageSize: number = 10;
    testimonies: TestimonyItem[] = [
        { id: '01', image: 'Logo', logo: 'Icon', researcherName: 'Sofia Herrera', role: 'Bioingeniería - UTEC', quote: 'Text...', published: true },
        { id: '02', image: 'Logo', logo: 'Icon', researcherName: 'Ricardo Palma', role: 'Diseño Gráfico - UNI', quote: 'Text...', published: true },
        { id: '03', image: 'Logo', logo: 'Icon', researcherName: 'Gabriela Mistral', role: 'Ciencias de la Computación', quote: 'Text...', published: true },
        { id: '03', image: 'Logo', logo: 'Icon', researcherName: 'Javier Pérez', role: 'Administración', quote: 'Text...', published: true },
        { id: '03', image: 'Logo', logo: 'Icon', researcherName: 'Chabuca Granda', role: 'Ingeniería', quote: 'Text...', published: true },
        { id: '03', image: 'Logo', logo: 'Icon', researcherName: 'César Vallejo', role: 'Marketing', quote: 'Text...', published: true },
        { id: '03', image: 'Logo', logo: 'Icon', researcherName: 'María Rostworowski', role: 'Arquitectura', quote: 'Text...', published: true },
        { id: '03', image: 'Logo', logo: 'Icon', researcherName: 'Daniel Alcides', role: 'Psicología', quote: 'Text...', published: true },
    ];

    // Metric Items
    metrics: MetricItem[] = [];

    // Notification State
    notificationHeader: LandingHeader | null = null;
    notificationForm = {
        id: '',
        description: '',
        buttonTitle: '',
        url: '',
        startDate: '',
        endDate: ''
    };

    // Benefits Items (Mock)
    benefits: BenefitItem[] = [
        {
            id: '01',
            image: 'JA',
            title: 'Ej: Financiamiento y Concursos...',
            description: 'Breve descripción que aparecerá en la tarjeta...',
            published: true
        },
        {
            id: '02',
            image: 'JA',
            title: 'Ej: Financiamiento y Concursos...',
            description: 'Breve descripción que aparecerá en la tarjeta...',
            published: true
        },
        {
            id: '03',
            image: 'JA',
            title: 'Ej: Financiamiento y Concursos...',
            description: 'Breve descripción que aparecerá en la tarjeta...',
            published: true
        }
    ];


    ngOnInit() {
        this.loadHeroConfig();
        this.loadAllies();
        this.loadBenefits();
        this.loadPublicConfig();
        this.loadTestimonies();
        this.loadMetrics();
        this.loadNotificationConfig();
    }

    loadHeroConfig() {
        this.landingService.getHeaderByCode(LandingSectionCode.HERO).subscribe({
            next: (data) => {
                console.log('Hero config loaded:', data);
                this.currentHeader = data;
                this.headerForm = {
                    title: data.titulo || '',
                    subtitle: data.subtitulo || ''
                };
                this.loadSlides();
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading hero config', err);
                this.alertService.error('Error', 'No se pudo cargar la configuración del encabezado.');
            }
        });
    }

    loadSlides() {
        this.landingService.getDetailsByHeaderCode(LandingSectionCode.HERO).subscribe({
            next: (data) => {
                console.log('Slides loaded:', data);
                this.slides = data.map(item => ({
                    id: item.id.toString(),
                    image: item.fotoToken,
                    researcherName: item.nombre,
                    specialty: item.detalle1,
                    metrics: item.detalle2,
                    level: item.detalle3,
                    published: item.publicado
                }));
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading slides', err);
            }
        });
    }

    toggleTab(tab: any) {
        this.activeTab = tab;
    }

    /* Hero Methods */
    updateHeader() {
        if (!this.headerForm.title.trim() || !this.headerForm.subtitle.trim()) {
            this.alertService.warning('Campos incompletos', 'El título y subtítulo son obligatorios.');
            return;
        }

        if (!this.currentHeader) {
            this.alertService.error('Error', 'No se ha cargado la configuración inicial.');
            return;
        }

        this.alertService.confirm('¿Actualizar encabezado?', 'Los cambios serán visibles inmediatamente en el portal público.')
            .then((confirmed) => {
                if (confirmed) {
                    const payload: LandingHeader = {
                        ...this.currentHeader!,
                        titulo: this.headerForm.title,
                        subtitulo: this.headerForm.subtitle
                    };

                    this.landingService.updateHeader(this.currentHeader!.id, payload).subscribe({
                        next: () => {
                            this.alertService.success('Éxito', 'El encabezado ha sido actualizado correctamente.');
                            this.loadHeroConfig();
                            this.cdr.markForCheck();
                        },
                        error: (err) => {
                            console.error('Error updating header', err);
                            this.alertService.error('Error', 'Ocurrió un error al actualizar el encabezado.');
                        }
                    });
                }
            });
    }

    onSlideImageUploaded(token: string) {
        this.slideForm.image = token;
        console.log('Image token updated:', token);
    }

    /* Modal Methods */
    openSlideModal(slide?: SlideItem) {
        console.log('openSlideModal called with:', slide);
        if (slide) {
            this.slideForm = {
                id: slide.id,
                researcherName: slide.researcherName,
                specialty: slide.specialty,
                metrics: slide.metrics,
                level: slide.level,
                published: slide.published,
                image: slide.image // Pass the token directly
            };
            console.log('slideForm populated:', this.slideForm);
        } else {
            this.slideForm = { id: '', researcherName: '', specialty: '', metrics: '', level: '', published: true, image: null };
        }
        this.showSlideModal = true;
    }

    saveSlide() {
        if (!this.slideForm.researcherName || !this.slideForm.specialty || !this.slideForm.metrics || !this.slideForm.level) {
            this.alertService.warning('Campos incompletos', 'Todos los campos marcados con * son obligatorios.');
            return;
        }

        const isEdit = !!this.slideForm.id;
        const actionTitle = isEdit ? 'Confirmar actualización' : 'Confirmar registro';
        const actionMsg = isEdit ? '¿Está seguro de que desea actualizar este slide?' : '¿Está seguro de que desea agregar este slide?';

        this.alertService.confirm(actionTitle, actionMsg)
            .then((confirmed) => {
                if (confirmed) {

                    const token = this.slideForm.image ?? '';
                    this.processSaveSlide(isEdit, token);
                }
            });
    }

    processSaveSlide(isEdit: boolean, token: string) {
        const detail: LandingDetail = {
            id: isEdit ? parseInt(this.slideForm.id) : 0,
            codigoEncabezado: LandingSectionCode.HERO,
            nombre: this.slideForm.researcherName,
            detalle1: this.slideForm.specialty,
            detalle2: this.slideForm.metrics,
            detalle3: this.slideForm.level,
            fotoToken: token,
            logoToken: '',
            fuenteDato: '',
            orden: 0,
            publicado: this.slideForm.published,
            activo: true
        };

        const request$ = isEdit
            ? this.landingService.updateDetail(detail.id, detail)
            : this.landingService.createDetail(detail);

        request$.subscribe({
            next: (res) => {
                this.alertService.success('Éxito', isEdit ? 'Slide actualizado correctamente.' : 'Slide agregado correctamente.');
                this.showSlideModal = false;
                this.loadSlides();
                console.log('Slide saved:', res);
            },
            error: (err) => {
                console.error('Error saving slide', err);
                this.alertService.error('Error', 'No se pudo guardar el slide.');
            }
        });
    }

    deleteSlide(id: string) {
        this.alertService.confirm('Eliminar registro', '¿Está seguro de eliminar este slide?')
            .then((confirmed) => {
                if (confirmed) {
                    this.landingService.deleteDetail(parseInt(id)).subscribe({
                        next: () => {
                            this.alertService.success('Éxito', 'Slide eliminado correctamente.');
                            this.loadSlides();
                        },
                        error: (err) => {
                            console.error('Error deleting slide', err);
                            this.alertService.error('Error', 'No se pudo eliminar el slide.');
                        }
                    });
                }
            });
    }

    /* Allies Methods */
    loadAllies() {
        this.landingService.getDetailsByHeaderCode(LandingSectionCode.ALIADOS).subscribe({
            next: (data) => {
                console.log('Allies loaded:', data);
                this.allies = data.map(item => ({
                    id: item.id.toString(),
                    logo: item.fotoToken,
                    name: item.nombre,
                    published: item.publicado
                }));
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading allies', err);
            }
        });
    }

    onAllyImageUploaded(token: string) {
        this.allyForm.logo = token;
        console.log('Ally image token updated:', token);
    }

    openAllyModal(ally?: AllyItem) {
        if (ally) {
            this.allyForm = { id: ally.id, name: ally.name, published: ally.published, logo: ally.logo };
        } else {
            this.allyForm = { id: '', name: '', published: true, logo: null };
        }
        this.showAllyModal = true;
    }

    saveAlly() {
        if (!this.allyForm.name) {
            this.alertService.warning('Campos incompletos', 'El nombre de la institución es obligatorio.');
            return;
        }

        const isEdit = !!this.allyForm.id;
        const actionTitle = isEdit ? 'Confirmar actualización' : 'Confirmar registro';
        const actionMsg = isEdit ? '¿Está seguro de que desea actualizar este aliado?' : '¿Está seguro de que desea agregar este aliado?';

        this.alertService.confirm(actionTitle, actionMsg)
            .then((confirmed) => {
                if (confirmed) {
                    const token = this.allyForm.logo ?? '';
                    this.processSaveAlly(isEdit, token);
                }
            });
    }

    processSaveAlly(isEdit: boolean, token: string) {
        const detail: LandingDetail = {
            id: isEdit ? parseInt(this.allyForm.id) : 0,
            codigoEncabezado: LandingSectionCode.ALIADOS,
            nombre: this.allyForm.name,
            detalle1: '',
            detalle2: '',
            detalle3: '',
            fotoToken: token,
            logoToken: '',
            fuenteDato: '',
            orden: 0,
            publicado: this.allyForm.published,
            activo: true
        };

        const request$ = isEdit
            ? this.landingService.updateDetail(detail.id, detail)
            : this.landingService.createDetail(detail);

        request$.subscribe({
            next: (res) => {
                this.alertService.success('Éxito', isEdit ? 'Aliado actualizado correctamente.' : 'Aliado agregado correctamente.');
                this.showAllyModal = false;
                this.loadAllies();
            },
            error: (err) => {
                console.error('Error saving ally', err);
                this.alertService.error('Error', 'No se pudo guardar el aliado.');
            }
        });
    }

    deleteAlly(id: string) {
        this.alertService.confirm('Eliminar registro', '¿Está seguro de eliminar este aliado?')
            .then((confirmed) => {
                if (confirmed) {
                    this.landingService.deleteDetail(parseInt(id)).subscribe({
                        next: () => {
                            this.alertService.success('Éxito', 'Aliado eliminado correctamente.');
                            this.loadAllies();
                        },
                        error: (err) => {
                            console.error('Error deleting ally', err);
                            this.alertService.error('Error', 'No se pudo eliminar el aliado.');
                        }
                    });
                }
            });
    }

    /* Benefits Methods */
    loadBenefits() {
        this.landingService.getDetailsByHeaderCode(LandingSectionCode.BENEFICIOS).subscribe({
            next: (data) => {
                console.log('Benefits loaded:', data);
                const mappedButtons = data.map((item) => ({
                    id: item.id.toString(),
                    image: item.fotoToken,
                    title: item.nombre,
                    description: item.detalle1,
                    published: item.publicado
                }));

                this.benefits = mappedButtons;
                // Ensure always 3 items
                while (this.benefits.length < 3) {
                    this.benefits.push({
                        id: '0',
                        image: '',
                        title: '',
                        description: '',
                        published: true
                    });
                }
                this.cdr.markForCheck();
            },
            error: (err) => {
                console.error('Error loading benefits', err);
            }
        });
    }

    updateBenefit(item: BenefitItem) {
        const isEdit = item.id !== '0';
        const actionMsg = isEdit ? '¿Desea actualizar este beneficio?' : '¿Desea crear este beneficio?';

        this.alertService.confirm('Confirmar acción', actionMsg)
            .then((confirmed) => {
                if (confirmed) {
                    const index = this.benefits.indexOf(item);
                    const order = index >= 0 ? index + 1 : 0;

                    if (order === 0) {
                        this.alertService.error('Error', 'No se pudo determinar el orden del beneficio.');
                        return;
                    }

                    const detail: LandingDetail = {
                        id: isEdit ? parseInt(item.id) : 0,
                        codigoEncabezado: LandingSectionCode.BENEFICIOS,
                        nombre: item.title,
                        detalle1: item.description,
                        detalle2: '',
                        detalle3: '',
                        fotoToken: item.image || '',
                        logoToken: '',
                        fuenteDato: '',
                        orden: order,
                        publicado: item.published,
                        activo: true
                    };

                    const request$ = isEdit
                        ? this.landingService.updateDetail(detail.id, detail)
                        : this.landingService.createDetail(detail);

                    request$.subscribe({
                        next: () => {
                            this.alertService.success('Éxito', isEdit ? 'Beneficio actualizado correctamente.' : 'Beneficio creado correctamente.');
                            this.loadBenefits();
                        },
                        error: (err) => {
                            console.error('Error saving benefit', err);
                            this.alertService.error('Error', 'No se pudo guardar el beneficio.');
                        }
                    });
                }
            });
    }

    /* Publico Objetivo Methods */
    loadPublicConfig() {
        // Load Header
        this.landingService.getHeaderByCode(LandingSectionCode.PUBLICO).subscribe({
            next: (data) => {
                this.publicHeader = {
                    title: data.titulo || '',
                    description: data.subtitulo || ''
                };
                this.cdr.markForCheck();
            },
            error: (err) => console.error('Error loading public header', err)
        });

        // Load Items
        this.landingService.getDetailsByHeaderCode(LandingSectionCode.PUBLICO).subscribe({
            next: (data) => {
                this.publicItems = data.map(item => ({
                    id: item.id.toString(),
                    image: item.fotoToken,
                    title: item.nombre,
                    description: item.detalle1,
                    tags: item.detalle2,
                    published: item.publicado
                }));

                // Ensure always at least 3 items
                while (this.publicItems.length < 3) {
                    this.publicItems.push({
                        id: '0',
                        image: '',
                        title: '',
                        description: '',
                        tags: 'Investigadores',
                        published: true
                    });
                }
                this.cdr.markForCheck();
            },
            error: (err) => console.error('Error loading public items', err)
        });
    }

    savePublicHeader() {
        if (!this.publicHeader.title.trim() || !this.publicHeader.description.trim()) {
            this.alertService.warning('Campos incompletos', 'El título y descripción son obligatorios.');
            return;
        }

        this.landingService.getHeaderByCode(LandingSectionCode.PUBLICO).subscribe(header => {
            const payload: LandingHeader = {
                ...header,
                titulo: this.publicHeader.title,
                subtitulo: this.publicHeader.description
            };
            this.landingService.updateHeader(header.id, payload).subscribe({
                next: () => {
                    this.alertService.success('Éxito', 'Título de sección guardado correctamente.');
                },
                error: () => this.alertService.error('Error', 'No se pudo guardar el título.')
            });
        });
    }

    savePublicItem(item: ObjectivePublicItem) {
        if (!item.title || !item.description) {
            this.alertService.warning('Aviso', 'Complete el título y descripción antes de guardar.');
            return;
        }

        const isEdit = item.id !== '0';
        const index = this.publicItems.indexOf(item);
        const detail: LandingDetail = {
            id: isEdit ? parseInt(item.id) : 0,
            codigoEncabezado: LandingSectionCode.PUBLICO,
            nombre: item.title,
            detalle1: item.description,
            detalle2: item.tags,
            detalle3: '',
            fotoToken: item.image || '',
            logoToken: '',
            fuenteDato: '',
            orden: index + 1,
            publicado: item.published,
            activo: true
        };

        const request$ = isEdit
            ? this.landingService.updateDetail(detail.id, detail)
            : this.landingService.createDetail(detail);

        request$.subscribe({
            next: () => {
                this.alertService.success('Éxito', 'Cambios guardados correctamente.');
                this.loadPublicConfig();
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Error', 'No se pudo guardar el perfil.');
            }
        });
    }

    addPublicProfile() {
        const newItem: ObjectivePublicItem = {
            id: '0',
            image: '',
            title: '',
            description: '',
            tags: 'Investigadores', // Default
            published: true
        };
        this.publicItems.push(newItem);
    }

    removePublicProfile(index: number) {
        const item = this.publicItems[index];
        this.alertService.confirm('Eliminar tarjeta', '¿Está seguro de eliminar esta tarjeta?')
            .then((confirmed) => {
                if (confirmed) {
                    if (item.id !== '0') {
                        this.landingService.deleteDetail(parseInt(item.id)).subscribe({
                            next: () => {
                                this.alertService.success('Éxito', 'Tarjeta eliminada.');
                                this.loadPublicConfig();
                            },
                            error: () => this.alertService.error('Error', 'No se pudo eliminar.')
                        });
                    } else {
                        this.publicItems.splice(index, 1);
                    }
                }
            });
    }

    /* Metrics Methods */
    loadMetrics() {
        this.landingService.getDetailsByHeaderCode(LandingSectionCode.METRICAS).subscribe({
            next: (data) => {
                this.metrics = data.map(item => ({
                    id: item.id.toString(),
                    title: item.nombre,
                    value: item.detalle1,
                    source: (item.fuenteDato === 'manual' ? 'manual' : 'db') as 'db' | 'manual',
                    published: item.publicado
                }));

                // Ensure at least 6 items
                while (this.metrics.length < 6) {
                    this.metrics.push({
                        id: '0',
                        title: '',
                        value: '',
                        source: 'manual',
                        published: true
                    });
                }
                this.cdr.markForCheck();
            },
            error: (err) => console.error('Error loading metrics', err)
        });
    }

    updateMetric(item: MetricItem) {
        if (!item.title || !item.value) {
            this.alertService.warning('Campos incompletos', 'Título y Valor son obligatorios.');
            return;
        }

        const isEdit = item.id !== '0';
        const index = this.metrics.indexOf(item);
        const order = index + 1;

        const detail: LandingDetail = {
            id: isEdit ? parseInt(item.id) : 0,
            codigoEncabezado: LandingSectionCode.METRICAS,
            nombre: item.title,
            detalle1: item.value,
            detalle2: '',
            detalle3: '',
            fotoToken: '',
            logoToken: '',
            fuenteDato: item.source,
            orden: order,
            publicado: item.published,
            activo: true
        };

        const actionMsg = isEdit ? '¿Actualizar métrica?' : '¿Registrar métrica?';
        this.alertService.confirm('Confirmar', actionMsg).then(confirmed => {
            if (confirmed) {
                const request$ = isEdit
                    ? this.landingService.updateDetail(detail.id, detail)
                    : this.landingService.createDetail(detail);

                request$.subscribe({
                    next: () => {
                        this.alertService.success('Éxito', isEdit ? 'Métrica actualizada.' : 'Métrica registrada.');
                        this.loadMetrics();
                    },
                    error: (err) => {
                        console.error('Error saving metric', err);
                        this.alertService.error('Error', 'No se pudo guardar la métrica.');
                    }
                });
            }
        });
    }

    /* Testimonios Methods */
    loadTestimonies() {
        this.landingService.getDetailsByHeaderCode(LandingSectionCode.TESTIMONIOS).subscribe({
            next: (data) => {
                this.testimonies = data.map(item => ({
                    id: item.id.toString(),
                    image: item.fotoToken,
                    logo: item.logoToken,
                    researcherName: item.nombre,
                    role: item.detalle1,
                    quote: item.detalle2,
                    published: item.publicado
                }));
                this.cdr.markForCheck();
            },
            error: (err) => console.error('Error loading testimonies', err)
        });
    }

    onTestimonyImageUploaded(token: string) {
        this.testimonyForm.image = token;
    }

    onTestimonyLogoUploaded(token: string) {
        this.testimonyForm.logo = token;
    }

    openTestimonyModal(item?: TestimonyItem) {
        if (item) {
            this.testimonyForm = {
                id: item.id,
                researcherName: item.researcherName,
                role: item.role,
                quote: item.quote,
                published: item.published,
                image: item.image,
                logo: item.logo
            };
        } else {
            this.testimonyForm = { id: '', researcherName: '', role: '', quote: '', published: true, image: null, logo: null };
        }
        this.showTestimonyModal = true;
    }

    saveTestimony() {
        if (!this.testimonyForm.researcherName || !this.testimonyForm.quote) {
            this.alertService.warning('Campos incompletos', 'Nombre y testimonio son obligatorios.');
            return;
        }

        const isEdit = !!this.testimonyForm.id;
        const detail: LandingDetail = {
            id: isEdit ? parseInt(this.testimonyForm.id) : 0,
            codigoEncabezado: LandingSectionCode.TESTIMONIOS,
            nombre: this.testimonyForm.researcherName,
            detalle1: this.testimonyForm.role,
            detalle2: this.testimonyForm.quote,
            detalle3: '',
            fotoToken: this.testimonyForm.image || '',
            logoToken: this.testimonyForm.logo || '',
            fuenteDato: '',
            orden: 0,
            publicado: this.testimonyForm.published,
            activo: true
        };

        const request$ = isEdit
            ? this.landingService.updateDetail(detail.id, detail)
            : this.landingService.createDetail(detail);

        request$.subscribe({
            next: () => {
                this.alertService.success('Éxito', isEdit ? 'Testimonio actualizado.' : 'Testimonio creado.');
                this.showTestimonyModal = false;
                this.loadTestimonies();
            },
            error: (err) => {
                console.error(err);
                this.alertService.error('Error', 'No se pudo guardar el testimonio.');
            }
        });
    }

    deleteTestimony(id: string) {
        this.alertService.confirm('Eliminar testimonio', '¿Está seguro de eliminar este testimonio?')
            .then((confirmed) => {
                if (confirmed) {
                    this.landingService.deleteDetail(parseInt(id)).subscribe({
                        next: () => {
                            this.alertService.success('Éxito', 'Testimonio eliminado.');
                            this.loadTestimonies();
                        },
                        error: () => this.alertService.error('Error', 'No se pudo eliminar.')
                    });
                }
            });
    }
    /* Notification Methods */
    /* Notification Methods */
    loadNotificationConfig() {
        this.landingService.getHeaderByCode(LandingSectionCode.AYUDA).subscribe({
            next: (data) => {
                if (data) {
                    this.notificationHeader = data;
                    // Format for date: YYYY-MM-DD
                    const formatDate = (dateStr?: string) => {
                        if (!dateStr) return '';
                        return dateStr.split('T')[0];
                    };

                    this.notificationForm = {
                        id: data.id.toString(),
                        description: data.titulo || '',
                        buttonTitle: data.subtitulo || '',
                        url: data.subtituloEnlace || '',
                        startDate: formatDate(data.fechaInicio),
                        endDate: formatDate(data.fechaFin)
                    };
                }
                this.cdr.markForCheck();
            },
            error: (err) => console.error('Error loading notification config', err)
        });
    }

    saveNotification() {
        if (!this.notificationForm.description || !this.notificationForm.buttonTitle || !this.notificationForm.url) {
            this.alertService.warning('Campos incompletos', 'Descripción, Título del Botón y URL son obligatorios.');
            return;
        }

        if (!this.notificationForm.startDate || !this.notificationForm.endDate) {
            this.alertService.warning('Campos incompletos', 'Fecha de Inicio y Fin son obligatorias.');
            return;
        }

        if (this.notificationForm.startDate > this.notificationForm.endDate) {
            this.alertService.warning('Fechas inválidas', 'La Fecha de Inicio no puede ser mayor a la Fecha de Fin.');
            return;
        }

        if (!this.notificationHeader) {
            this.alertService.error('Error', 'No se ha cargado la configuración inicial.');
            return;
        }

        const payload: LandingHeader = {
            ...this.notificationHeader,
            titulo: this.notificationForm.description,
            subtitulo: this.notificationForm.buttonTitle,
            subtituloEnlace: this.notificationForm.url,
            fechaInicio: this.notificationForm.startDate,
            fechaFin: this.notificationForm.endDate
        };

        this.landingService.updateHeader(this.notificationHeader.id, payload).subscribe({
            next: () => {
                this.alertService.success('Éxito', 'Notificación actualizada correctamente.');
                this.loadNotificationConfig();
            },
            error: (err) => {
                console.error('Error updating notification', err);
                this.alertService.error('Error', 'No se pudo guardar la notificación.');
            }
        });
    }



}
