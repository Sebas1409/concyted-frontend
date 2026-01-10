import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, OnDestroy, ChangeDetectorRef, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SafeResourceUrl, DomSanitizer } from '@angular/platform-browser';
import { FileService } from '../../../core/services/file.service';

export type ViewerFileType = 'PDF' | 'IMAGE' | 'OFFICE';


export interface ViewerFile {
    url: string;
    token?: string;
    name: string;
    type: ViewerFileType;
}

@Component({
    selector: 'app-file-viewer-modal',
    standalone: true,
    imports: [CommonModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: `
        <div class="viewer-overlay" [class.open]="isOpen" (click)="close()">
            <div class="viewer-sidebar" [class.open]="isOpen" [class.maximized]="isMaximized" (click)="$event.stopPropagation()">
                
                <!-- Hybrid Header -->
                <div class="viewer-header">
                     <div class="header-left">
                        <h3 class="file-title" title="{{ currentFile?.name }}">{{ currentFile?.name }}</h3>
                     </div>
                     
                     <div class="header-center" *ngIf="files.length > 1">
                        <button class="nav-btn" (click)="prevFile()" [disabled]="currentIndex === 0" title="Archivo Anterior">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
                        </button>
                        <span class="file-counter">Archivo {{ currentIndex + 1 }} / {{ files.length }}</span>
                        <button class="nav-btn" (click)="nextFile()" [disabled]="currentIndex === files.length - 1" title="Siguiente Archivo">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                        </button>
                     </div>

                     <div class="header-right">
                        <a *ngIf="currentFile" [href]="safeUrl" [attr.download]="currentFile.name" class="tool-btn" title="Descargar con nombre original" target="_blank">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        </a>
                        <button class="tool-btn" (click)="toggleMaximize()" title="Maximizar / Restaurar">
                            <svg *ngIf="!isMaximized" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                            <svg *ngIf="isMaximized" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                        </button>
                        <div class="divider"></div>
                        <button class="tool-btn close-btn" (click)="close()" title="Cerrar">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                     </div>
                </div>

                <!-- Content Area -->
                <div class="viewer-body">
                    <div class="content-wrapper">
                        <ng-container *ngIf="currentFile">
                            <!-- PDF (Native Browser Viewer) -->
                            <!-- PDF (Native Browser Viewer) -->
                            <!-- PDF (Native Browser Viewer) -->
                            <!-- PDF (Native Browser Viewer) -->
                            <embed *ngIf="isPdf" [src]="safeUrl" type="application/pdf" width="100%" height="100%" class="content-iframe">

                            <!-- Office Files -->
                            <div *ngIf="isOffice" class="no-preview">
                                <span class="icon">📄</span>
                                <p>Vista previa no disponible.</p>
                                <a [href]="safeUrl" [attr.download]="currentFile.name" class="download-link">Descargar</a>
                            </div>
                            
                            <!-- Image -->
                            <img *ngIf="isImage" [src]="safeUrl" alt="Preview" class="content-image">
                        </ng-container>

                        <div *ngIf="isLoading" class="loading">
                             <div class="spinner"></div>
                             <p class="loading-text">Cargando archivo...</p>
                        </div>
                        
                        <div *ngIf="!currentFile && !isLoading" class="no-file-selected">
                             <p>Sin archivo seleccionado</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .viewer-body {
            flex: 1; background: #525659; /* Neutral dark grey for contrast */
            overflow: auto; /* Enable scrolling for zoomed content */
            display: flex; justify-content: center; 
            padding: 2rem; box-sizing: border-box;
            position: relative;
        }

        .content-wrapper {
            width: 100%; height: auto; min-height: 100%; 
            transition: width 0.2s ease, transform 0.2s ease;
            display: flex; justify-content: center; align-items: flex-start;
            box-shadow: 0 0 10px rgba(0,0,0,0.3); background: white;
        }
        
        /* Ensure iframe fills the wrapper */
        .content-iframe { width: 100%; height: 100vh; /* dynamic height? */ min-height: 800px; display: block; }
        .content-image { max-width: 100%; height: auto; display: block; }

        .viewer-overlay {
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0); z-index: 5000;
            visibility: hidden; pointer-events: none;
            transition: background 0.3s ease, visibility 0s 0.3s;
            display: flex; justify-content: flex-end;
        }
        .viewer-overlay.open {
            background: rgba(0, 0, 0, 0.5);
            visibility: visible; pointer-events: auto;
            transition: background 0.3s ease, visibility 0s 0s;
        }

        .viewer-sidebar {
            width: 600px; height: 100%; background: white;
            box-shadow: -5px 0 25px rgba(0,0,0,0.15);
            transition: transform 0.3s cubic-bezier(0.25, 0.8, 0.25, 1), width 0.3s ease;
            display: flex; flex-direction: column;
            max-width: 100vw;
            transform: translateX(100%);
            will-change: transform;
        }
        .viewer-sidebar.open {
            transform: translateX(0);
        }
        .viewer-sidebar.open { transform: translateX(0); }
        .viewer-sidebar.maximized { width: 100vw; }

        .viewer-header {
            padding: 0.75rem 1rem;
            background: #007D85; color: white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            display: flex; justify-content: space-between; align-items: center;
            z-index: 10;
        }

        .header-left { display: flex; align-items: center; overflow: hidden; max-width: 40%; }
        .file-title { font-size: 1rem; font-weight: 500; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

        .header-center { display: flex; align-items: center; gap: 8px; justify-content: center; }
        .file-counter { font-size: 0.9rem; font-weight: 500; min-width: 80px; text-align: center; }

        .header-right { display: flex; align-items: center; gap: 4px; }
        
        .nav-btn, .tool-btn {
            background: transparent; border: none; color: white;
            width: 32px; height: 32px; border-radius: 4px;
            display: flex; justify-content: center; align-items: center; cursor: pointer;
            transition: background 0.2s;
        }
        .nav-btn:hover:not(:disabled), .tool-btn:hover { background: rgba(255,255,255,0.15); }
        .nav-btn:disabled { opacity: 0.3; cursor: default; }

        .divider { width: 1px; height: 20px; background: rgba(255,255,255,0.2); margin: 0 8px; }

        .tool-btn.close-btn { background: rgba(255,255,255,0.1); }
        .tool-btn.close-btn:hover { background: #dc2626; }

        .viewer-body { flex: 1; background: #525659; overflow: hidden; position: relative; }
        .content-wrapper { width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; }
        .content-iframe { width: 100%; height: 100%; border: none; }
        .content-image { max-width: 100%; max-height: 100%; object-fit: contain; }
        
        .no-preview { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: white; }
        .loading {
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            display: flex; flex-direction: column; align-items: center; justify-content: center;
            background: rgba(82, 86, 89, 0.95); z-index: 20; color: white;
            backdrop-filter: blur(2px);
            transition: opacity 0.2s ease;
        }
        
        .spinner {
            border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid #007D85; 
            border-radius: 50%; width: 50px; height: 50px; 
            animation: spin 0.8s cubic-bezier(0.55, 0.055, 0.675, 0.19) infinite; 
            margin-bottom: 1rem;
            box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }
        
        .loading-text { font-size: 0.95rem; font-weight: 500; letter-spacing: 0.5px; opacity: 0.9; }

        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

        .no-file-selected {
             position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: #6b7280;
        }
    `]
})
export class FileViewerModalComponent implements OnChanges, OnDestroy {
    @Input() isOpen = false;
    @Input() files: ViewerFile[] = [];
    @Output() onClose = new EventEmitter<void>();

