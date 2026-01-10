import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LanguageItem } from '../../../../../../../core/models/language.models';

@Component({
    selector: 'app-language-form',
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: './language-form.component.html',
    styleUrls: ['./language-form.component.scss']
})
export class LanguageFormComponent implements OnInit, OnChanges {
    @Input() language: LanguageItem | null = null;
    @Input() languagesOptions: any[] = [];
    @Input() learningMethodsOptions: any[] = [];
    @Input() levelsOptions: any[] = [];
    @Input() userId: number = 0;
    @Input() isSaving: boolean = false;

    // Distinct outputs for SRP
    @Output() create = new EventEmitter<any>();
    @Output() update = new EventEmitter<{ id: number, payload: any }>();
    @Output() cancel = new EventEmitter<void>();

    languageForm: FormGroup;
    isEditing = false;

    constructor(private fb: FormBuilder) {
        this.languageForm = this.fb.group({
            name: ['', Validators.required],
            isNative: [false],
            reading: ['', Validators.required],
            writing: ['', Validators.required],
            speaking: ['', Validators.required],
            learningMethod: ['', Validators.required]
        });
    }

    ngOnInit(): void { }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes['language']) {
            if (this.language) {
                this.isEditing = true;
                this.patchForm(this.language);
            } else {
                this.isEditing = false;
                this.languageForm.reset({
                    name: '',
                    isNative: false,
                    reading: '',
                    writing: '',
                    speaking: '',
                    learningMethod: ''
                });
            }
        }
    }

    private patchForm(language: LanguageItem) {
        // Match by Code
        const langObj = this.languagesOptions.find(l => l.codigo === language.idioma);
        const langValue = langObj ? langObj.id : '';

        const methodObj = this.learningMethodsOptions.find(m => m.codigo === language.formaAprendizaje);
        const methodValue = methodObj ? methodObj.id : '';

        const readObj = this.levelsOptions.find(l => l.codigo === language.nivelLectura);
        const readValue = readObj ? readObj.id : '';

        const writeObj = this.levelsOptions.find(l => l.codigo === language.nivelEscritura);
        const writeValue = writeObj ? writeObj.id : '';

        const speakObj = this.levelsOptions.find(l => l.codigo === language.nivelConversacion);
        const speakValue = speakObj ? speakObj.id : '';

        this.languageForm.patchValue({
            name: langValue,
            isNative: language.esLenguaMaterna,
            reading: readValue,
            writing: writeValue,
            speaking: speakValue,
            learningMethod: methodValue
        });
    }

    onSubmit() {
        if (this.languageForm.valid) {
            const formVal = this.languageForm.value;

            // Map ID to Code
            let selectedLangCode = '';
            const selectedLangObj = this.languagesOptions.find(l => l.id == formVal.name);
            if (selectedLangObj) {
                selectedLangCode = selectedLangObj.codigo;
            } else {
                selectedLangCode = formVal.name.toString();
            }

            let selectedMethodCode = '';
            const selectedMethodObj = this.learningMethodsOptions.find(l => l.id == formVal.learningMethod);
            if (selectedMethodObj) {
                selectedMethodCode = selectedMethodObj.codigo;
            } else {
                selectedMethodCode = formVal.learningMethod.toString();
            }

            const getLevelCode = (selectedId: any) => {
                const obj = this.levelsOptions.find(l => l.id == selectedId);
                return obj ? obj.codigo : selectedId.toString();
            };

            const payload = {
                active: true,
                esLenguaMaterna: formVal.isNative,
                formaAprendizaje: selectedMethodCode,
                idioma: selectedLangCode,
                investigadorId: this.userId,
                nivelConversacion: getLevelCode(formVal.speaking),
                nivelEscritura: getLevelCode(formVal.writing),
                nivelLectura: getLevelCode(formVal.reading)
            };

            // Emit distinct events
            if (this.isEditing && this.language?.id) {
                this.update.emit({ id: this.language.id, payload });
            } else {
                this.create.emit(payload);
            }
        }
    }

    onCancel() {
        this.cancel.emit();
    }
}
