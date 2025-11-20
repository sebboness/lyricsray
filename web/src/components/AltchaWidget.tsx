'use client';

// Load ALTCHA dynamically
if (typeof window !== 'undefined') {
    import('altcha');
}

interface AltchaWidgetProps {
    challengeurl: string;
    style?: Record<string, string>;
    onstatechange?: (event: any) => void;
}

export function AltchaWidget({ challengeurl, style, onstatechange }: AltchaWidgetProps) {

    if (typeof window === 'undefined') {
        return <></>;
    }

    return (
        <altcha-widget
            challengeurl={challengeurl}
            style={style as any}
            onstatechange={onstatechange}
        />
    );
}