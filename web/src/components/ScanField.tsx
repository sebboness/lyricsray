"use client";

import { Box } from "@mui/material";
import { keyframes } from "@mui/system";

/**
 * Ambient scan field. Sits inside a positioned container (the app shell, or a
 * single Paper) and paints three things:
 *   - two slow drifting glows BEHIND the content (z-index -1)
 *   - hairline scanlines ABOVE everything (z-index 5, uniform texture)
 *   - a slow sweep just under the scanlines (z-index 4)
 *
 * The parent must establish a stacking context: position: relative, z-index: 0,
 * overflow: hidden. Without z-index: 0 on the parent, the -1 layers escape
 * behind the page background and disappear.
 */

const driftA = keyframes`
  0%   { transform: translate(0, 0); }
  50%  { transform: translate(9%, -7%); }
  100% { transform: translate(0, 0); }
`;

const driftB = keyframes`
  0%   { transform: translate(0, 0); }
  50%  { transform: translate(-8%, 6%); }
  100% { transform: translate(0, 0); }
`;

const scan = keyframes`
  0%   { transform: translateY(-30%); }
  100% { transform: translateY(130%); }
`;

type Props = {
    /** Mobile runs a slightly faster, taller sweep than desktop. */
    variant?: "mobile" | "desktop";
};

export default function ScanField({ variant = "desktop" }: Props) {
    const mobile = variant === "mobile";

    return (
        <Box
            aria-hidden
            sx={{
                // Every layer opts out of motion together.
                "@media (prefers-reduced-motion: reduce)": {
                    "& > *": { animation: "none !important" },
                },
            }}
        >
            {/* violet glow, bottom-left */}
            <Box sx={{
                position: "absolute", inset: "-20%", zIndex: -1, pointerEvents: "none",
                background: "radial-gradient(34% 28% at 22% 78%, rgba(157,144,255,0.16), rgba(157,144,255,0) 70%)",
                animation: `${driftA} 30s ease-in-out infinite`,
                willChange: "transform",
            }} />

            {/* teal counterweight, top-right */}
            <Box sx={{
                position: "absolute", inset: "-20%", zIndex: -1, pointerEvents: "none",
                background: "radial-gradient(30% 26% at 78% 12%, rgba(70,214,196,0.08), rgba(70,214,196,0) 70%)",
                animation: `${driftB} 36s ease-in-out infinite`,
                willChange: "transform",
            }} />

            {/* scanlines — 2.8% on a 6px pitch, above the UI so the texture is uniform */}
            <Box sx={{
                position: "absolute", inset: 0, zIndex: 5, pointerEvents: "none",
                background:
                    "repeating-linear-gradient(180deg, rgba(157,144,255,0.028) 0px, rgba(157,144,255,0.028) 1px, transparent 1px, transparent 6px)",
            }} />

            {/* sweep */}
            <Box sx={{
                position: "absolute", left: 0, right: 0, top: 0,
                height: mobile ? "20%" : "16%",
                zIndex: 4, pointerEvents: "none",
                background: "linear-gradient(180deg, rgba(157,144,255,0), rgba(157,144,255,0.05), rgba(157,144,255,0))",
                animation: `${scan} ${mobile ? 10 : 13}s linear infinite`,
                willChange: "transform",
            }} />
        </Box>
    );
}
