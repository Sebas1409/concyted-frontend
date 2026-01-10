import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { CatalogService, CatalogItem } from '../../../../../core/services/catalog.service';
import { ActionButtonsComponent } from '../../../../../shared/components/action-buttons/action-buttons.component';
import { FormModalComponent } from '../../../../../shared/components/form-modal/form-modal.component';

interface ResearchLineEntry {
    id: string;
    isPrincipal: boolean;
    code: string;
    area: string;
    subArea: string;
    discipline: string;
    environmentalTheme: string;
    medicalTheme: string;
}

import { ResearchLineService, ResearchLine } from '../../../../../core/services/research-line.service';
import { AlertService } from '../../../../../core/services/alert.service';
import { AuthService } from '../../../../../core/services/auth.service';

@Component({
    selector: 'app-research-lines',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule, FormsModule, ActionButtonsComponent, FormModalComponent],
    templateUrl: './research-lines.component.html',
    styleUrl: './research-lines.component.scss'
})
export class ResearchLinesComponent implements OnInit {
    readonly AREA_NATURAL_SCIENCES = 1;
    readonly AREA_MEDICAL_SCIENCES = 3;
    readonly SUBAREA_EARTH_ENV = 105;
    showModal = false;
    researchForm: FormGroup;
    environmentalThemes: CatalogItem[] = [];
    medicalThemes: CatalogItem[] = [];
    areas: any[] = [];
    subAreas: any[] = [];
    disciplines: any[] = [];

    researchList: ResearchLine[] = [];
    currentResearchLineId: number | null = null;
    isEditMode = false;
    userId: number = 0;

    constructor(
        private fb: FormBuilder,
        private catalogService: CatalogService,
        private researchLineService: ResearchLineService,
        private alertService: AlertService,
        private authService: AuthService,
        private cdr: ChangeDetectorRef
    ) {
        this.researchForm = this.fb.group({
            area: ['', Validators.required],
            subArea: ['', Validators.required],
            discipline: ['', Validators.required],
            environmentalTheme: [''],
            shareMinam: [false],
            medicalTheme: [''],
            shareIns: [false]
        });
    }

    ngOnInit() {
        this.authService.currentUser$.subscribe(user => {
            if (user) {
                this.userId = user.id;
                this.loadResearchLines();
            }
        });

        this.loadEnvironmentalThemes();
        this.loadMedicalThemes();
        this.loadAreas();
    }

    loadResearchLines() {
        if (!this.userId) return; // Guard against no user ID

        this.researchLineService.getResearchLines(this.userId).subscribe({
            next: (data: any) => {
                // Ensure we handle both direct array and wrapped response
                this.researchList = data;
                console.log('Research Lines Data (Mapped):', this.researchList);
                this.cdr.detectChanges(); // Force view update immediately
            },
            error: (err) => console.error('Error loading research lines', err)
        });
    }

    trackByFn(index: number, item: any): any {
        return item.id; // unique id corresponding to the item
    }

