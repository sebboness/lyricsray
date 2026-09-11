import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClientLayout } from "@/components/ClientLayout";
import { ThemeRegistry } from "@/components/ThemeRegistry";
import { getBaseUrl } from "@/util/routeHelper";

const spaceGrotesk = Space_Grotesk({
    variable: "--font-space-grotesk",
    subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
    variable: "--font-jetbrains-mono",
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
                url: `${getBaseUrl()}/images/logo-512.jpg`,
                width: 512,
                height: 512,
                alt: "LyricsRay Logo"
            }
        ]
    }
};

export default function RootLayout({
    children,
    }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <head>
                <link rel="preload" href="/images/logo-transparent-no-text-512.png" as="image" type="image/png" fetchPriority="high" />
                <link rel="apple-touch-icon" sizes="180x180" href="/images/lyricsray-icon-180.jpg" />
                <link rel="icon" href="/images/favicon.ico" />
                <link rel="icon" type="image/jpg" sizes="16x16" href="/images/lyricsray-icon-16.jpg" />
                <link rel="icon" type="image/jpg" sizes="32x32" href="/images/lyricsray-icon-32.jpg" />
                <link rel="icon" type="image/jpg" sizes="96x96" href="/images/lyricsray-icon-96.jpg" />
                <link rel="icon" type="image/jpg" sizes="192x192" href="/images/lyricsray-icon-192.jpg" />
            </head>
            <body
                className={`${spaceGrotesk.variable} ${jetbrainsMono.variable} antialiased`}
            >
                <ThemeRegistry>
                    <ClientLayout>
                        {children}
                    </ClientLayout>
                </ThemeRegistry>
            </body>
        </html>
    );
}