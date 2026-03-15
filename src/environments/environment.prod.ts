export const environment = {
    production: true,
    apiUrl: 'http://176.52.137.31:8080/cti-auth-service/api',
    userServiceUrl: 'http://176.52.137.31:8080/cti-user-service/api',
    managementServiceUrl: 'http://176.52.137.31:8080/cti-management-service/api',
    catalogServiceUrl: 'http://176.52.137.31:8080/cti-catalog-service/api',
    fileServiceUrl: 'http://176.52.137.31:8080/cti-file-service/api',
    reniecApiUrl: 'http://176.52.137.31:8080/cti-interop-service/public/api/reniec/validar',
    reniecPrivateApiUrl: 'http://176.52.137.31:8080/cti-interop-service/api/reniec/validar',
    suneduApiUrl: 'http://176.52.137.31:8080/cti-interop-service/api/sunedu/grados-titulos',
    interopServiceUrl: 'http://176.52.137.31:8080/cti-interop-service/api',
    catalogPublicServiceUrl: 'http://176.52.137.31:8080/cti-catalog-service/public/api',
    landingPublicUrl: 'http://176.52.137.31:8080/cti-management-service/public/api',
    baseHref: '/ctivitae/', // En producción, con contexto ctivitae
    recaptchaKey: '6LdoGmgsAAAAAP18jOTutHjDI0FflD90lhV_lA0K',

    // External Providers Configuration
    externalProviders: {
        orcid: {
            clientId: 'APP-GPZ2EDGR6EBFFZRS',
            redirectUri: 'http://176.52.137.31/ctivitae/auth/orcid-callback',
            apiUrl: 'https://pub.orcid.org/v3.0',
            authUrl: 'https://orcid.org/oauth/authorize'
        },
        scopus: {
            apiKey: 'YOUR_SCOPUS_API_KEY',
            apiUrl: 'https://api.elsevier.com/content',
            insttoken: 'YOUR_INSTITUTION_TOKEN'
        },
        wos: {
            apiKey: 'YOUR_WOS_API_KEY',
            apiUrl: 'https://api.clarivate.com/api/wos'
        }
    }
};
