/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./src/**/*.{js,jsx,ts,tsx}",
    "./public/index.html"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        'pe-caption': ['0.6875rem', { lineHeight: '1.45', letterSpacing: '0.02em' }],
        'pe-label': ['0.75rem', { lineHeight: '1.45' }],
        'pe-body': ['0.875rem', { lineHeight: '1.6' }],
        'pe-section': ['1.125rem', { lineHeight: '1.35', letterSpacing: '-0.02em' }],
        'pe-title': ['clamp(1.5rem, 2vw, 2rem)', { lineHeight: '1.15', letterSpacing: '-0.035em' }],
        'pe-display': ['clamp(2.5rem, 5vw, 5rem)', { lineHeight: '0.98', letterSpacing: '-0.055em' }],
      },
      spacing: {
        'pe-control-sm': 'var(--pe-control-sm)',
        'pe-control': 'var(--pe-control)',
        'pe-control-lg': 'var(--pe-control-lg)',
        'pe-icon-sm': '2rem',
        'pe-icon': '2.75rem',
        'pe-icon-lg': '3rem',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'pe-sm': 'var(--pe-radius-sm)',
        'pe-md': 'var(--pe-radius-md)',
        'pe-lg': 'var(--pe-radius-lg)',
        'pe-xl': 'var(--pe-radius-xl)'
      },
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))'
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))'
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))'
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))'
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))'
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))'
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))'
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        pe: {
          canvas: 'var(--pe-canvas)',
          surface: 'var(--pe-surface)',
          elevated: 'var(--pe-surface-elevated)',
          soft: 'var(--pe-surface-soft)',
          border: 'var(--pe-border)',
          'border-strong': 'var(--pe-border-strong)',
          text: 'var(--pe-text)',
          muted: 'var(--pe-text-muted)',
          subtle: 'var(--pe-text-subtle)',
          brand: 'var(--pe-brand)',
          blue: 'var(--pe-blue)',
          profit: 'var(--pe-profit)',
          risk: 'var(--pe-risk)',
          warning: 'var(--pe-warning)'
        },
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))'
        }
      },
      boxShadow: {
        'pe-card': '0 16px 48px rgba(0, 0, 0, 0.22)',
        'pe-focus': '0 0 0 3px rgba(124, 77, 255, 0.24)'
      },
      keyframes: {
        'accordion-down': {
          from: {
            height: '0'
          },
          to: {
            height: 'var(--radix-accordion-content-height)'
          }
        },
        'accordion-up': {
          from: {
            height: 'var(--radix-accordion-content-height)'
          },
          to: {
            height: '0'
          }
        }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
