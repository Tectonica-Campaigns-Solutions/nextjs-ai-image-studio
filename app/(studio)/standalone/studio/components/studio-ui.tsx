"use client";

import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Pipette } from "lucide-react";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import {
  Popover,
  PopoverAnchor,
  PopoverContent,
} from "@/components/ui/popover";
import { UI_COLORS } from "../constants/editor-constants";

export function StudioIconButton({
  label,
  active,
  danger,
  badge,
  className,
  disabled,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  active?: boolean;
  danger?: boolean;
  badge?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "relative inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border transition-colors duration-160 cursor-pointer disabled:cursor-not-allowed",
        danger
          ? active
            ? "bg-[#F26B81] border-[#F26B81] text-white disabled:hover:bg-[#F26B81] disabled:hover:border-[#F26B81] disabled:hover:text-white"
            : "bg-[#211E30] border-white/[0.09] text-[#F26B81] hover:bg-[#F26B81] hover:border-[#F26B81] hover:text-white disabled:hover:bg-[#211E30] disabled:hover:border-white/[0.09] disabled:hover:text-[#F26B81]"
          : active
            ? "bg-[#6146F2] border-[#6146F2] text-white disabled:hover:bg-[#6146F2] disabled:hover:border-[#6146F2] disabled:hover:text-white"
            : "bg-[#211E30] border-white/[0.09] text-[#F5F4FB] hover:bg-[#6146F2] hover:border-[#6146F2] hover:text-white disabled:hover:bg-[#211E30] disabled:hover:border-white/[0.09] disabled:hover:text-[#F5F4FB]",
        className,
      )}
      {...props}
    >
      <span
        className={cn(
          "inline-flex size-[18px] shrink-0 items-center justify-center transition-opacity duration-160",
          disabled && "opacity-40",
        )}
      >
        {children}
      </span>
      {badge ? (
        <span
          className={cn(
            "absolute top-[7px] right-[7px] size-[7px] rounded-full",
            active ? "bg-white shadow-[0_0_0_2px_#6146F2]" : "bg-[#8069FF] shadow-[0_0_0_2px_#211E30]",
          )}
        />
      ) : null}
    </button>
  );
}

export function StudioActionButton({
  label,
  icon,
  variant = "ghost",
  iconOnly,
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  icon?: ReactNode;
  variant?: "primary" | "ghost" | "ai";
  iconOnly?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl text-[14px] font-bold transition-colors duration-160 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        iconOnly ? "w-11 px-0" : "px-4",
        variant === "primary" && "bg-[#6146F2] text-white hover:bg-[#7457F8] border border-transparent",
        variant === "ghost" &&
          "bg-[#211E30] text-[#F5F4FB] border border-white/[0.09] hover:bg-[#2C2942]",
        variant === "ai" &&
          "bg-transparent text-[#F5F4FB] border border-white/[0.17] hover:bg-[rgba(128,105,255,0.14)]",
        className,
      )}
      {...props}
    >
      {icon}
      {!iconOnly ? (children ?? label) : null}
    </button>
  );
}

