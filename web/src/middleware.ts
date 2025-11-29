import createMiddleware from 'next-intl/middleware';
import { NextRequest } from 'next/server';
import { SupportedLocales } from '@/i18n/request';

const intlMiddleware = createMiddleware({
    locales: SupportedLocales,
    defaultLocale: 'en',
    localePrefix: 'as-needed',
    localeDetection: true
});

export default function middleware(request: NextRequest) {
    const response = intlMiddleware(request);
    
    // Set a cookie to remember user's choice
    const locale = request.nextUrl.pathname.split('/')[1];
    if (SupportedLocales.includes(locale)) {
        response.cookies.set('NEXT_LOCALE', locale, {
            maxAge: 31536000, // 1 year
            path: '/'
        });
    }

    console.info(`middleware got locale ${locale}`);
    
    return response;
}

export const config = {
    matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
};