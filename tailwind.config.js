/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#070605',
        paper: '#ffffff',
        accent: '#6b7e8c',
        line: '#e4e4e4',
        mute: '#6e6e6e'
      },
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          '"Helvetica Neue"',
          'Arial',
          'sans-serif'
        ]
      },
      letterSpacing: {
        label: '0.14em'
      }
    }
  },
  plugins: []
}
