"use client";

import { forwardRef, useId, useState } from "react";
import FormControl from "@mui/material/FormControl";
import FormHelperText from "@mui/material/FormHelperText";
import FormLabel from "@mui/material/FormLabel";
import InputBase, { type InputBaseProps } from "@mui/material/InputBase";
import { alpha } from "@mui/material/styles";
import type { SxProps, Theme } from "@mui/material/styles";

export type NarpisaTextFieldWidth = "short" | "regular" | "long";

const maxWidthRem: Record<NarpisaTextFieldWidth, string> = {
  short: "18.75rem",
  regular: "28.5rem",
  long: "39.5rem",
};

export type NarpisaTextFieldProps = Omit<
  InputBaseProps,
  "color" | "size"
> & {
  fieldWidth?: NarpisaTextFieldWidth;
  label: string;
  helperText?: string;
  error?: boolean;
  formControlSx?: SxProps<Theme>;
};

function inputSx(theme: Theme, hasError: boolean, focused: boolean): SxProps<Theme> {
  const baseBg = theme.palette.background[500];
  const errorMain = theme.palette.error.main;

  return {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: "0.625rem",
    fontFamily: theme.typography.fontFamily,
    fontWeight: 400,
    fontSize: theme.typography.button.fontSize,
    lineHeight: 1,
    paddingInline: "0.35em",
    paddingBlock: "0.28em",
    color: theme.palette.secondary.main,
    backgroundColor: baseBg,
    transition: theme.transitions.create(
      ["border-color", "background-color", "background-image"],
      { duration: theme.transitions.duration.short },
    ),
    "&::placeholder": {
      color: alpha(theme.palette.secondary.main, 0.5),
      opacity: 1,
    },
    ...(hasError
      ? {
          backgroundImage: `linear-gradient(${alpha(errorMain, 0.15)}, ${alpha(errorMain, 0.15)})`,
          borderBottom: `1px solid ${errorMain}`,
        }
      : focused
        ? {
            borderBottom: `1px solid ${theme.palette.secondary.main}`,
          }
        : {}),
  };
}

const NarpisaTextField = forwardRef<HTMLInputElement, NarpisaTextFieldProps>(
  function NarpisaTextField(props, ref) {
    const {
      fieldWidth = "regular",
      label,
      helperText,
      error = false,
      disabled,
      fullWidth = true,
      id: idProp,
      sx,
      formControlSx,
      onFocus,
      onBlur,
      ...inputProps
    } = props;

    const reactId = useId();
    const id = idProp ?? `narpisa-field-${reactId}`;
    const helperId = helperText ? `${id}-helper` : undefined;

    const [focused, setFocused] = useState(false);

    return (
      <FormControl
        error={error}
        disabled={disabled}
        fullWidth={fullWidth}
        sx={[
          (theme) => ({
            width: "100%",
            maxWidth: maxWidthRem[fieldWidth],
            alignItems: "stretch",
          }),
          ...(formControlSx === undefined || formControlSx === null
            ? []
            : Array.isArray(formControlSx)
              ? formControlSx
              : [formControlSx]),
        ]}
      >
        <FormLabel
          htmlFor={id}
          sx={(theme) => ({
            fontFamily: theme.typography.fontFamily,
            fontWeight: 700,
            fontSize: "clamp(1.25rem, 4vw, 3.125rem)",
            color: theme.palette.secondary.main,
            marginBottom: "0.2em",
            position: "relative",
            transform: "none",
            "&.Mui-focused": {
              color: theme.palette.secondary.main,
            },
            "&.Mui-error": {
              color: theme.palette.secondary.main,
            },
            "&.Mui-disabled": {
              color: alpha(theme.palette.secondary.main, 0.5),
            },
          })}
        >
          {label}
        </FormLabel>
        <InputBase
          id={id}
          ref={ref}
          aria-describedby={helperId}
          disabled={disabled}
          sx={[
            (theme) => inputSx(theme, error, focused),
            ...(sx === undefined || sx === null ? [] : Array.isArray(sx) ? sx : [sx]),
          ]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...inputProps}
        />
        {helperText ? (
          <FormHelperText id={helperId} sx={{ marginLeft: 0 }}>
            {helperText}
          </FormHelperText>
        ) : null}
      </FormControl>
    );
  },
);

export default NarpisaTextField;
