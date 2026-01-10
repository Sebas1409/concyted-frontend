import { Component, EventEmitter, Input, Output, inject, ChangeDetectorRef, ViewChild, ElementRef, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { FileService } from '../../../core/services/file.service';
import { AlertService } from '../../../core/services/alert.service';

@Component({
    selector: 'app-single-image-upload',
    standalone: true,
    imports: [CommonModule],
    templateUrl: './single-image-upload.component.html',
    styleUrls: ['./single-image-upload.component.scss']
})
export class SingleImageUploadComponent implements OnChanges {
    @ViewChild('fileInput') fileInputRef!: ElementRef;
    @Input() currentToken: string | null = null; // For editing
    @Input() placeholderText: string = 'IMG';
    @Input() hintText: string = 'Formato soportado: WEBP, JPG, PNG';
    @Input() accept: string = '.webp,.jpg,.jpeg,.png';
    @Input() mode: 'default' | 'compact' = 'default';

    // Configuration Inputs
    @Input() module: string = 'landing';
    @Input() type: string = 'image';
    @Input() category: string = 'slide';
    @Input() section: string = 'hero';
    @Input() isPublic: boolean = true;

    // Validation Inputs
    @Input() minWidth: number = 0;
    @Input() minHeight: number = 0;
    @Input() maxSizeBytes: number = 2 * 1024 * 1024; // Default 2MB

    @Output() tokenChange = new EventEmitter<string>(); // Emits token after upload
    @Output() fileSelected = new EventEmitter<File>(); // Emits file if parent wants to handle it (optional)
    @Output() uploadStart = new EventEmitter<void>();
    @Output() uploadEnd = new EventEmitter<void>();

    private fileService = inject(FileService);
    private alertService = inject(AlertService);
    private cdr = inject(ChangeDetectorRef);
    private sanitizer = inject(DomSanitizer);

    isDragging: boolean = false;
    uploadError: string | null = null;
    previewUrl: SafeUrl | string | null = null;
    private lastUploadedToken: string | null = null;

    ngOnChanges(changes: SimpleChanges) {
        if (changes['currentToken']) {
            console.log('SingleImageUpload ngOnChanges: currentToken=', this.currentToken, 'isPublic=', this.isPublic);

            // Check if this token matches the one we just uploaded locally
            if (this.currentToken && this.currentToken === this.lastUploadedToken) {
                console.log('Token matches last uploaded token. Keeping local preview.');
                // Do NOT update previewUrl, keep the blob
            } else if (this.currentToken && this.currentToken.trim() !== '' && this.currentToken !== 'Perfil') {
                const url = this.fileService.getFileUrl(this.currentToken, this.isPublic);
                console.log('Generated Preview URL:', url);
                this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(url);
                this.lastUploadedToken = null; // Reset if we switched to a different token from parent
            } else {
                this.previewUrl = null;
                this.lastUploadedToken = null;
            }
            this.cdr.markForCheck();
        }
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = true;
    }

    onDragLeave(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;
    }

    onDrop(event: DragEvent) {
        event.preventDefault();
        event.stopPropagation();
        this.isDragging = false;

        const files = event.dataTransfer?.files;
        if (files && files.length > 0) {
            this.handleFile(files[0]);
        }
    }

    onFileSelected(event: any) {
        const file = event.target.files[0];
        if (file) {
            this.handleFile(file);
        }
    }

    handleFile(file: File) {
        this.uploadError = null;
        console.log('Validating file:', file.name, 'Size:', file.size);

        this.validateImage(file).then(isValid => {
            console.log('Validation result:', isValid, 'Error:', this.uploadError);
            if (isValid) {
                // Generate Preview instantly using ObjectURL (Faster than FileReader)
                this.previewUrl = this.sanitizer.bypassSecurityTrustUrl(URL.createObjectURL(file));
                this.cdr.markForCheck();

                // Notify parent
                this.fileSelected.emit(file);

                // Auto Upload
                this.uploadFile(file);
            } else {
                // Force view update if validation failed
                this.cdr.markForCheck();
            }
        });
    }

    removeImage() {
        this.alertService.confirm('Eliminar imagen', '¿Está seguro de que desea eliminar la imagen?')
            .then((confirmed) => {
                if (confirmed) {
                    this.previewUrl = null;
                    this.uploadError = null;
                    if (this.fileInputRef && this.fileInputRef.nativeElement) {
                        this.fileInputRef.nativeElement.value = '';
                    }
                    this.tokenChange.emit(''); // Emit empty string to clear the token
                    this.cdr.markForCheck();
                }
            });
    }

    validateImage(file: File): Promise<boolean> {
        return new Promise((resolve) => {
            // 1. Check Format
            // Accept can be ".webp,.jpg,.jpeg" or "image/*" etc.
            // Let's normalize accept string to check types.
            const acceptedExtensions = this.accept.split(',').map(acc => acc.trim().toLowerCase().replace('.', ''));
            const fileExtension = file.name.split('.').pop()?.toLowerCase() || '';
            const fileType = file.type; // e.g. "image/jpeg"

            // Simple extension check if accept starts with .
            // And MIME type check
            let isValidFormat = false;

            // Check if it's a valid mime type for images if we want to be strict, but extension is often enough for UI feedback
            if (acceptedExtensions.includes(fileExtension)) {
                isValidFormat = true;
            } else if (this.accept.includes('image/*') && fileType.startsWith('image/')) {
                isValidFormat = true;
            } else {
                // Check against specific mimes if needed, but extension match is the standard HTML input behavior check
                // For now, if extension matches one of the accepted ones
            }

            // If we want to be strict about formats:
            // Allow PNG as per recent request
            const validTypes = ['image/jpeg', 'image/jpg', 'image/webp', 'image/png'];
            if (!validTypes.includes(file.type) && !acceptedExtensions.includes(fileExtension)) {
                this.uploadError = `Formato no válido. Se requiere: ${this.accept.replace(/\./g, ' ').toUpperCase()}`;
                resolve(false);
                return;
            }

            // 2. Check Size
            if (file.size > this.maxSizeBytes) {
                const maxKB = this.maxSizeBytes / 1024;
                const fileKB = file.size / 1024;

                let msgMax = '';
                if (maxKB >= 1024) {
                    msgMax = (maxKB / 1024).toFixed(2) + 'MB';
                } else {
                    msgMax = Math.round(maxKB) + 'KB';
                }

                let msgFile = '';
                if (fileKB >= 1024) {
                    msgFile = (fileKB / 1024).toFixed(2) + 'MB';
                } else {
                    msgFile = Math.round(fileKB) + 'KB';
                }

                this.uploadError = `El archivo es demasiado pesado (${msgFile}). Máximo ${msgMax}.`;
                resolve(false);
                return;
            }

            // 3. Check Dimensions
            if (this.minWidth > 0 || this.minHeight > 0) {
                const img = new Image();
                img.src = URL.createObjectURL(file);
                img.onload = () => {
                    URL.revokeObjectURL(img.src);
                    if (img.width < this.minWidth || img.height < this.minHeight) {
                        this.uploadError = `La resolución de la imagen (${img.width}x${img.height}px) es menor a la permitida (${this.minWidth}x${this.minHeight}px).`;
                        resolve(false);
                    } else {
                        resolve(true);
                    }
                };
                img.onerror = () => {
                    this.uploadError = 'No se pudo leer el archivo de imagen.';
                    resolve(false);
                };
            } else {
                resolve(true);
            }
        });
    }

    uploadFile(file: File) {
        this.uploadStart.emit();
        // this.alertService.loading('Subiendo imagen...'); // Parent can handle UI using uploadStart/End or we do it here? 
        // Better to let component manage its state or show a mini loader.
        // User requested "obtenga el token". 

        this.fileService.uploadFile(file, this.module, this.type, this.category, this.section, this.isPublic).subscribe({
            next: (res) => {
                // this.alertService.close(); // Only if we opened it
                const token = res.token || res.fileToken || (typeof res === 'string' ? res : '');
                console.log('Upload success, token:', token);
                this.lastUploadedToken = token;
                this.tokenChange.emit(token);
                this.uploadEnd.emit();
            },
            error: (err) => {
                console.error('Upload error', err);

                let errorMessage = 'Error al subir la imagen al servidor.';
                if (err.error) {
                    if (typeof err.error === 'string') {
                        errorMessage = err.error;
                    } else if (err.error.message) {
                        errorMessage = err.error.message;
                    }
                }

                this.uploadError = errorMessage;
                this.uploadEnd.emit();
            }
        });
    }

    reset() {
        this.previewUrl = null;
        this.uploadError = null;
        this.isDragging = false;
        // Don't emit null token unless parent explicitly asks to clear
    }
}
