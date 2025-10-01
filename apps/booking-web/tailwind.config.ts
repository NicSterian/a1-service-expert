import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          orange: '#ff7a00',
          black: '#181818',
          white: '#ffffff'
        }
      }
    }
  },
  plugins: []
};

export default config;
