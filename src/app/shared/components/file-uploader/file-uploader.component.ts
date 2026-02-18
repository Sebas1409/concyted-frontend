import { Component, EventEmitter, Input, Output, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActionButtonsComponent } from '../action-buttons/action-buttons.component';

@Component({
    selector: 'app-file-uploader',
    standalone: true,
    imports: [CommonModule, ActionButtonsComponent],
    templateUrl: './file-uploader.component.html',
    styleUrls: ['./file-uploader.component.scss']
})
export class FileUploaderComponent {
    @Input() files: { code: string; name: string; file?: File }[] = [];
    @Output() filesChange = new EventEmitter<{ code: string; name: string; file?: File }[]>();
    @Input() maxSizeMB: number = 5;
    @Input() accept: string = '.pdf';

    @Output() errorChange = new EventEmitter<boolean>();

    errorMessage: string | null = null;

    constructor(private cd: ChangeDetectorRef) { }

    onFileSelected(event: any) {
        const file: File = event.target.files[0];
        this.errorMessage = null; // Clear prev error
        this.errorChange.emit(false);

        if (file) {
            if (file.size > this.maxSizeMB * 1024 * 1024) {
                this.errorMessage = `El archivo excede el tamaño máximo permitido de ${this.maxSizeMB}MB.`;
                this.errorChange.emit(true);
                event.target.value = '';
                return;
            }

            const newFile = {
                code: (this.files.length + 1).toString().padStart(2, '0'),
                name: file.name,
                file: file
            };

            // Reset input
            event.target.value = '';

            this.updateFiles([...this.files, newFile]);
        }
    }

    removeFile(index: number) {
        const updatedFiles = this.files.filter((_, i) => i !== index);
        // Re-index codes if necessary, or keep standard? 
        // Usually lists like this re-index "01", "02" on display.
        // Let's re-map the codes for display consistency.
        const reindexedFiles = updatedFiles.map((f, i) => ({
            ...f,
            code: (i + 1).toString().padStart(2, '0')
        }));

        this.updateFiles(reindexedFiles);
    }

    private updateFiles(files: any[]) {
        this.files = files;
        this.filesChange.emit(this.files);
        this.cd.detectChanges();
    }
}
