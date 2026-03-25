"use client";

import Box from "@mui/material/Box";
import {
  motion,
  useScroll,
  useTransform,
  useSpring,
  type MotionStyle,
} from "motion/react";

export interface FloatingRockProps {
  src: string;
  alt: string;
  /** Width in viewport-relative units (e.g. "42vw") */
  width: string | Record<string, string>;
  /** Multiplier for scroll-linked Y translation (negative = moves up on scroll) */
  parallaxSpeed?: number;
  /** Degrees of static rotation */
  rotate?: number;
  /** Amplitude of idle horizontal float in px */
  floatX?: number;
  /** Amplitude of idle vertical float in px */
  floatY?: number;
  /** Duration of one float cycle in seconds */
  floatDuration?: number;
  /** CSS position offsets */
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  /** z-index layer */
  zIndex?: number;
  /** Optional drop shadow filter */
  shadow?: boolean;
  /** Optional scale-Y flip */
  flipY?: boolean;
}

export default function FloatingRock({
  src,
  alt,
  width,
  parallaxSpeed = 0.3,
  rotate = 0,
  floatX = 8,
  floatY = 6,
  floatDuration = 6,
  top,
  left,
  right,
  bottom,
  zIndex = 1,
  shadow = true,
  flipY = false,
}: FloatingRockProps) {
  const { scrollYProgress } = useScroll();

  const rawY = useTransform(
    scrollYProgress,
    [0, 1],
    [0, parallaxSpeed * -600],
  );
  const springY = useSpring(rawY, { stiffness: 80, damping: 30 });

  const resolvedWidth =
    typeof width === "string" ? { xs: width } : width;

  return (
    <Box
      sx={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        zIndex,
        width: resolvedWidth,
        pointerEvents: "none",
        transform: flipY ? `rotate(${rotate}deg) scaleY(-1)` : `rotate(${rotate}deg)`,
        filter: shadow
          ? "drop-shadow(0 4px 4px #2e3130) drop-shadow(0 4px 25px rgba(174,170,163,0.25))"
          : undefined,
      }}
    >
      <motion.div
        style={{ y: springY } as MotionStyle}
      >
        <motion.div
          animate={{
            x: [0, floatX, 0, -floatX, 0],
            y: [0, -floatY, 0, floatY, 0],
          }}
          transition={{
            duration: floatDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <Box
            component="img"
            src={src}
            alt={alt}
            sx={{
              width: "100%",
              height: "auto",
              display: "block",
              userSelect: "none",
            }}
          />
        </motion.div>
      </motion.div>
    </Box>
  );
}
