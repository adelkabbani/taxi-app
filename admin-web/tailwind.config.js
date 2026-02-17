/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                obsidian: {
                    700: '#1a1a1d', // Lighter borders/elements
                    800: '#121214', // Card backgrounds
                    900: '#0a0a0c', // Main background
                    950: '#000000', // Deepest blacks
                },
                gold: {
                    400: '#FFD700', // Nano Gold (Active/Primary)
                    500: '#DAA520', // Dim Gold (Borders/Secondary)
                    600: '#B8860B', // Dark Gold
                    dim: 'rgba(218, 165, 32, 0.2)', // Glass tint
                },
                primary: {
                    // Keeping blue as a secondary functional color if needed, but gold is main
                    500: '#0ea5e9',
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
                display: ['Roboto', 'sans-serif'], // For headers if needed
            },
            animation: {
                'power-up': 'powerUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards',
                'fade-in': 'fadeIn 0.4s ease-out',
                'slide-in-right': 'slideInRight 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                'pulse-glow': 'pulseGlow 2s infinite',
            },
            keyframes: {
                powerUp: {
                    '0%': { opacity: '0', transform: 'translateY(15px) scale(0.96)' },
                    '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
                },
                fadeIn: {
                    '0%': { opacity: '0' },
                    '100%': { opacity: '1' },
                },
                slideInRight: {
                    '0%': { transform: 'translateX(100%)', opacity: '0' },
                    '100%': { transform: 'translateX(0)', opacity: '1' },
                },
                pulseGlow: {
                    '0%, 100%': { boxShadow: '0 0 5px rgba(255, 215, 0, 0.2)' },
                    '50%': { boxShadow: '0 0 15px rgba(255, 215, 0, 0.6)' },
                }
            },
            backdropBlur: {
                xs: '2px',
            }
        },
    },
    plugins: [],
}