    loadEnvironmentalThemes() {
        this.catalogService.getMasterDetails(7).subscribe({
            next: (data: any) => {
                console.log('Env Themes:', data);
                this.environmentalThemes = (data && Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
            },
            error: (err) => console.error('Failed to load environmental themes', err)
        });
    }

    loadMedicalThemes() {
        this.catalogService.getMasterDetails(8).subscribe({
            next: (data: any) => {
                console.log('Med Themes:', data);
                this.medicalThemes = (data && Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
            },
            error: (err) => console.error('Failed to load medical themes', err)
        });
    }

    loadAreas() {
        this.catalogService.getAreas().subscribe({
            next: (data: any) => {
                console.log('Areas loaded:', data);
                this.areas = (data && Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
            },
            error: (err) => {
                console.error('Failed to load areas', err);
            }
        });
    }

    // Conditional Logic State
    environmentalThemePlaceholder = 'Seleccione temática...';
    medicalThemePlaceholder = 'Seleccione temática...';
    isEnvironmentalDisabled = false;
    isMedicalDisabled = false;

    onAreaChange(event: any) {
        const areaId = Number(event.target.value);
        this.subAreas = [];
        this.researchForm.get('subArea')?.reset('');
        this.disciplines = [];
        this.researchForm.get('discipline')?.reset('');

        // Update Conditional Logic
        this.updateThemestatus(areaId, null);

        if (areaId) {
            this.catalogService.getSubAreas(areaId).subscribe({
                next: (data: any) => {
                    this.subAreas = (data && Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
                },
                error: (err) => console.error('Failed to load sub-areas', err)
            });
        }
    }

    onSubAreaChange(event: any) {
        const subAreaId = Number(event.target.value);
        const areaId = Number(this.researchForm.get('area')?.value);

        this.disciplines = [];
        this.researchForm.get('discipline')?.reset('');

        this.updateThemestatus(areaId, subAreaId);

        if (subAreaId) {
            this.catalogService.getDisciplines(subAreaId).subscribe({
                next: (data: any) => {
                    this.disciplines = (data && Array.isArray(data)) ? data : ((data && data.data) ? data.data : []);
                },
                error: (err) => console.error('Failed to load disciplines', err)
            });
        }
    }

    updateThemestatus(areaId: number | null, subAreaId: number | null) {
        let isEnvEnabled = false;
        let isMedEnabled = false;

        // 1. Try ID match (Fast path)
        if (areaId === this.AREA_NATURAL_SCIENCES && subAreaId === this.SUBAREA_EARTH_ENV) isEnvEnabled = true;
        if (areaId === this.AREA_MEDICAL_SCIENCES) isMedEnabled = true;

        // 2. Name-based match (Robust path if IDs change)
        if ((!isEnvEnabled || !isMedEnabled) && areaId) {
            const areaObj = this.areas.find(a => a.idArea == areaId);
            if (areaObj) {
                const areaName = areaObj.descripcion ? areaObj.descripcion.toUpperCase() : '';

                // Medical Logic: Check if Area name suggests Medical Sciences
                if (!isMedEnabled) {
                    if (areaName.includes('MEDICA') || areaName.includes('MÉDICA') || areaName.includes('SALUD')) {
                        isMedEnabled = true;
                    }
                }

                // Environmental Logic: Check Area Natural + SubArea Earth/Env
                if (!isEnvEnabled) {
                    if (areaName.includes('NATURAL')) {
                        // Check SubArea
                        if (subAreaId) {
                            const subAreaObj = this.subAreas.find(s => s.id == subAreaId);
                            if (subAreaObj) {
                                const subName = subAreaObj.descripcion ? subAreaObj.descripcion.toUpperCase() : '';
                                // Matches "Ciencias de la tierra y medioambientales"
                                if (subName.includes('TIERRA') && (subName.includes('AMBIENT') || subName.includes('MEDIO'))) {
                                    isEnvEnabled = true;
                                }
                            }
                        }
                    }
                }
            }
        }

        // Apply Environmental Logic
        if (isEnvEnabled) {
            this.researchForm.get('environmentalTheme')?.enable();
            this.environmentalThemePlaceholder = 'Seleccione temática...';
        } else {
            this.researchForm.get('environmentalTheme')?.disable();
            this.researchForm.get('environmentalTheme')?.setValue('');
            this.environmentalThemePlaceholder = 'No habilitado: Revise el icono de ayuda';
        }

        // Apply Medical Logic
        if (isMedEnabled) {
            this.researchForm.get('medicalTheme')?.enable();
            this.medicalThemePlaceholder = 'Seleccione temática...';
        } else {
            this.researchForm.get('medicalTheme')?.disable();
            this.researchForm.get('medicalTheme')?.setValue('');
            this.medicalThemePlaceholder = 'No habilitado: Revise el icono de ayuda';
        }

        this.isEnvironmentalDisabled = !isEnvEnabled;
        this.isMedicalDisabled = !isMedEnabled;
    }

    openModal() {
        console.log('openModal called');
        this.showModal = true;
        this.isEditMode = false;
        this.currentResearchLineId = null;
        this.subAreas = []; // Reset dropdowns
        this.disciplines = []; // Reset dropdowns
        this.researchForm.reset({
            area: '',
            subArea: '',
            discipline: '',
            environmentalTheme: '',
            shareMinam: false,
            medicalTheme: '',
            shareIns: false
        });
        this.updateThemestatus(null, null);
    }

    editResearchLine(item: ResearchLine) {
        this.isEditMode = true;
        this.currentResearchLineId = item.id;
        this.showModal = true;

        // Populate Form
        this.researchForm.patchValue({
            area: item.areaOcdeId,
            environmentalTheme: item.tematicaAmbientalCodigo,
            medicalTheme: item.tematicaSaludCodigo,
            shareMinam: item.comparteMinam,
            shareIns: item.comparteIns
        });

        // Update logic based on current values
        this.updateThemestatus(item.areaOcdeId, item.subareaOcdeId);

        // Trigger SubArea Load
        if (item.areaOcdeId) {
            this.catalogService.getSubAreas(item.areaOcdeId).subscribe((subAreas: any) => {
                this.subAreas = (subAreas && Array.isArray(subAreas)) ? subAreas : ((subAreas && subAreas.data) ? subAreas.data : []);
                this.researchForm.patchValue({ subArea: item.subareaOcdeId });

                // Trigger Discipline Load
                if (item.subareaOcdeId) {
                    this.catalogService.getDisciplines(item.subareaOcdeId).subscribe((disciplines: any) => {
                        this.disciplines = (disciplines && Array.isArray(disciplines)) ? disciplines : ((disciplines && disciplines.data) ? disciplines.data : []);
                        this.researchForm.patchValue({ discipline: item.disciplinaOcdeId });
                    });
                }
            });
        }
    }

    closeModal() {
        this.showModal = false;
    }
    saveResearchLine() {
        if (this.researchForm.valid) {
            const formVal = this.researchForm.value;

            const payload: any = {
                active: true,
                areaOcdeId: Number(formVal.area),
                comparteIns: formVal.shareIns || false,
                comparteMinam: formVal.shareMinam || false,
                disciplinaOcdeId: Number(formVal.discipline),
                investigadorId: this.userId,
                principal: true,
                subareaOcdeId: Number(formVal.subArea),
                tematicaAmbientalCodigo: formVal.environmentalTheme || '',
                tematicaSaludCodigo: formVal.medicalTheme || ''
            };

            const successCallback = () => {
                this.closeModal();
                this.cdr.detectChanges(); // Force view update to hide modal
                this.loadResearchLines();
                setTimeout(() => {
                    this.alertService.success(
                        this.isEditMode ? 'Actualización Correcta' : 'Registro Correcto',
                        this.isEditMode ? 'La línea de investigación se ha actualizado correctamente.' : 'La línea de investigación se ha registrado correctamente.'
                    );
                }, 100);
            };

            const errorCallback = (err: any) => {
                console.error(err);
                this.alertService.error('Error', this.isEditMode ? 'No se pudo actualizar la línea de investigación.' : 'No se pudo registrar la línea de investigación.');
            };

            if (this.isEditMode && this.currentResearchLineId) {
                // UPDATE
                this.researchLineService.updateResearchLine(this.currentResearchLineId, payload).subscribe({
                    next: successCallback,
                    error: errorCallback
                });
            } else {
                // CREATE
                this.researchLineService.createResearchLine(payload).subscribe({
                    next: successCallback,
                    error: errorCallback
                });
            }
        } else {
            this.researchForm.markAllAsTouched();
        }
    }

    deleteResearchLine(id: number) {
        this.alertService.confirm('¿Estás seguro?', 'Esta acción eliminará la línea de investigación permanentemente.').then((confirmed) => {
            if (confirmed) {
                this.researchLineService.deleteResearchLine(id).subscribe({
                    next: () => {
                        this.alertService.success('Eliminación Correcta', 'La línea de investigación ha sido eliminada.');
                        this.loadResearchLines();
                    },
                    error: (err) => {
                        console.error(err);
                        this.alertService.error('Error', 'No se pudo eliminar la línea de investigación.');
                    }
                });
            }
        });
    }
}

