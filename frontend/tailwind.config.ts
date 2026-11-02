import animate from 'tailwindcss-animate';
import type { Config } from 'tailwindcss';

// Les couleurs pointent vers les variables CSS de src/index.css (thèmes clair et sombre).
const v = (name: string) => `var(--${name})`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: v('bg'),
        surface: v('surface'),
        'surface-2': v('surface-2'),
        ink: v('ink'),
        muted: v('muted'),
        line: v('line'),
        track: v('track'),
        accent: { DEFAULT: v('accent'), text: v('accent-text'), on: v('on-accent') },
        side: {
          DEFAULT: v('side'),
          ink: v('side-ink'),
          muted: v('side-muted'),
          active: v('side-active'),
          line: v('side-line'),
        },
        bar: {
          bleu: v('bar-bleu'),
          vert: v('bar-vert'),
          rouge: v('bar-rouge'),
          gris: v('bar-gris'),
        },
        // Noms attendus par les composants shadcn/ui
        background: v('bg'),
        foreground: v('ink'),
        border: v('line'),
        input: v('line'),
        ring: v('accent'),
        primary: { DEFAULT: v('accent'), foreground: v('on-accent') },
      },
      fontFamily: {
        sans: ['Barlow', 'system-ui', 'sans-serif'],
        display: ['"Barlow Condensed"', 'Barlow', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '6px',
        btn: '4px',
      },
      minHeight: { cible: '44px' },
      minWidth: { cible: '44px' },
    },
  },
  plugins: [animate],
} satisfies Config;
