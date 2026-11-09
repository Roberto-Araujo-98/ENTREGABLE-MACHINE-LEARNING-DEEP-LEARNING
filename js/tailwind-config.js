// Configuración de Tailwind (CDN). Debe cargarse justo después de cdn.tailwindcss.com
tailwind.config = {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cyber: {
          bg: '#070b14',
          card: '#0e1726',
          border: 'rgba(0, 243, 255, 0.25)',
          green: '#00ff88',
          cyan: '#00f3ff',
          purple: '#b000ff',
          pink: '#ff0055',
          darker: '#04070d'
        }
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'monospace'],
        orbitron: ['Orbitron', 'sans-serif'],
        sans: ['"Plus Jakarta Sans"', 'sans-serif']
      }
    }
  }
};
