import { getRequestConfig } from 'next-intl/server';

export const SupportedLocales = ['en']; //, 'es', 'fr', 'de', 'pt'];

export default getRequestConfig(async ({ requestLocale }) => {
    // Validate the incoming locale or use a fallback
    let locale = (await requestLocale) || "en";
    
    if (!SupportedLocales.includes(locale as any)) {
        console.info(`Requested locale ${locale} not found. Setting to default (en)`, { locale });
        locale = "en";
    }

    console.info(`getRequestConfig for locale ${locale}`);
    
    return {
        locale,
        messages: (await import(`@/messages/${locale}.json`)).default,
    };
});