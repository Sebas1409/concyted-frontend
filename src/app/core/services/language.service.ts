import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LanguageItem, LanguagePayload } from '../models/language.models';

@Injectable({
    providedIn: 'root'
})
export class LanguageService {
    private apiUrl = `${environment.userServiceUrl}/idioma`;
    private publicApiUrl = `${environment.userServiceUrl.replace('/api', '/public/api')}/idioma`;

    constructor(private http: HttpClient) { }

    getLanguages(): Observable<LanguageItem[]> {
        return this.http.get<LanguageItem[]>(this.apiUrl);
    }

    getLanguagesByInvestigator(investigatorId: number): Observable<LanguageItem[]> {
        return this.http.get<LanguageItem[]>(`${this.apiUrl}/investigador/${investigatorId}`);
    }

    getPublicLanguagesByInvestigator(investigatorId: number): Observable<LanguageItem[]> {
        return this.http.get<LanguageItem[]>(`${this.publicApiUrl}/investigador/${investigatorId}`);
    }

    createLanguage(payload: LanguagePayload): Observable<any> {
        return this.http.post(this.apiUrl, payload);
    }

    updateLanguage(id: number, payload: LanguagePayload): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, payload);
    }

    deleteLanguage(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
