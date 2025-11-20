import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClientLayout } from "../components/ClientLayout";
import { ThemeRegistry } from "../components/ThemeRegistry";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: 'LyricsRay - Is This Song Safe for My Child?',
    description: 'LyricsRay helps parents check if songs are appropriate for their children based on lyrics analysis and age recommendations',
};

export default function RootLayout({
    children,
    }: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ThemeRegistry>
                    <ClientLayout>
                        {children}
                    </ClientLayout>
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