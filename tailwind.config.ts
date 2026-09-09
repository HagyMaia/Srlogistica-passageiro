import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/features/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        dark: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#1E293B',
          800: '#0F172A',
          900: '#0B1220',
          950: '#070D18',
        },
        brand: {
          DEFAULT: '#FFC800',
          primary: '#FFC800',
          hover: '#E5B400',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          300: '#FCD34D',
          400: '#FBBF24',
          500: '#FFC800',
          600: '#E5B400',
          700: '#B45309',
          800: '#92400E',
          900: '#78350F',
          950: '#451A03',
          dark: '#1A1A1A',
          surface: '#242424',
          border: '#333333',
        },
        status: {
          online: '#10B981',
          offline: '#64748B',
          busy: '#EF4444',
          warning: '#F59E0B',
          info: '#3B82F6',
        },
        success: {
          DEFAULT: '#10B981',
          500: '#10B981',
          400: '#34D399',
        },
        warn: {
          DEFAULT: '#F59E0B',
          500: '#F59E0B',
          400: '#FBBF24',
        },
        danger: {
          DEFAULT: '#EF4444',
          500: '#EF4444',
          400: '#F87171',
        }
      },
      boxShadow: {
        'sheet': '0 -4px 20px rgba(0, 0, 0, 0.25)',
        'floating': '0 4px 12px rgba(0, 0, 0, 0.3)',
      }
    },
  },
  plugins: [],
};
export default config;