/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50:  '#eff6ff',
          100: '#dbeafe',
          200: '#bfdbfe',
          300: '#93c5fd',
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
          800: '#1e40af',
          900: '#1e3a8a',
        },
        sidebar: {
          DEFAULT: '#0f172a',
          border:  'rgba(255,255,255,0.07)',
          hover:   'rgba(255,255,255,0.06)',
          active:  'rgba(59,130,246,0.15)',
        },
      },
      borderOpacity: { 8: '0.08' },
      backgroundOpacity: { 8: '0.08' },
      boxShadow: {
        'card':   '0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.05)',
        'card-md':'0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.05)',
        'modal':  '0 24px 64px rgba(0,0,0,0.18), 0 8px 24px rgba(0,0,0,0.10)',
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
      animation: {
        shimmer: 'shimmer 1.6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
