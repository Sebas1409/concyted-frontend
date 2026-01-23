export interface LanguageItem {
    id: number;
    investigadorId: number;
    idioma: string;
    idiomaNombre: string;
    esLenguaMaterna: boolean;
    nivelLectura: string;
    nivelLecturaNombre: string;
    nivelEscritura: string;
    nivelEscrituraNombre: string;
    nivelConversacion: string;
    nivelConversacionNombre: string;
    formaAprendizaje: string;
    formaAprendizajeNombre: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface LanguagePayload {
    active: boolean;
    esLenguaMaterna: boolean;
    formaAprendizaje: string;
    idioma: string;
    investigadorId: number;
    nivelConversacion: string;
    nivelEscritura: string;
    nivelLectura: string;
}
