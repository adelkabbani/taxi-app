/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            fontFamily: {
                sans:    ['Inter', 'sans-serif'],
                heading: ['Outfit', 'sans-serif'],
            },
            colors: {
                'ink-black': {
                    700:  '#001122',
                    800:  '#001d3d',
                    900:  '#000b1a',
                    950:  '#000814',
                },
                'regal-navy': {
                    DEFAULT: '#003566',
                    700:     '#003566',
                },
                gold: {
                    400: '#ffd60a',
                    500: '#ffc300',
                    600: '#eab308',
                },
                status: {
                    success: '#10b981',
                    warning: '#f59e0b',
                    error:   '#f43f5e',
                    info:    '#22d3ee',
                },
            },
            animation: {
                'pulse-glow': 'pulseGlow 2s infinite',
            },
            keyframes: {
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(255,214,10,0.2)' },
                    '50%':      { boxShadow: '0 0 20px rgba(255,214,10,0.6)' },
                },
            },
        },
    },
    plugins: [],
}
