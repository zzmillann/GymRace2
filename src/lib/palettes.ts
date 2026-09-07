/**
 * Paletas de la app. Cada una define las superficies (tokens semánticos) y los
 * tres halos de color del fondo.
 *
 * Los mismos valores se usan en dos sitios:
 *  - globals.css, vía [data-palette="id"], para pintar la app de verdad
 *  - la vista previa del selector, que los lee de aquí para dibujar la maqueta
 *
 * Si añades una paleta, añádela también al bloque [data-palette] de globals.css.
 */

export interface Palette {
  id: string;
  name: string;
  app: string;        // fondo
  surface: string;    // tarjetas (solo referencia; en la app se usa cristal)
  content: string;    // texto
  muted: string;      // texto atenuado
  g1: string;         // halo superior izquierdo
  g2: string;         // halo superior derecho
  g3: string;         // halo inferior
  accent: string;     // color de acento sugerido
}

export const PALETTES: Palette[] = [
  {
    id: 'aurora',
    name: 'Aurora',
    app: '#191a3d', surface: '#2a2b52', content: '#f2f2f9', muted: '#9191b4',
    g1: 'rgba(124, 92, 255, 0.60)', g2: 'rgba(186, 92, 235, 0.42)', g3: 'rgba(70, 90, 220, 0.50)',
    accent: '#10b981',
  },
  {
    id: 'ocean',
    name: 'Océano',
    app: '#0d1f33', surface: '#173047', content: '#eef6fb', muted: '#8aa6bd',
    g1: 'rgba(34, 149, 224, 0.55)', g2: 'rgba(20, 205, 200, 0.38)', g3: 'rgba(24, 78, 160, 0.55)',
    accent: '#22d3ee',
  },
  {
    id: 'sunset',
    name: 'Atardecer',
    app: '#2b1330', surface: '#43204a', content: '#fdf2f8', muted: '#c095b8',
    g1: 'rgba(255, 122, 89, 0.52)', g2: 'rgba(236, 72, 153, 0.45)', g3: 'rgba(129, 60, 180, 0.55)',
    accent: '#f59e0b',
  },
  {
    id: 'forest',
    name: 'Bosque',
    app: '#0d2320', surface: '#173a34', content: '#effaf5', muted: '#87ab9f',
    g1: 'rgba(16, 185, 129, 0.48)', g2: 'rgba(45, 212, 191, 0.35)', g3: 'rgba(14, 90, 110, 0.55)',
    accent: '#34d399',
  },
  {
    id: 'cherry',
    name: 'Cereza',
    app: '#2a0f22', surface: '#421a33', content: '#fff1f5', muted: '#c193a8',
    g1: 'rgba(244, 63, 94, 0.50)', g2: 'rgba(217, 70, 239, 0.40)', g3: 'rgba(120, 40, 110, 0.55)',
    accent: '#fb7185',
  },
  {
    id: 'graphite',
    name: 'Grafito',
    app: '#141417', surface: '#232329', content: '#f4f4f5', muted: '#8b8b95',
    g1: 'rgba(120, 120, 140, 0.28)', g2: 'rgba(90, 100, 130, 0.22)', g3: 'rgba(60, 60, 80, 0.35)',
    accent: '#a1a1aa',
  },
  {
    id: 'mango',
    name: 'Mango',
    app: '#2b1a0d', surface: '#432a16', content: '#fff7ed', muted: '#c2a184',
    g1: 'rgba(251, 146, 60, 0.52)', g2: 'rgba(250, 204, 21, 0.35)', g3: 'rgba(190, 60, 40, 0.48)',
    accent: '#fbbf24',
  },
  {
    id: 'violet',
    name: 'Violeta',
    app: '#1c1030', surface: '#2e1c4d', content: '#f5f0ff', muted: '#a894c9',
    g1: 'rgba(168, 85, 247, 0.55)', g2: 'rgba(99, 102, 241, 0.45)', g3: 'rgba(59, 30, 120, 0.55)',
    accent: '#a78bfa',
  },
];

export const DEFAULT_PALETTE = 'aurora';

export const getPalette = (id?: string) =>
  PALETTES.find((p) => p.id === id) || PALETTES[0];
