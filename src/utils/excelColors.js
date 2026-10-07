// Paleta "ColorIndex" de Excel: 56 colores, en el mismo orden que Excel.
export const EXCEL_COLORS = [
  { index: 1, name: 'Negro', hex: '#000000' },
  { index: 2, name: 'Blanco', hex: '#FFFFFF' },
  { index: 3, name: 'Rojo', hex: '#FF0000' },
  { index: 4, name: 'Verde brillante', hex: '#00FF00' },
  { index: 5, name: 'Azul', hex: '#0000FF' },
  { index: 6, name: 'Amarillo', hex: '#FFFF00' },
  { index: 7, name: 'Rosa', hex: '#FF00FF' },
  { index: 8, name: 'Turquesa', hex: '#00FFFF' },
  { index: 9, name: 'Rojo oscuro', hex: '#800000' },
  { index: 10, name: 'Verde', hex: '#008000' },
  { index: 11, name: 'Azul oscuro', hex: '#000080' },
  { index: 12, name: 'Amarillo oscuro', hex: '#808000' },
  { index: 13, name: 'Violeta', hex: '#800080' },
  { index: 14, name: 'Verde azulado', hex: '#008080' },
  { index: 15, name: 'Gris 25%', hex: '#C0C0C0' },
  { index: 16, name: 'Gris 50%', hex: '#808080' },
  { index: 17, name: 'Azul pervinca', hex: '#9999FF' },
  { index: 18, name: 'Ciruela', hex: '#993366' },
  { index: 19, name: 'Marfil', hex: '#FFFFCC' },
  { index: 20, name: 'Turquesa claro', hex: '#CCFFFF' },
  { index: 21, name: 'Púrpura oscuro', hex: '#660066' },
  { index: 22, name: 'Coral', hex: '#FF8080' },
  { index: 23, name: 'Azul océano', hex: '#0066CC' },
  { index: 24, name: 'Azul hielo', hex: '#CCCCFF' },
  { index: 25, name: 'Azul marino', hex: '#000080' },
  { index: 26, name: 'Magenta', hex: '#FF00FF' },
  { index: 27, name: 'Amarillo intenso', hex: '#FFFF00' },
  { index: 28, name: 'Cian', hex: '#00FFFF' },
  { index: 29, name: 'Morado', hex: '#800080' },
  { index: 30, name: 'Granate', hex: '#800000' },
  { index: 31, name: 'Verde petróleo', hex: '#008080' },
  { index: 32, name: 'Azul rey', hex: '#0000FF' },
  { index: 33, name: 'Celeste', hex: '#00CCFF' },
  { index: 34, name: 'Turquesa pálido', hex: '#CCFFFF' },
  { index: 35, name: 'Verde claro', hex: '#CCFFCC' },
  { index: 36, name: 'Amarillo claro', hex: '#FFFF99' },
  { index: 37, name: 'Azul pálido', hex: '#99CCFF' },
  { index: 38, name: 'Rosa claro', hex: '#FF99CC' },
  { index: 39, name: 'Lavanda', hex: '#CC99FF' },
  { index: 40, name: 'Beige', hex: '#FFCC99' },
  { index: 41, name: 'Azul brillante', hex: '#3366FF' },
  { index: 42, name: 'Agua', hex: '#33CCCC' },
  { index: 43, name: 'Lima', hex: '#99CC00' },
  { index: 44, name: 'Dorado', hex: '#FFCC00' },
  { index: 45, name: 'Naranja claro', hex: '#FF9900' },
  { index: 46, name: 'Naranja', hex: '#FF6600' },
  { index: 47, name: 'Gris azulado', hex: '#666699' },
  { index: 48, name: 'Gris 40%', hex: '#969696' },
  { index: 49, name: 'Azul petróleo', hex: '#003366' },
  { index: 50, name: 'Verde mar', hex: '#339966' },
  { index: 51, name: 'Verde oscuro', hex: '#003300' },
  { index: 52, name: 'Verde oliva', hex: '#333300' },
  { index: 53, name: 'Marrón', hex: '#993300' },
  { index: 54, name: 'Ciruela oscuro', hex: '#993366' },
  { index: 55, name: 'Índigo', hex: '#333399' },
  { index: 56, name: 'Gris 80%', hex: '#333333' }
]

export function excelColor(index) {
  return EXCEL_COLORS.find((c) => c.index === Number(index)) || EXCEL_COLORS[0]
}

// Devuelve negro o blanco, según cuál se lea mejor sobre el color dado.
export function textOn(hex) {
  const h = (hex || '#000000').replace('#', '')
  const channel = (i) => {
    const v = parseInt(h.slice(i, i + 2), 16) / 255
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)
  }
  const luminance = 0.2126 * channel(0) + 0.7152 * channel(2) + 0.0722 * channel(4)
  return luminance > 0.179 ? '#070605' : '#ffffff'
}

// Colores sugeridos para equipos nuevos (los más distinguibles primero).
const TEAM_COLOR_ORDER = [3, 5, 10, 6, 46, 13, 8, 45, 53, 32, 14, 7, 44, 23, 9, 43, 18, 33, 55, 50]

export function nextTeamColor(usedIndexes = []) {
  const used = new Set(usedIndexes.map(Number))
  const free = TEAM_COLOR_ORDER.find((i) => !used.has(i))
  return free || TEAM_COLOR_ORDER[Math.floor(Math.random() * TEAM_COLOR_ORDER.length)]
}
