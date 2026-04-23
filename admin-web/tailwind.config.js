/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'ink-black': {
                    700:  '#001122', // Slightly lighter for levels
                    800:  '#001d3d', // Prussian Blue
                    900:  '#000b1a', // Near Ink Black
                    950:  '#000814', // Ink Black
                },
                'regal-navy': {
                    DEFAULT: '#003566',
                    50:  '#e6f0ff',
                    100: '#cce1ff',
                    200: '#99c3ff',
                    300: '#66a5ff',
                    400: '#3387ff',
                    500: '#0069ff',
                    600: '#0054cc',
                    700: '#003566', // Original Regal Navy
                    800: '#00264d',
                    900: '#001833',
                },
                gold: {
                    400: '#ffc300', // School Bus Yellow
                    500: '#ffd60a', // Gold
                    600: '#eab308',
                    dim: 'rgba(255,195,0,0.08)',
                },
                status: {
                    success: '#10b981',
                    warning: '#ffc300', // Using School Bus Yellow
                    error:   '#f43f5e',
                    info:    '#003566', // Using Regal Navy
                },
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Roboto', 'sans-serif'],
            },
            animation: {
                'power-up':       'powerUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'fade-in':        'fadeIn 0.4s ease-out',
                'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'pulse-glow':     'pulseGlow 2s infinite',
            },
            keyframes: {
                powerUp: {
                    '0%':   { opacity: '0', transform: 'translateY(15px) scale(0.96)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                fadeIn: {
                    '0%':   { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideInRight: {
                    '0%':   { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)',    opacity: '1' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(234, 179, 8, 0.3)' },
                    '50%':      { boxShadow: '0 0 20px rgba(234, 179, 8, 0.6), 0 0 40px rgba(234, 179, 8, 0.2)' },
                },
            },
            backdropBlur: {
                xs: '2px',
            },
        },
    },
    plugins: [],
}
