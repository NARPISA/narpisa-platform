"use client";

import IconButton from "@mui/material/IconButton";
import { motion } from "motion/react";

type DatabaseHamburgerButtonProps = {
  open: boolean;
  onClick: () => void;
};

export default function DatabaseHamburgerButton({
  open,
  onClick,
}: DatabaseHamburgerButtonProps) {
  return (
    <IconButton
      aria-label="Open navigation menu"
      onClick={onClick}
      sx={{
        width: 38,
        height: 38,
        borderRadius: "10px",
        color: "common.white",
        bgcolor: "secondary.main",
        "&:hover": { bgcolor: "secondary.600" },
      }}
    >
      <motion.div
        style={{
          width: 20,
          height: 16,
          position: "relative",
        }}
        animate={open ? "open" : "closed"}
      >
        <motion.span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2.5,
            borderRadius: 8,
            background: "#ffffff",
            top: 0,
          }}
          variants={{
            closed: { rotate: 0, y: 0 },
            open: { rotate: 45, y: 6.5 },
          }}
          transition={{ duration: 0.18 }}
        />
        <motion.span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2.5,
            borderRadius: 8,
            background: "#ffffff",
            top: 6.5,
          }}
          variants={{
            closed: { opacity: 1, x: 0 },
            open: { opacity: 0, x: 4 },
          }}
          transition={{ duration: 0.14 }}
        />
        <motion.span
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            height: 2.5,
            borderRadius: 8,
            background: "#ffffff",
            top: 13,
          }}
          variants={{
            closed: { rotate: 0, y: 0 },
            open: { rotate: -45, y: -6.5 },
          }}
          transition={{ duration: 0.18 }}
        />
      </motion.div>
    </IconButton>
  );
}
