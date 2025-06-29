const colors = require('tailwindcss/colors');
const defaultTheme = require('tailwindcss/defaultTheme');
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/globals.css',
  ],
  theme: {
    extend: {
      colors: {
        // Light Mode Defaults
        primary: '#0066CC', // Electric Blue
        'primary-foreground': '#FFFFFF', // White text for primary
        secondary: '#008080', // Deep Teal
        'secondary-foreground': '#171717', // Dark text for teal
        background: '#F5F5F5', // Soft Gray (Light mode background)
        foreground: '#171717', // Default text (Dark)
        input: '#D1D5DB', // Border color for inputs (gray-300)
        ring: '#0066CC', // Focus ring color (same as primary)
        
        // Accent colors for hover states, etc.
        accent: '#DBEAFE', // Light blue (blue-100)
        'accent-foreground': '#1F2937', // Dark text for accent (gray-800)

        // Status colors (adjusted for contrast >= 4.5:1 against background)
        danger: '#DC2626', // Red-600
        'danger-foreground': '#171717', // Dark text for danger background
        success: '#059669', // Green-600
        'success-foreground': '#171717', // Dark text for success background

        // Dark Mode Basics (can be expanded)
        'dark-background': '#111827', // gray-900
        'dark-foreground': '#D1D5DB', // gray-300

        // Sidebar specific colors from globals.css
        'sidebar-background': 'hsl(var(--sidebar-background))',
        'sidebar-foreground': 'hsl(var(--sidebar-foreground))',
        'sidebar-primary': 'hsl(var(--sidebar-primary))',
        'sidebar-primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
        'sidebar-accent': 'hsl(var(--sidebar-accent))',
        'sidebar-accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
        'sidebar-border': 'hsl(var(--sidebar-border))',
        'sidebar-ring': 'hsl(var(--sidebar-ring))',

        // Existing aliases/utility colors (keep or adjust as needed)
        'gray-bg': '#F5F5F5', // Keep for consistency if used elsewhere
      },

      fontFamily: {
        sans: ['var(--font-inter)'],
        mono: ['var(--font-geist-mono)'],
      },
      screens: {
        'sm': '640px',
        'md': '768px',
        'lg': '1024px',
        'xl': '1280px',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
} 