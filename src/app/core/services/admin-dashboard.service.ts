import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface DashboardData {
    nivelAcademico: Array<{
        doctor: number;
        licenciado: number;
        segundaEspecialidad: number;
        bachiller: number;
        maestro: number;
    }>;
    distribucionGenero: Array<{
        femenino: number;
        masculino: number;
    }>;
    rangoEdades: Array<{
        "60+": number;
        "41-50": number;
        "51-60": number;
        "20-30": number;
        "31-40": number;
    }>;
    estadoVerificacion: Array<{
        validadoReniec: number;
        observado: number;
        manual: number;
    }>;
    crecimientoRegistros: Array<{
        anio: number;
        total: number;
    }>;
    produccionCientifica: any[]; // Adjust if you know the structure
    investigadoresRegistrados: number;
    totalInstituciones: number;
    investigadoresActivos: number;
    publicacionesIndexadas: number;
}

@Injectable({
    providedIn: 'root'
})
export class AdminDashboardService {
    private apiUrl = `${environment.managementServiceUrl}/landing/dashboard`;

    constructor(private http: HttpClient) { }

    getDashboardStats(): Observable<DashboardData> {
        return this.http.get<DashboardData>(this.apiUrl);
    }
}
