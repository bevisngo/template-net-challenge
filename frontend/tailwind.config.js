/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: '#3333ff',
          dark: '#2222dd',
          light: '#eff0ff',
        },
        surface: '#f9fafe',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        input: '0 1px 4px rgba(0,0,0,0.06)',
        'input-focus': '0 0 0 3px rgba(51,51,255,0.08)',
      },
      maxWidth: {
        chat: '820px',
      },
    },
  },
  plugins: [],
}