export function StudioPanelHeader({
  icon,
  title,
  onClose,
}: {
  icon: ReactNode;
  title: string;
  onClose: () => void;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span
        className="inline-flex size-[34px] shrink-0 items-center justify-center rounded-[10px] text-[#8069FF]"
        style={{ background: UI_COLORS.ACCENT_SOFT }}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1 text-[14.5px] font-bold text-[#F5F4FB]">{title}</div>
      <StudioIconButton label="Close" onClick={onClose}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      </StudioIconButton>
    </div>
  );
}

/** Shared form + panel tokens — values from visual-studio.jsx */
export const studioForm = {
  input:
    "min-w-0 h-12 w-full rounded-xl border border-white/[0.09] bg-[#211E30] px-3.5 text-[13.5px] text-[#F5F4FB] outline-none placeholder:text-[#726F86] transition-colors focus:border-[#8069FF] disabled:cursor-not-allowed disabled:opacity-50",
  primaryButton:
    "inline-flex h-12 w-full items-center justify-center gap-[9px] rounded-xl bg-[#6146F2] text-[15px] font-bold text-white transition-colors hover:bg-[#7457F8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-[#6146F2] disabled:active:scale-100",
  inlinePrimaryButton:
    "inline-flex h-12 shrink-0 items-center justify-center gap-[9px] rounded-xl bg-[#6146F2] px-[18px] text-[14px] font-bold text-white transition-colors hover:bg-[#7457F8] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
  secondaryButton:
    "inline-flex h-12 items-center justify-center gap-[9px] rounded-xl border border-white/[0.09] bg-[#211E30] px-4 text-[13px] font-bold text-[#F5F4FB] transition-colors hover:bg-[#2C2942] disabled:cursor-not-allowed disabled:opacity-50",
  hint: "text-[13px] leading-[1.45] text-[#ADAAC0]",
  label: "text-[13.5px] font-bold text-[#F5F4FB]",
  labelNarrow: "text-[13.5px] font-bold text-[#F5F4FB] w-[34px] shrink-0",
  labelWide: "text-[13.5px] font-bold text-[#F5F4FB] w-[62px] shrink-0",
  section: "flex flex-col gap-4",
  divider: "h-px bg-white/[0.09] my-0.5",
  valueBox:
    "inline-flex min-w-[62px] items-center justify-center rounded-[9px] border border-white/[0.09] bg-[#211E30] px-2.5 py-[9px] text-[13.5px] font-semibold tabular-nums text-[#F5F4FB]",
  slider: cn(
    "w-full",
    "[&_[data-slot=slider-track]]:h-[4px] [&_[data-slot=slider-track]]:rounded-full [&_[data-slot=slider-track]]:bg-[#211E30]",
    "[&_[data-slot=slider-range]]:bg-[#8069FF_!important]",
    "[&_[role=slider]]:size-[15px] [&_[role=slider]]:border-0 [&_[role=slider]]:bg-[#D3D0E0] [&_[role=slider]]:shadow-[0_1px_3px_rgba(0,0,0,0.5)]",
  ),
  sliderRow: "flex items-center gap-3",
  selectTrigger:
    "h-11 w-full rounded-[10px] border border-white/[0.09] bg-[#211E30] px-3 text-[13.5px] font-semibold text-[#F5F4FB] transition-colors hover:bg-[#2C2942] focus:border-[#8069FF] focus:ring-0",
  selectTriggerLarge:
    "h-12 w-full rounded-xl border border-white/[0.09] bg-[#211E30] px-4 text-[14.5px] font-semibold text-[#F5F4FB] transition-colors hover:bg-[#2C2942] focus:border-[#8069FF] focus:ring-0",
  selectContent:
    "rounded-[10px] border border-white/[0.17] bg-[#211E30] text-[#F5F4FB] shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]",
  selectItem:
    "cursor-pointer rounded-md text-[13.5px] font-semibold text-[#F5F4FB] focus:bg-[rgba(128,105,255,0.16)] focus:text-[#8069FF] data-[state=checked]:text-[#8069FF]",
  layerItem:
    "flex items-center gap-3 rounded-lg border border-white/[0.09] bg-[#211E30] px-2.5 py-[13px] transition-colors hover:bg-[#2C2942]",
  layerItemSelected: "border-[#8069FF] bg-[rgba(128,105,255,0.16)]",
  iconAction:
    "rounded-md p-1 text-[#ADAAC0] transition-colors hover:bg-white/[0.08] hover:text-[#F5F4FB]",
  squareButton:
    "inline-flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-white/[0.09] bg-transparent text-[#ADAAC0] transition-colors hover:bg-[#2C2942] hover:text-[#F5F4FB] disabled:cursor-not-allowed disabled:opacity-40",
  squareButtonActive:
    "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#8069FF]",
  colorControlGroup: "flex items-center gap-1.5",
  colorPopover:
    "w-auto rounded-[10px] border border-white/[0.17] bg-[#211E30] p-4 shadow-[0_18px_40px_-16px_rgba(0,0,0,0.7)]",
  eyedropperButton:
    "mt-2 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-white/[0.09] bg-[#211E30] py-1.5 text-[12px] font-medium text-[#ADAAC0] transition-colors hover:bg-[#2C2942] hover:text-[#F5F4FB] disabled:cursor-not-allowed disabled:opacity-50",
  eyedropperButtonActive:
    "border-[#8069FF] bg-[rgba(128,105,255,0.16)] text-[#F5F4FB]",
} as const;

export const studioDialog = {
  content:
    "flex max-h-[calc(100vh-2rem)] flex-col overflow-hidden border border-white/[0.09] bg-[#141220] text-[#F5F4FB] sm:max-w-md [&>button]:text-[#ADAAC0] [&>button]:hover:text-[#F5F4FB]",
  title: "text-[15px] font-bold tracking-[-0.01em] text-[#F5F4FB]",
  description: "text-[12.5px] leading-snug text-[#ADAAC0]",
  footer: "flex-row gap-2 border-t border-white/[0.09] bg-[#141220] pt-4 sm:justify-end",
} as const;

export function StudioPanelHint({ children }: { children: ReactNode }) {
  return <p className={studioForm.hint}>{children}</p>;
}

/** Vertical rule between history toolbar actions and destructive actions — visual-studio.jsx */
export function StudioToolbarDivider() {
  return (
    <span
      role="separator"
      aria-orientation="vertical"
      className="mx-2.5 h-[18px] w-px shrink-0 bg-[rgba(255,255,255,0.16)]"
    />
  );
}

/** Wrapper for content inside Advanced accordion rows */
export function StudioAdvancedPanelBody({ children }: { children: ReactNode }) {
  return <div className="px-1 pb-4">{children}</div>;
}

export function StudioOrDivider() {
  return (
    <div className="relative py-0.5">
      <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-white/[0.09]" />
      <div className="relative flex justify-center">
        <span className="bg-[#141220] px-1.5 text-xs font-bold tracking-[0.06em] text-[#ADAAC0]">
          OR
        </span>
      </div>
    </div>
  );
}

export function StudioCheckboxRow({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2 select-none">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-px inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
          checked
            ? "border-[#6146F2] bg-[#6146F2] text-white"
            : "border-white/[0.17] bg-[#211E30] text-transparent",
        )}
      >
        {checked ? (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden>
            <path d="M20 6 9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </button>
      <span className={cn(studioForm.hint, "leading-[1.45]")} onClick={() => onChange(!checked)}>
        {label}
      </span>
    </label>
  );
}

export function StudioSquareButton({
  label,
  active,
  onClick,
  disabled,
  children,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={!!active}
      disabled={disabled}
      onClick={onClick}
      className={cn(studioForm.squareButton, active && studioForm.squareButtonActive)}
    >
      {children}
    </button>
  );
}

/** Circular color preview — visual-studio.jsx Swatch (40×40, 2px ring) */
export function StudioColorSwatch({
  color,
  label,
  active,
  disabled,
  onClick,
}: {
  color: string;
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative inline-flex size-10 shrink-0 cursor-pointer overflow-hidden rounded-full border-2 box-border transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        active ? "border-[#8069FF]" : "border-white/[0.17]",
      )}
    >
      <span
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(45deg, #2a2838 25%, transparent 25%), linear-gradient(-45deg, #2a2838 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #2a2838 75%), linear-gradient(-45deg, transparent 75%, #2a2838 75%)",
          backgroundSize: "8px 8px",
          backgroundPosition: "0 0, 0 4px, 4px -4px, -4px 0px",
        }}
        aria-hidden
      />
      <span className="absolute inset-0" style={{ backgroundColor: color }} aria-hidden />
    </button>
  );
}

