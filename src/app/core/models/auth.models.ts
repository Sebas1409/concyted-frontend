export interface AuthResponse {
    recaptchaStatus: boolean;
    recaptchaErrorCode: string | null;
    recaptchaErrorMessage: string | null;
    id: number;
    username: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    direccion: string;
    pais: string;
    departamento: string;
    provincia: string;
    distrito: string;
    orcidId: string | null;
    fichaCti: string | null;
    dni: string;
    email: string;
    fotoToken?: string | null;
}

export interface LoginRequest {
    dni: number;
    num_doc: number;
    password: string | number;
    recaptcha_token: string;
}

export interface UserProfile {
    id: number;
    username: string;
    email: string;
    resumenEjecutivo: string | null;
    emailPublico: string | null;
    fotoToken: string | null;
    password?: string;
    dni: string;
    tipoDoc: number | null;
    numDoc: string;
    nombres: string;
    apellidoPaterno: string;
    apellidoMaterno: string;
    telefono: string | null;
    celular: string | null;
    sexo: string | null;
    fechaNacimiento: string | null;
    paisId: number | null;
    departamentoId: number | null;
    provinciaId: number | null;
    distritoId: number | null;
    webPersonal: string | null;
    enabled: boolean;
    accountNonExpired: boolean;
    accountNonLocked: boolean;
    credentialsNonExpired: boolean;
    active: boolean;
    createdAt: string | null;
    updatedAt: string | null;
}

export interface UserUnifiedPayload {
    accountNonExpired: boolean;
    accountNonLocked: boolean;
    active: boolean;
    apellidoMaterno: string;
    apellidoPaterno: string;
    credentialsNonExpired: boolean;
    departamentoId: number;
    distritoId: number;
    dni: string;
    email: string;
    emailPublico: string;
    enabled: boolean;
    fechaNacimiento: string;
    fotoToken: string;
    nombres: string;
    numDoc: string;
    paisId: number;
    password?: string;
    provinciaId: number;
    sexo: string;
    telefono: string;
    tipoDoc: string;
    username: string;
    webPersonal: string;
}
