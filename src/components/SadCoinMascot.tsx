import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

type SadCoinMascotProps = {
  className?: string;
};

/** Same greys as NeutralCoinMascot — inner face #9c9c9c */
const RIM_FILL = "#b3b3b3";
const RIM_OUTLINE = "#8a8a8a";
const INNER_FACE = "#9c9c9c";
const RIM_HIGHLIGHT = "#d4d4d4";

const TEAR_PATH =
  "M 42.5 52.4 Q 41.2 55.8 41.4 58.6 Q 41.6 60.2 42.5 60.6 Q 43.5 60.1 43.8 58.4 Q 44 56 43.2 53.6 Q 42.6 52.6 42.5 52.4 Z";

/**
 * Same coin build & colors as neutral; frown, short droopy arms, falling tears + sob wobble.
 */
export function SadCoinMascot({ className }: SadCoinMascotProps) {
  const reduceMotion = useReducedMotion();
  const uid = useId().replace(/:/g, "");
  const tearGradId = `sadCoinTear-${uid}`;

  const tearFall = reduceMotion
    ? { y: 0, opacity: 0.9 }
    : {
        y: [0, 30, 30, 0],
        opacity: [0, 0.95, 0, 0],
      };

  const tearTransition = {
    duration: 2.15,
    repeat: Infinity,
    times: [0, 0.42, 0.8, 1],
    ease: ["easeOut", "easeIn", "linear", "linear"] as const,
  };

  return (
    <div
      className={cn(
        "flex flex-col items-start origin-bottom-left scale-[0.8]",
        className,
      )}
      aria-hidden
    >
      <motion.div
        className="flex flex-col items-start will-change-transform"
        animate={
          reduceMotion
            ? { y: 0, rotate: 0, x: 0 }
            : {
                y: [0, 2.4, 0, 1.8, 0],
                rotate: [-1.1, 0.9, -1.1, 0.6, -1.1],
                x: [0, 2, -2, 1.5, 0],
              }
        }
        transition={
          reduceMotion
            ? { duration: 0 }
            : { duration: 2.6, repeat: Infinity, ease: "easeInOut" }
        }
      >
        <svg
          width="130"
          height="160"
          viewBox="0 0 110 135"
          className="block h-auto max-w-none drop-shadow-md"
        >
          <defs>
            <linearGradient id={tearGradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#bae6fd" />
              <stop offset="100%" stopColor="#38bdf8" />
            </linearGradient>
          </defs>

          <circle cx="55" cy="55" r="32" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.9" />
          <circle cx="55" cy="55" r="26.5" fill={INNER_FACE} />
          <circle
            cx="55"
            cy="55"
            r="26.5"
            fill="none"
            stroke={RIM_OUTLINE}
            strokeWidth="0.75"
            opacity={0.45}
          />

          <path
            d="M 32 42 A 28 28 0 0 1 48 28"
            fill="none"
            stroke={RIM_HIGHLIGHT}
            strokeWidth="3.2"
            strokeLinecap="round"
            opacity={0.85}
          />

          <ellipse cx="35" cy="52" rx="4.2" ry="2.4" fill="#fb7185" opacity={0.5} />
          <ellipse cx="75" cy="52" rx="4.2" ry="2.4" fill="#fb7185" opacity={0.5} />

          {/* falling tears (under eyes once eyes are drawn) */}
          <motion.g animate={tearFall} transition={{ ...tearTransition, delay: 0 }}>
            <path d={TEAR_PATH} fill={`url(#${tearGradId})`} />
          </motion.g>
          <motion.g
            animate={tearFall}
            transition={{ ...tearTransition, delay: 1.05 }}
          >
            <path
              d="M 67.5 52.4 Q 66.2 55.8 66.4 58.6 Q 66.6 60.2 67.5 60.6 Q 68.5 60.1 68.8 58.4 Q 69 56 68.2 53.6 Q 67.6 52.6 67.5 52.4 Z"
              fill={`url(#${tearGradId})`}
            />
          </motion.g>

          <ellipse cx="42.5" cy="49" rx="1.55" ry="2.85" fill="#0a0a0a" />
          <ellipse cx="67.5" cy="49" rx="1.55" ry="2.85" fill="#0a0a0a" />

          {/* frown — smaller / tighter */}
          <path
            d="M 48 68.2 Q 55 63.5 62 68.2"
            fill="none"
            stroke="#0a0a0a"
            strokeWidth="1.85"
            strokeLinecap="round"
          />

          <ellipse cx="48.5" cy="101.5" rx="4.9" ry="2.7" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.75" />
          <ellipse cx="61.5" cy="101.5" rx="4.9" ry="2.7" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.75" />
          <path d="M 48.5 87 L 48.5 99.2" fill="none" stroke={RIM_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />
          <path d="M 61.5 87 L 61.5 99.2" fill="none" stroke={RIM_OUTLINE} strokeWidth="2.1" strokeLinecap="round" />

          {/* short droopy arms */}
          <path d="M 23 54 Q 20.5 62 19.5 68" fill="none" stroke={RIM_OUTLINE} strokeWidth="1.85" strokeLinecap="round" />
          <path d="M 87 54 Q 89.5 62 90.5 68" fill="none" stroke={RIM_OUTLINE} strokeWidth="1.85" strokeLinecap="round" />
          <circle cx="18.8" cy="69.5" r="3.15" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.65" />
          <circle cx="91.2" cy="69.5" r="3.15" fill={RIM_FILL} stroke={RIM_OUTLINE} strokeWidth="0.65" />
        </svg>
      </motion.div>
    </div>
  );
}
