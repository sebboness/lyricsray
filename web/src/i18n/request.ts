import { getRequestConfig } from 'next-intl/server';
import { notFound } from 'next/navigation';

const locales = ['en']; //, 'es', 'fr', 'de', 'pt'];

export default getRequestConfig(async ({ requestLocale }: any) => {
    // Validate the incoming locale or use a fallback
    const locale = await requestLocale;
    if (!locales.includes(locale as any)) notFound();
    
    return {
        locale,
        messages: (await import(`@/messages/${locale}.json`)).default,
    };
});