    currentIndex = 0;

    // Properties for current file
    safeUrl: SafeResourceUrl | null = null;
    googleViewerUrl: SafeResourceUrl | null = null;

    // Viewer State
    isMaximized = false;
    isLoading = false;

    private objectUrl: string | null = null;
    private emptyUrl: SafeResourceUrl;
    private closeTimeoutId: any;

    constructor(
        private sanitizer: DomSanitizer,
        private fileService: FileService,
        private cd: ChangeDetectorRef
    ) {
        this.emptyUrl = this.sanitizer.bypassSecurityTrustResourceUrl('');
        this.safeUrl = this.emptyUrl;
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['isOpen']?.currentValue === true) {
            clearTimeout(this.closeTimeoutId); // Cancel any pending cleanup
            this.currentIndex = 0;
            this.isMaximized = false; // Reset maximize state on open
            this.updateCurrentFile();
        } else if (changes['files'] && this.isOpen) {
            this.updateCurrentFile(true);
        }
    }

    ngOnDestroy() {
        clearTimeout(this.closeTimeoutId);
        this.revokeObjectUrl();
    }

    get currentFile(): ViewerFile | null {
        return this.files && this.files.length > 0 ? this.files[this.currentIndex] : null;
    }

    get isPdf() { return this.currentFile?.type === 'PDF'; }
    get isImage() { return this.currentFile?.type === 'IMAGE'; }
    get isOffice() { return this.currentFile?.type === 'OFFICE'; }

    updateCurrentFile(force = false) {
        if (!this.currentFile) {
            this.safeUrl = this.emptyUrl;
            this.isLoading = false;
            return;
        }

        this.isLoading = true;
        this.cd.detectChanges();

        // If we have a token, we must fetch the file with headers
        if (this.currentFile.token) {
            this.fileService.downloadFile(this.currentFile.token).subscribe({
                next: (blob) => {
                    this.revokeObjectUrl(); // Clear old only when new is ready
                    try {
                        const mimeType = this.isPdf ? 'application/pdf' : (this.isImage ? 'image/jpeg' : 'application/octet-stream');
                        const typedBlob = new Blob([blob], { type: mimeType });

                        this.objectUrl = URL.createObjectURL(typedBlob);
                        // Standard native viewer. No extra params to hide tools.
                        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.objectUrl);
                    } catch (e) {
                        console.error('Error creating ObjectURL', e);
                    }
                    this.isLoading = false;
                    this.cd.detectChanges();
                },
                error: (err) => {
                    console.error('Error loading file', err);
                    this.isLoading = false;
                    if (this.currentFile) {
                        this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentFile.url);
                    }
                    this.cd.detectChanges();
                }
            });
        } else {
            this.revokeObjectUrl();
            this.safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(this.currentFile.url);
            this.isLoading = false;
            this.cd.detectChanges();
        }
    }

    revokeObjectUrl() {
        if (this.objectUrl) {
            URL.revokeObjectURL(this.objectUrl);
            this.objectUrl = null;
        }
    }

    nextFile() {
        if (this.currentIndex < this.files.length - 1) {
            this.currentIndex++;
            this.updateCurrentFile();
            this.cd.detectChanges();
        }
    }

    prevFile() {
        if (this.currentIndex > 0) {
            this.currentIndex--;
            this.updateCurrentFile();
            this.cd.detectChanges();
        }
    }

    firstFile() {
        if (this.currentIndex > 0) {
            this.currentIndex = 0;
            this.updateCurrentFile();
            this.cd.detectChanges();
        }
    }

    lastFile() {
        if (this.currentIndex < this.files.length - 1) {
            this.currentIndex = this.files.length - 1;
            this.updateCurrentFile();
            this.cd.detectChanges();
        }
    }

    toggleMaximize() { this.isMaximized = !this.isMaximized; }

    close() {
        this.isOpen = false;
        this.onClose.emit();
        // Clean up state after animation
        clearTimeout(this.closeTimeoutId);
        this.closeTimeoutId = setTimeout(() => {
            this.isMaximized = false;
            this.revokeObjectUrl();
            this.safeUrl = this.emptyUrl;
        }, 300);
    }
}
