/**
 * Centralized Theme Configuration
 * 
 * This file contains all design tokens including colors, fonts, spacing, etc.
 * Update values here to apply changes across the entire application.
 */

export const theme = {
  colors: {
    // Pure black for header and footer
    black: {
      pure: '#000000',
      DEFAULT: '#000000',
    },
    
    // Softer black for main content areas
    // Based on rgb(17, 17, 20) but slightly adjusted to rgb(18, 18, 22)
    background: {
      main: '#121216', // rgb(18, 18, 22) - softer black for main content
      header: '#000000', // Pure black for header
      footer: '#000000', // Pure black for footer
      card: '#1a1a1e', // Slightly lighter for cards
      cardHover: '#1f1f23', // Hover state for cards
    },
    
    // Gray scale
    gray: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
      950: '#030712',
    },
    
    // Accent colors
    orange: {
      400: '#fb923c',
      500: '#f97316', // Primary orange
      600: '#ea580c',
    },
    
    // Border colors
    border: {
      DEFAULT: '#374151', // gray-700
      light: '#4b5563', // gray-600
      dark: '#1f2937', // gray-800
    },
  },
  
  fonts: {
    mono: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
  
  spacing: {
    xs: '0.25rem',   // 4px
    sm: '0.5rem',    // 8px
    md: '1rem',      // 16px
    lg: '1.5rem',    // 24px
    xl: '2rem',      // 32px
    '2xl': '3rem',   // 48px
  },
  
  borderRadius: {
    sm: '0.25rem',   // 4px
    md: '0.5rem',    // 8px
    lg: '0.75rem',   // 12px
    xl: '1rem',      // 16px
  },
  
  // Z-index scale
  zIndex: {
    base: 0,
    dropdown: 1000,
    sticky: 1020,
    fixed: 1030,
    modalBackdrop: 1040,
    modal: 1050,
    popover: 1060,
    tooltip: 1070,
  },
} as const;

// Export individual color values for easy access
export const colors = theme.colors;
export const fonts = theme.fonts;
export const spacing = theme.spacing;
export const borderRadius = theme.borderRadius;
export const zIndex = theme.zIndex;

// Helper function to convert RGB to hex
export const rgbToHex = (r: number, g: number, b: number): string => {
  return `#${[r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('')}`;
};

// Helper function to convert hex to RGB
export const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};
