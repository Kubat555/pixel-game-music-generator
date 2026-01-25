/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        pixel: ['"Press Start 2P"', 'monospace'],
        body: ['"VT323"', 'monospace'],
      },
      colors: {
        chip: {
          black: '#0F0F0F',
          darkgray: '#323232',
          gray: '#6B6B6B',
          lightgray: '#A0A0A0',
          white: '#FCFCFC',
          red: '#D82800',
          orange: '#FC7400',
          yellow: '#FCC400',
          lime: '#80D010',
          green: '#00A800',
          cyan: '#00A8A8',
          blue: '#0050F8',
          darkblue: '#0028A8',
          purple: '#9000F8',
          pink: '#F878F8',
          skin: '#FCB8A8',
        },
      },
      boxShadow: {
        'pixel': '4px 4px 0px 0px rgba(0,0,0,0.8)',
        'pixel-sm': '2px 2px 0px 0px rgba(0,0,0,0.8)',
        'pixel-inset': 'inset 2px 2px 0px 0px rgba(0,0,0,0.3)',
        'pixel-active': 'inset 4px 4px 0px 0px rgba(0,0,0,0.4)',
      },
      animation: {
        'blink': 'blink 1s step-end infinite',
        'bounce-pixel': 'bounce-pixel 0.5s ease-in-out infinite',
        'pulse-glow': 'pulse-glow 2s ease-in-out infinite',
        'playhead': 'playhead 0.1s linear',
      },
      keyframes: {
        blink: {
          '50%': { opacity: '0' },
        },
        'bounce-pixel': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'pulse-glow': {
          '0%, 100%': { boxShadow: '0 0 5px currentColor' },
          '50%': { boxShadow: '0 0 15px currentColor, 0 0 30px currentColor' },
        },
        playhead: {
          '0%': { opacity: '0.8' },
          '100%': { opacity: '1' },
        },
      },
      spacing: {
        'cell': '32px',
        'cell-sm': '24px',
        'cell-xs': '16px',
      },
      borderWidth: {
        '3': '3px',
      },
    },
  },
  plugins: [],
}
