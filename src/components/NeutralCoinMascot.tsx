import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type NeutralCoinMascotProps = {
  className?: string;
};

/** Neutral greys — inner face #9c9c9c */
const RIM_FILL = "#b3b3b3";
const RIM_OUTLINE = "#8a8a8a";
const INNER_FACE = "#9c9c9c";
const RIM_HIGHLIGHT = "#d4d4d4";

/**
 * Kawaii coin — UI-grey metal: raised rim, inner face, vertical oval eyes, blush, wide smile, stick limbs.
 */
export function NeutralCoinMascot({ className }: NeutralCoinMascotProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const smileClipId = `coinSmileClip-${uid}`;

  return (
    <div
      className={cn(
        "flex flex-col items-end origin-top-right scale-[0.8]",
        className,
      )}
      aria-hidden
    >
      <motion.div
        className="flex flex-col items-end will-change-transform"
        animate={reduceMotion ? { y: 0 } : { y: [0, -3.2, 0] }}
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 2.35, repeat: Infinity, ease: "easeInOut" }
        }
      >
      <svg width="130" height="160" viewBox="0 0 110 135" className="block h-auto max-w-none drop-shadow-md">
        <defs>
          <clipPath id={smileClipId}>
            <rect x="36" y="59" width="38" height="18" />
          </clipPath>
        </defs>

        {/* outer rim */}
        <circle cx="55" cy="55" r="32" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.9" />
        {/* inner face — recessed, matches muted tones */}
        <circle cx="55" cy="55" r="26.5" fill={INNER_FACE} />
        {/* inner ring — light edge only (no dark grey) */}
        <circle cx="55" cy="55" r="26.5" fill="none" stroke={RIM_OUTLINE} strokeWidth="0.75" opacity={0.45} />

        {/* rim highlight (top-left) */}
        <path
          d="M 32 42 A 28 28 0 0 1 48 28"
          fill="none"
          stroke={RIM_HIGHLIGHT}
          strokeWidth="3.2"
          strokeLinecap="round"
          opacity={0.85}
        />

        {/* horizontal blush — outside each eye */}
        <ellipse cx="35" cy="52" rx="4.2" ry="2.4" fill="#fb7185" opacity={0.72} />
        <ellipse cx="75" cy="52" rx="4.2" ry="2.4" fill="#fb7185" opacity={0.72} />

        {/* vertical oval eyes — slightly larger, slightly closer */}
        <ellipse className="neutral-coin-eye" cx="42.5" cy="48.5" rx="1.55" ry="3.1" fill="#0a0a0a" />
        <ellipse className="neutral-coin-eye" cx="67.5" cy="48.5" rx="1.55" ry="3.1" fill="#0a0a0a" />

        {/* wide solid black smile — lower half of ellipse (open grin) */}
        <ellipse
          cx="55"
          cy="63.5"
          rx="11"
          ry="7"
          fill="#0a0a0a"
          clipPath={`url(#${smileClipId})`}
        />
        {/* tongue — same clip as mouth */}
        <ellipse
          cx="55"
          cy="67.2"
          rx="4.4"
          ry="1.95"
          fill="#f472b6"
          clipPath={`url(#${smileClipId})`}
        />

        {/* feet under straight legs — wider stance */}
        <ellipse cx="48.5" cy="101.5" rx="4.9" ry="2.7" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.75" />
        <ellipse cx="61.5" cy="101.5" rx="4.9" ry="2.7" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.75" />
        <path d="M 48.5 87 L 48.5 99.2" fill="none" stroke={RIM_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
        <path d="M 61.5 87 L 61.5 99.2" fill="none" stroke={RIM_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />

        {/* arms — match outer ring outline */}
        <path d="M 23 54 Q 16 46 13.5 37.5" fill="none" stroke={RIM_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
        <path d="M 87 54 Q 93 64 96.5 74.5" fill="none" stroke={RIM_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
        {/* round hands */}
        <circle cx="10.8" cy="34.2" r="3.85" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.75" />
        <circle cx="99.2" cy="75.8" r="3.85" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.75" />
      </svg>
      </motion.div>
    </div>
  );
}