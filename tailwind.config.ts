import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'burnt-orange': {
          100: '#FFF3E0',
          200: '#FFE0B2',
          300: '#DEB887',
          400: '#D2691E',
          500: '#BF5700',
          600: '#A0522D',
          700: '#8B4513',
          800: '#654321',
          900: '#3D2914',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui'],
        display: ['Space Grotesk', 'ui-sans-serif', 'system-ui'],
      },
    },
  },
  plugins: [],
};

export default config;
