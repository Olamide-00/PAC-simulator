/** Design tokens from the PAC Petrol Official Brand Colour & UI Specification (Executive Evergreen). */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { primary: '#0B2924', secondary: '#174B3D', accent: '#D7C18A', 'accent-deep': '#B89A52' },
        surface: { primary: '#FFFFFF', secondary: '#F5F3EC' },
        ink: { DEFAULT: '#252A27', soft: '#77827B' },
        status: { success: '#237A50', warning: '#B7791F', error: '#C43D3D', info: '#3478B8', neutral: '#77827B' },
        line: '#E4E1D6',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: { card: '0 1px 2px rgba(11,41,36,.06), 0 1px 3px rgba(11,41,36,.04)' },
    },
  },
  plugins: [],
};
