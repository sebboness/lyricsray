import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { ClientLayout } from "@/components/ClientLayout";
import { ThemeRegistry } from "@/components/ThemeRegistry";
import { buildMetadata } from "@/util/seo";

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

export const metadata: Metadata = buildMetadata({ title, description, path: '/' });

export default function RootLayout({
    children,
    }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <head>
                <link rel="preload" href="/images/logo-256.png" as="image" type="image/png" fetchPriority="high" />
                <link rel="apple-touch-icon" sizes="180x180" href="/images/logo-180.png" />
                <link rel="icon" href="/images/favicon.ico" />
                <link rel="icon" type="image/png" sizes="16x16" href="/images/logo-shield-16.png" />
                <link rel="icon" type="image/png" sizes="32x32" href="/images/logo-shield-32.png" />
                <link rel="icon" type="image/png" sizes="96x96" href="/images/logo-96.png" />
                <link rel="icon" type="image/png" sizes="192x192" href="/images/logo-192.png" />
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