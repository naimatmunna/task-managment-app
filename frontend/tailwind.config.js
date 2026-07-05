/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          '-apple-system',
          'BlinkMacSystemFont',
          '"SF Pro Text"',
          'Inter',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'system-ui',
          'sans-serif',
        ],
      },

      // Refined type scale: tighter tracking + tuned leading as sizes grow.
      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem', letterSpacing: '0.01em' }],
        lg: ['1.125rem', { lineHeight: '1.75rem', letterSpacing: '-0.006em' }],
        xl: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.011em' }],
        '2xl': ['1.5rem', { lineHeight: '1.95rem', letterSpacing: '-0.019em' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem', letterSpacing: '-0.022em' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem', letterSpacing: '-0.025em' }],
        '5xl': ['3rem', { lineHeight: '1.05', letterSpacing: '-0.03em' }],
      },

      colors: {
        // Warm porcelain neutrals — cascades across every gray-* usage so the
        // whole app reads warm and premium rather than clinical cold gray.
        gray: {
          50: '#f8f7f6',
          100: '#f1efee',
          200: '#e6e3e0',
          300: '#d5d1cd',
          400: '#a8a39d',
          500: '#79746e',
          600: '#57524d',
          700: '#413d39',
          800: '#292624',
          900: '#1b1917',
          950: '#121110',
        },

        // "Iris" — a confident indigo-violet primary. Distinctive, professional.
        brand: {
          50: '#f5f4ff',
          100: '#ecebfe',
          200: '#dbd8fd',
          300: '#c1bbfb',
          400: '#a293f7',
          500: '#836bf1',
          600: '#6a4fe6',
          700: '#573dcb',
          800: '#4834a3',
          900: '#3d2f81',
          950: '#251b4d',
        },

        // Semantic scales (align with the chips used across the app).
        success: { 50: '#ecfdf5', 100: '#d1fae5', 500: '#10b981', 600: '#059669', 700: '#047857' },
        warning: { 50: '#fffbeb', 100: '#fef3c7', 500: '#f59e0b', 600: '#d97706', 700: '#b45309' },
        danger: { 50: '#fef2f2', 100: '#fee2e2', 500: '#ef4444', 600: '#dc2626', 700: '#b91c1c' },
        info: { 50: '#eff6ff', 100: '#dbeafe', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8' },
      },

      borderRadius: {
        xl: '0.875rem', // 14px — a touch softer than default
        '2xl': '1.125rem', // 18px
        '3xl': '1.5rem',
      },

      // Layered, warm-tinted elevation tuned for a light canvas.
      boxShadow: {
        xs: '0 1px 2px 0 rgb(28 25 23 / 0.04)',
        soft: '0 1px 2px 0 rgb(28 25 23 / 0.04), 0 2px 5px -1px rgb(28 25 23 / 0.05)',
        card: '0 1px 2px 0 rgb(28 25 23 / 0.04), 0 6px 16px -4px rgb(28 25 23 / 0.08)',
        pop: '0 6px 20px -6px rgb(28 25 23 / 0.14), 0 16px 40px -12px rgb(28 25 23 / 0.16)',
        lg: '0 12px 34px -8px rgb(28 25 23 / 0.18)',
        // Brand focus/hover glow.
        glow: '0 1px 2px 0 rgb(28 25 23 / 0.05), 0 6px 18px -4px rgb(106 79 230 / 0.35)',
        'inner-hairline': 'inset 0 0 0 1px rgb(28 25 23 / 0.04)',
      },

      transitionTimingFunction: {
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
        'out-back': 'cubic-bezier(0.34, 1.4, 0.64, 1)',
      },

      keyframes: {
        'fade-in': { from: { opacity: 0 }, to: { opacity: 1 } },
        'scale-in': {
          from: { opacity: 0, transform: 'scale(0.97)' },
          to: { opacity: 1, transform: 'scale(1)' },
        },
        'slide-up': {
          from: { opacity: 0, transform: 'translateY(8px)' },
          to: { opacity: 1, transform: 'translateY(0)' },
        },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-in': 'fade-in 160ms cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scale-in 170ms cubic-bezier(0.34, 1.4, 0.64, 1)',
        'slide-up': 'slide-up 240ms cubic-bezier(0.2, 0, 0, 1)',
      },
    },
  },
  plugins: [],
};
