export interface LanguageItem {
    id: number;
    investigadorId: number;
    idioma: string;        // IDI028
    idiomaNombre: string;  // CHECO
    esLenguaMaterna: boolean;
    nivelLectura: string;        // NIV001
    nivelLecturaNombre: string;  // AVANZADO
    nivelEscritura: string;
    nivelEscrituraNombre: string;
    nivelConversacion: string;
    nivelConversacionNombre: string;
    formaAprendizaje: string;
    formaAprendizajeNombre: string;
    active: boolean;
    createdAt?: string;
    updatedAt?: string;
    codigo?: string; // Keeping just in case, though 'idioma' seems to be the code now
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