/** Swatch + square icon control with popover — visual-studio.jsx TextToolBody color row */
export function StudioColorControl({
  label,
  color,
  icon,
  disabled,
  eyedropperActive,
  onStartEyedropper,
  eyedropperLabel = "Pick from canvas",
  children,
}: {
  label: string;
  color: string;
  icon: ReactNode;
  disabled?: boolean;
  eyedropperActive?: boolean;
  onStartEyedropper?: () => void;
  eyedropperLabel?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);

  const openPicker = () => {
    if (!disabled) setOpen(true);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={studioForm.colorControlGroup}>
          <StudioColorSwatch
            color={color}
            label={label}
            active={open}
            disabled={disabled}
            onClick={openPicker}
          />
          <StudioSquareButton
            label={label}
            active={open}
            disabled={disabled}
            onClick={openPicker}
          >
            {icon}
          </StudioSquareButton>
        </div>
      </PopoverAnchor>
      <PopoverContent className={studioForm.colorPopover} align="start">
        {children}
        {onStartEyedropper ? (
          <button
            type="button"
            onClick={onStartEyedropper}
            className={cn(
              studioForm.eyedropperButton,
              eyedropperActive && studioForm.eyedropperButtonActive,
            )}
          >
            <Pipette className="size-3.5 shrink-0" aria-hidden />
            {eyedropperLabel}
          </button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

export function StudioSliderRow({
  label,
  labelClassName,
  value,
  displayValue,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  labelClassName?: string;
  value: number;
  displayValue: string;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className={studioForm.sliderRow}>
      <span className={labelClassName ?? studioForm.labelWide}>{label}</span>
      <Slider
        value={[value]}
        onValueChange={([next]) => onChange(next)}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        className={studioForm.slider}
      />
      <span className={studioForm.valueBox}>{displayValue}</span>
    </div>
  );
}
