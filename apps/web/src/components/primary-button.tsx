"use client";

import type { ReactNode } from "react";
import Button, { type ButtonProps } from "@mui/material/Button";
import type { SxProps, Theme } from "@mui/material/styles";
import Link from "next/link";

export type NarpisaPrimaryButtonWidth = "short" | "regular";

const widthRem: Record<NarpisaPrimaryButtonWidth, string> = {
  short: "13.125rem",
  regular: "27.8125rem",
};

export type NarpisaPrimaryButtonProps = Omit<
  ButtonProps,
  "variant" | "color"
> & {
  buttonWidth?: NarpisaPrimaryButtonWidth;
  href?: string;
  children?: ReactNode;
};

/** Figma pressed fill; matches extended primary scale in theme */
const PRIMARY_PRESSED = "#568179";

function baseButtonSx(theme: Theme) {
  return {
    position: "relative",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    minHeight: "clamp(3.5rem, 10vw, 6.5rem)",
    borderRadius: "0.9375rem",
    paddingInline: "1em",
    paddingBlock: "0.35em",
    textTransform: "lowercase",
    fontFamily: theme.typography.fontFamily,
    fontWeight: 400,
    fontSize: "clamp(1.75rem, 5vw, 4rem)",
    lineHeight: 1,
    color: theme.palette.secondary.main,
    backgroundColor: theme.palette.primary.main,
    border: "none",
    boxShadow: "none",
    overflow: "hidden",
    transition: theme.transitions.create(
      ["background-color", "box-shadow", "border-color", "transform"],
      { duration: theme.transitions.duration.short },
    ),
    "&:hover": {
      backgroundColor: theme.palette.primary.main,
      borderBottom: `1px solid ${theme.palette.secondary.main}`,
      borderRight: `1px solid ${theme.palette.secondary.main}`,
      boxShadow: "none",
    },
    "&:active": {
      backgroundColor: PRIMARY_PRESSED,
      borderBottom: `1px solid ${theme.palette.secondary.main}`,
      borderRight: `1px solid ${theme.palette.secondary.main}`,
      boxShadow: "inset 0 4px 10px 5px rgba(0,0,0,0.3)",
    },
    "&:focus-visible": {
      outline: `2px solid ${theme.palette.secondary.main}`,
      outlineOffset: 2,
    },
    "&:disabled": {
      opacity: 0.5,
    },
  };
}

export default function NarpisaPrimaryButton({
  children = "button",
  buttonWidth = "regular",
  href,
  sx,
  disabled,
  ...props
}: NarpisaPrimaryButtonProps) {
  const maxW = widthRem[buttonWidth];

  const extra =
    sx === undefined || sx === null ? [] : Array.isArray(sx) ? sx : [sx];

  const merged: SxProps<Theme> = [
    (theme) => ({
      ...baseButtonSx(theme),
      width: "100%",
      maxWidth: maxW,
    }),
    ...extra,
  ];

  if (href && !disabled) {
    return (
      <Button
        component={Link}
        href={href}
        disableRipple
        variant="contained"
        sx={merged}
        {...props}
      >
        {children}
      </Button>
    );
  }

  return (
    <Button disableRipple variant="contained" disabled={disabled} sx={merged} {...props}>
      {children}
    </Button>
  );
}
