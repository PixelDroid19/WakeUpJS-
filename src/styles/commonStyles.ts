// src/styles/commonStyles.ts

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg';

interface ButtonStyleProps {
  variant?: ButtonVariant;
  size?: ComponentSize;
  customClasses?: string;
  disabled?: boolean;
}

// Function to generate Tailwind CSS class strings for buttons
export const getThemedButtonClasses = ({
  variant = 'primary',
  size = 'md',
  customClasses = '',
  disabled = false,
}: ButtonStyleProps = {}): string => {
  let baseClasses = `font-medium rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--theme-accent)]`;

  // Base styling that uses CSS variables (can be part of a global .themed-button class too)
  // For now, let's define them directly here for more control per variant.
  baseClasses += ` border border-transparent transition-colors duration-150 ease-in-out`;

  if (disabled) {
    baseClasses += ' opacity-50 cursor-not-allowed';
  } else {
    baseClasses += ' hover:brightness-110 active:brightness-90';
  }

  let variantClasses = '';
  switch (variant) {
    case 'primary':
      variantClasses = `bg-[var(--theme-accent)] text-[var(--theme-bg)]`; // Or a dedicated --theme-button-text-primary
      if (!disabled) variantClasses += ` hover:bg-[color-mix(in_srgb,var(--theme-accent)_90%,white)]`;
      break;
    case 'secondary':
      variantClasses = `bg-[var(--theme-bg-secondary)] text-[var(--theme-fg)] border-[var(--theme-border)]`;
      if (!disabled) variantClasses += ` hover:bg-[var(--theme-bg-tertiary)]`;
      break;
    case 'danger':
      variantClasses = `bg-[var(--theme-error)] text-white`; // Assuming high contrast for error text
      if (!disabled) variantClasses += ` hover:bg-[color-mix(in_srgb,var(--theme-error)_90%,white)]`;
      break;
    case 'success':
      variantClasses = `bg-[var(--theme-success)] text-white`; // Assuming high contrast for success text
      if (!disabled) variantClasses += ` hover:bg-[color-mix(in_srgb,var(--theme-success)_90%,white)]`;
      break;
    case 'ghost':
      variantClasses = `bg-transparent text-[var(--theme-accent)] border-transparent`;
      if (!disabled) variantClasses += ` hover:bg-[color-mix(in_srgb,var(--theme-accent)_10%,transparent)]`;
      baseClasses = baseClasses.replace('border-transparent', ''); // Ghost usually has no border unless specified
      break;
  }

  let sizeClasses = '';
  switch (size) {
    case 'xs':
      sizeClasses = 'px-2.5 py-1.5 text-xs';
      break;
    case 'sm':
      sizeClasses = 'px-3 py-2 text-sm leading-4';
      break;
    case 'md':
      sizeClasses = 'px-4 py-2 text-sm';
      break;
    case 'lg':
      sizeClasses = 'px-6 py-3 text-base';
      break;
  }

  return `${baseClasses} ${variantClasses} ${sizeClasses} ${customClasses}`;
};

interface InputStyleProps {
  size?: ComponentSize;
  customClasses?: string;
  hasError?: boolean;
}

// Function to generate Tailwind CSS class strings for inputs
export const getThemedInputClasses = ({
  size = 'md',
  customClasses = '',
  hasError = false,
}: InputStyleProps = {}): string => {
  let baseClasses = `block w-full rounded-md shadow-sm
                     bg-[var(--theme-bg-secondary)]
                     text-[var(--theme-fg)]
                     border-[var(--theme-border)]
                     placeholder:text-[color-mix(in_srgb,var(--theme-fg)_50%,transparent)]
                     focus:border-[var(--theme-accent)]
                     focus:ring-1 focus:ring-[var(--theme-accent)]`;

  if (hasError) {
    baseClasses += ` border-[var(--theme-error)] focus:border-[var(--theme-error)] focus:ring-[var(--theme-error)]`;
  }

  let sizeClasses = '';
  switch (size) {
    case 'xs':
      sizeClasses = 'px-2.5 py-1.5 text-xs'; // Not standard Tailwind, but for consistency
      break;
    case 'sm':
      sizeClasses = 'px-3 py-2 text-sm leading-4'; // Approx sm:text-sm
      break;
    case 'md':
      sizeClasses = 'px-4 py-2 text-sm'; // Approx base:text-sm
      break;
    case 'lg':
      sizeClasses = 'px-6 py-3 text-base'; // Approx lg:text-base
      break;
  }

  // Tailwind's form plugin might provide default sizes, these are overrides or if not using the plugin.
  // For simplicity, using padding and text size.
  // Standard Tailwind input sizes are often controlled by font-size and padding.
  // Example: text-sm leading-5 py-2 px-3

  return `${baseClasses} ${sizeClasses} ${customClasses}`;
};

// Example usage (for testing or demonstration):
// console.log(getThemedButtonClasses({ variant: 'primary', size: 'lg' }));
// console.log(getThemedInputClasses({ hasError: true }));

// Potentially, add constants for dialog panel backgrounds, text colors etc.
export const DIALOG_BACKGROUND_CLASSES = 'bg-[var(--theme-bg)] text-[var(--theme-fg)] border border-[var(--theme-border)] rounded-lg shadow-xl';
export const DIALOG_HEADER_CLASSES = 'text-lg font-semibold text-[var(--theme-accent)] border-b border-[var(--theme-border)] p-4';
export const DIALOG_BODY_CLASSES = 'p-4 space-y-4';
export const DIALOG_FOOTER_CLASSES = 'border-t border-[var(--theme-border)] p-4 flex justify-end space-x-3';

export const TEXT_COLOR_PRIMARY = 'text-[var(--theme-fg)]';
export const TEXT_COLOR_SECONDARY = 'text-[color-mix(in_srgb,var(--theme-fg)_70%,transparent)]';
export const TEXT_COLOR_ACCENT = 'text-[var(--theme-accent)]';
export const TEXT_COLOR_ERROR = 'text-[var(--theme-error)]';

// Toggle switch specific styles (can be expanded)
export const getToggleSwitchClasses = (isChecked: boolean, disabled: boolean = false) => {
  const base = `relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[var(--theme-accent)] focus:ring-offset-2`;
  const checkedBg = 'bg-[var(--theme-accent)]';
  const uncheckedBg = 'bg-[var(--theme-bg-tertiary)]'; // Or var(--theme-border)

  let knobBase = `pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`;
  const knobTranslate = isChecked ? 'translate-x-5' : 'translate-x-0';

  let finalClasses = `${base} ${isChecked ? checkedBg : uncheckedBg}`;
  if (disabled) {
    finalClasses += ' opacity-50 cursor-not-allowed';
  }

  return {
    switch: finalClasses,
    knob: `${knobBase} ${knobTranslate}`
  };
};
