export const environment = {
    production: true,
    apiUrl: 'http://176.52.137.31:8080/cti-auth-service/api',
    userServiceUrl: '/cti-user-service/api',
    managementServiceUrl: '/cti-management-service/api',
    catalogServiceUrl: '/cti-catalog-service/api',
    fileServiceUrl: '/cti-file-service/api',
    reniecApiUrl: '/cti-interop-service/public/api/reniec/validar',
    reniecPrivateApiUrl: '/cti-interop-service/api/reniec/validar',
    suneduApiUrl: '/cti-interop-service/api/sunedu/grados-titulos',
    interopServiceUrl: 'http://176.52.137.31:8080/cti-interop-service/api',
    catalogPublicServiceUrl: '/cti-catalog-service/public/api',
    landingPublicUrl: '/cti-management-service/public/api',
    baseHref: '/ctivitae/', // En producción, con contexto ctivitae
    recaptchaKey: '6LdoGmgsAAAAAP18jOTutHjDI0FflD90lhV_lA0K',

    // External Providers Configuration
    externalProviders: {
        orcid: {
            apiUrl: 'https://pub.orcid.org/v3.0',
            redirectFix: {
                search: '176.52.137.31',
                replaceWith: '176.52.137.31:8080'
            }
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
