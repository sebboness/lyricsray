'use client';

import { Link, LinkProps } from '@mui/material';
import { trackEvent } from '@/util/trackEvent';
import type { LinkTarget } from '@/storage/AnalyticsEventStorage';

interface TrackedExternalLinkProps extends Omit<LinkProps, 'onClick'> {
    href: string;
    linkTarget: LinkTarget;
    linkContext: string;
}

/** MUI Link that fires an externalLink analytics event before navigation. */
export function TrackedExternalLink({
    href,
    linkTarget,
    linkContext,
    children,
    ...rest
}: TrackedExternalLinkProps) {
    return (
        <Link
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => trackEvent('externalLink', { linkTarget, linkContext })}
            {...rest}
        >
            {children}
        </Link>
    );
}
