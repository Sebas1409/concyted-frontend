export const environment = {
    production: false,
    apiUrl: '/cti-auth-service/api',
    userServiceUrl: '/cti-user-service/api',
    managementServiceUrl: '/cti-management-service/api',
    catalogServiceUrl: '/cti-catalog-service/api',
    fileServiceUrl: '/cti-file-service/api',
    reniecApiUrl: '/cti-interop-service/public/api/reniec/validar',
    reniecPrivateApiUrl: '/cti-interop-service/api/reniec/validar',
    suneduApiUrl: '/cti-interop-service/api/sunedu/grados-titulos',
    interopServiceUrl: '/cti-interop-service/api',
    catalogPublicServiceUrl: '/cti-catalog-service/public/api',
    landingPublicUrl: '/cti-management-service/public/api',
    baseHref: '/', // En desarrollo, sin contexto
    recaptchaKey: '6LdoGmgsAAAAAP18jOTutHjDI0FflD90lhV_lA0K',
    manualAdminUrl: '/docs/manual_admin.pdf',
    manualUserUrl: '/docs/manual_user.pdf',

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
            insttoken: 'YOUR_INSTITUTION_TOKEN',
            loginUrl: 'https://id.elsevier.com/as/authorization.oauth2?state=08ffc720-7d61-45f8-bde4-6197febabe8a&ui_locales=en-US&redirect_uri=https://www.scopus.com/pages/callback/url&client_id=SCOPUS&platSite=SC/scopus&response_type=code&scope=openid+profile+email+els_auth_info+els_analytics_info+urn:com:elsevier:idp:policy:product:indv_identity&prompt=login&authType=SINGLE_SIGN_IN'
        },
        wos: {
            apiKey: 'YOUR_WOS_API_KEY',
            apiUrl: 'https://api.clarivate.com/api/wos'
        }
    }
};
