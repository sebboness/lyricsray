import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ClientLayout } from "@/components/ClientLayout";
import { ThemeRegistry } from "@/components/ThemeRegistry";
import { getBaseUrl } from "@/util/routeHelper";

// Farsi is RTL (right-to-left) written language
const rtlLocales = ['fa'];

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

const title = 'LyricsRay - Is This Song Safe for My Child?';
const description = 'LyricsRay helps parents check if songs are appropriate for their children based on lyrics analysis and age recommendations';

export const metadata: Metadata = {
    title,
    description,
    openGraph: {
        title,
        description,
        url: getBaseUrl(),
        siteName: "LyricsRay - Is this song safe for my child?",
        type: 'website',
        images: [
            {
                url: `${getBaseUrl()}/images/logo-transparent-no-text-512.png`,
                width: 512,
                height: 440,
                alt: "LyricsRay Logo"
            }
        ]
    }
};

export default async function RootLayout({
    children,
    params,
    }: Readonly<{
    children: React.ReactNode;
    params: Promise<{locale: string}>;
}>) {
    const { locale } = await params;
    const messages = await getMessages();
    const direction = rtlLocales.includes(locale) ? 'rtl' : 'ltr';

    return (
        <html lang={locale} dir={direction} suppressHydrationWarning>
            <head>
                <link rel="preload" href="/images/logo-transparent-no-text-512.png" as="image" type="image/png" fetchPriority="high" />
                <link rel="preload" href="/images/logo-transparent-no-text-light-512.png" as="image" type="image/png" fetchPriority="high" />
                <link rel="apple-touch-icon" sizes="180x180" href="/images/lyricsray-icon-180.jpg" />
                <link rel="icon" href="/images/favicon.ico" />
                <link rel="icon" type="image/jpg" sizes="16x16" href="/images/lyricsray-icon-16.jpg" />
                <link rel="icon" type="image/jpg" sizes="32x32" href="/images/lyricsray-icon-32.jpg" />
                <link rel="icon" type="image/jpg" sizes="96x96" href="/images/lyricsray-icon-96.jpg" />
                <link rel="icon" type="image/jpg" sizes="192x192" href="/images/lyricsray-icon-192.jpg" />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeRegistry>
                    <NextIntlClientProvider messages={messages}>
                        <ClientLayout>
                            {children}
                        </ClientLayout>
                    </NextIntlClientProvider>
                </ThemeRegistry>

                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                const theme = localStorage.getItem('lyricsray-theme') || 'dark';
                                if (theme === 'dark') {
                                    document.documentElement.classList.add('dark');
                                }
                                else if (theme === 'system') {
                                    document.documentElement.classList.add('system');
                                }
                                else if (theme === 'light') {
                                    document.documentElement.classList.add('light');
                                }
                            })();
                        `,
                    }}
                />
            </body>
        </html>
    );
}