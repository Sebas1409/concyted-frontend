import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AlertService } from './alert.service';
import { ViewerFile, ViewerFileType } from '../../shared/components/file-viewer-modal/file-viewer-modal.component';

@Injectable({
    providedIn: 'root'
})
export class FileService {
    private apiUrl = `${environment.fileServiceUrl}/files`;

    constructor(
        private http: HttpClient,
        private alertService: AlertService
    ) { }

    getFileType(filename: string): ViewerFileType {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(ext || '')) return 'IMAGE';
        if (['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'csv'].includes(ext || '')) return 'OFFICE';
        return 'PDF';
    }

    fetchFilesForViewer(module: string, category: string, section: string, parentId: number): Observable<ViewerFile[]> {
        return this.listFilesMetadata(module, category, section, parentId).pipe(
            map(files => {
                if (!files || files.length === 0) {
                    this.alertService.noFilesFound();
                    return [];
                }
                return files.map(f => ({
                    token: f.token,
                    name: f.nombre || f.fileName || f.name,
                    type: this.getFileType(f.nombre || f.fileName || f.name),
                    url: ''
                }));
            }),
            catchError(err => {
                this.alertService.error('Error', 'No se pudieron cargar los archivos.');
                return throwError(() => err);
            })
        );
    }

    uploadFile(file: File, module: string, type: string, category: string = '', section: string = '', isPublic: boolean = false): Observable<any> {
        const formData = new FormData();
        formData.append('file', file);

        let params = new HttpParams()
            .set('module', module)
            .set('type', type)
            .set('category', category)
            .set('section', section)
            .set('isPublic', isPublic.toString());

        return this.http.post<any>(`${this.apiUrl}/upload`, formData, { params });
    }

    getFileUrl(token: string, isPublic: boolean = false): string {
        if (isPublic) {
            return `${this.apiUrl}/public/${token}`;
        }
        return `${this.apiUrl}/${token}`;
    }

    downloadFile(token: string): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/${token}`, { responseType: 'blob' });
    }

    listFilesMetadata(module: string, category: string, section: string, parentId: number): Observable<any[]> {
        let params = new HttpParams()
            .set('module', module)
            .set('category', category)
            .set('section', section)
            .set('parent_id', parentId.toString());

        return this.http.get<any[]>(`${this.apiUrl}/list/metadata`, { params });
    }
}
