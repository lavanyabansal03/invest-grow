import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type CheerfulCoinMascotProps = {
  className?: string;
};

const RIM_FILL = "#b3b3b3";
const RIM_OUTLINE = "#8a8a8a";
const INNER_FACE = "#9c9c9c";
const RIM_HIGHLIGHT = "#d4d4d4";

/** Same palette as neutral; ^_^ eyes, short arms up, jump loop. */
export function CheerfulCoinMascot({ className }: CheerfulCoinMascotProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const smileClipId = `cheerfulSmileClip-${uid}`;

  return (
    <div
      className={cn("flex flex-col items-end origin-top-right scale-[0.8]", className)}
      aria-hidden
    >
      <motion.div
        className="flex flex-col items-end will-change-transform"
        animate={
          reduceMotion
            ? { y: 0, scaleY: 1, scaleX: 1 }
            : {
                y: [0, 3, -42, -8, 0],
                scaleY: [1, 0.88, 1.04, 0.95, 1],
                scaleX: [1, 1.06, 0.98, 1.03, 1],
              }
        }
        transition={{
          duration: 0.85,
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: [0.34, 1.15, 0.64, 1],
          times: [0, 0.12, 0.38, 0.62, 1],
        }}
      >
        <svg width="130" height="160" viewBox="0 0 110 135" className="block h-auto max-w-none drop-shadow-md">
          <defs>
            <clipPath id={smileClipId}>
              <rect x="36" y="59" width="38" height="18" />
            </clipPath>
          </defs>

          <circle cx="55" cy="55" r="32" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.9" />
          <circle cx="55" cy="55" r="26.5" fill={INNER_FACE} />
          <circle cx="55" cy="55" r="26.5" fill="none" stroke={RIM_OUTLINE} strokeWidth="0.75" opacity={0.45} />

          <path
            d="M 32 42 A 28 28 0 0 1 48 28"
            fill="none"
            stroke={RIM_HIGHLIGHT}
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity={0.85}
          />

          <ellipse cx="35" cy="52" rx="4.2" ry="2.4" fill="#fb7185" opacity={0.72} />
          <ellipse cx="75" cy="52" rx="4.2" ry="2.4" fill="#fb7185" opacity={0.72} />

          <path
            d="M 39 49 Q 42.5 43.5 46 49"
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="2.15"
            strokeLinecap="round"
          />
          <path
            d="M 64 49 Q 67.5 43.5 71 49"
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="2.15"
            strokeLinecap="round"
          />

          <ellipse cx="55" cy="63.5" rx="11" ry="7" fill="#0a0a0a" clipPath={`url(#${smileClipId})`} />
          <ellipse cx="55" cy="67.2" rx="4.4" ry="1.95" fill="#f472b6" clipPath={`url(#${smileClipId})`} />

          <ellipse cx="48.5" cy="101.5" rx="4.9" ry="2.7" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.75" />
          <ellipse cx="61.5" cy="101.5" rx="4.9" ry="2.7" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.75" />
          <path d="M 48.5 87 L 48.5 99.2" fill="none" stroke={RIM_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M 61.5 87 L 61.5 99.2" fill="none" stroke={RIM_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />

          <path d="M 23 54 Q 19.5 49 17.5 43" fill="none" stroke={RIM_OUTLINE} strokeWidth="1.85" strokeLinecap="round" />
          <path d="M 87 54 Q 90.5 49 92.5 43" fill="none" stroke={RIM_OUTLINE} strokeWidth="1.85" strokeLinecap="round" />
          <circle cx="15.2" cy="40.5" r="3.15" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.65" />
          <circle cx="94.8" cy="40.5" r="3.15" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.65" />
        </svg>
      </motion.div>
    </div>
  );
}
