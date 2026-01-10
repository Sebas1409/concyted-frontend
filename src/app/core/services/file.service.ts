import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FileService {
    private apiUrl = `${environment.fileServiceUrl}/files`;

    constructor(private http: HttpClient) { }

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
