// Exportación a PDF. Se carga solo cuando se pulsa un botón de exportar.
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { SPORTS } from './sports'
import { computeAllStandings } from './standings'
import { formatDay, groupByDay } from './schedule'

const INK = [7, 6, 5]
const ACCENT = [107, 126, 140]
const MUTE = [110, 110, 110]
const LINE = [215, 215, 215]
const SOFT = [238, 240, 241]
const M = 14 // margen
const W = 210
const H = 297

// Las fuentes estándar del PDF solo entienden Latin-1: se quita lo demás para no ver símbolos raros.
const s = (v) =>
  String(v ?? '')
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\u0000-ÿ–—•…€]/g, '')

const cap = (t) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t)
const dayText = (d) => (d ? cap(formatDay(d)) : 'Sin fecha')
const today = () => new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })
const fileSafe = (t) =>
  s(t)
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 60)

// ---------- Imágenes ----------

const imageCache = new Map()
async function toPng(src) {
  if (!src) return null
  if (imageCache.has(src)) return imageCache.get(src)
  const result = await new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || 1
        canvas.height = img.naturalHeight || 1
        const ctx = canvas.getContext('2d')
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0)
        resolve({ data: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height })
      } catch {
        resolve(null)
      }
    }
    img.onerror = () => resolve(null)
    img.src = src
  })
  imageCache.set(src, result)
  return result
}

function putImage(doc, img, x, y, box) {
  if (!img) return
  const ratio = Math.min(box / img.w, box / img.h)
  const w = img.w * ratio
  const h = img.h * ratio
  try {
    doc.addImage(img.data, 'PNG', x + (box - w) / 2, y + (box - h) / 2, w, h)
  } catch {
    /* si una imagen falla, el PDF sale igual sin ella */
  }
}

// Escudo de un equipo: su logo, o un círculo con sus iniciales.
async function drawBadge(doc, team, x, y, size) {
  const img = team?.logo ? await toPng(team.logo) : null
  if (img) {
    putImage(doc, img, x, y, size)
    return
  }
  const hex = (team?.color || '#070605').replace('#', '')
  const rgb = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) || 0)
  doc.setFillColor(...rgb)
  doc.circle(x + size / 2, y + size / 2, size / 2, 'F')
  const lum = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255
  doc.setTextColor(lum > 0.55 ? 7 : 255, lum > 0.55 ? 6 : 255, lum > 0.55 ? 5 : 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(size * 1.1)
  const words = (team?.name || '?').trim().split(/\s+/)
  const ini = (team?.shortName || (words.length > 1 ? words[0][0] + words[1][0] : words[0].slice(0, 3))).toUpperCase().slice(0, 3)
  doc.text(s(ini), x + size / 2, y + size / 2 + size * 0.14, { align: 'center' })
}

// ---------- Estructura común ----------

async function startDoc(tournament, title, subtitle) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  doc.setProperties({ title: s(`${title} - ${tournament.name}`), creator: 'Encancha.ec' })

  const logo = tournament.logo ? await toPng(tournament.logo) : await toPng('/logo.png')
  if (logo) putImage(doc, logo, M, 12, 16)
  else await drawBadge(doc, tournament, M, 12, 16)

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  const nameLines = doc.splitTextToSize(s(tournament.name), W - M * 2 - 24)
  doc.text(nameLines.slice(0, 2), M + 21, 18)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)
  doc.setTextColor(...MUTE)
  doc.text(s(`${SPORTS[tournament.sport]?.label || ''}${tournament.venue ? '  -  ' + tournament.venue : ''}`), M + 21, 18 + nameLines.slice(0, 2).length * 5.2)

  doc.setDrawColor(...ACCENT)
  doc.setLineWidth(0.6)
  doc.line(M, 31, W - M, 31)

  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text(s(title).toUpperCase(), M, 39)
  let y = 39
  if (subtitle) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9.5)
    doc.setTextColor(...MUTE)
    doc.text(s(subtitle), M, 44.5)
    y = 44.5
  }
  return { doc, y: y + 7 }
}

function finish(doc, filename) {
  const pages = doc.getNumberOfPages()
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i)
    doc.setDrawColor(...LINE)
    doc.setLineWidth(0.2)
    doc.line(M, H - 14, W - M, H - 14)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTE)
    doc.text(`Encancha.ec  -  generado el ${today()}`, M, H - 9)
    doc.text(`Página ${i} de ${pages}`, W - M, H - 9, { align: 'right' })
  }
  doc.save(filename)
}

function ensure(doc, y, need) {
  if (y + need > H - 18) {
    doc.addPage()
    return 20
  }
  return y
}

function heading(doc, y, text) {
  y = ensure(doc, y, 16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10)
  doc.setTextColor(...INK)
  doc.text(s(text).toUpperCase(), M, y)
  doc.setDrawColor(...INK)
  doc.setLineWidth(0.3)
  doc.line(M, y + 1.8, W - M, y + 1.8)
  return y + 6
}

const baseTable = {
  theme: 'plain',
  margin: { left: M, right: M, bottom: 18 },
  styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 1.8, textColor: INK, lineColor: LINE, lineWidth: 0 },
  headStyles: { fillColor: INK, textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
  alternateRowStyles: { fillColor: [247, 248, 248] }
}

function table(doc, y, opts) {
  autoTable(doc, { ...baseTable, startY: y, ...opts })
  return (doc.lastAutoTable?.finalY ?? y + 10) + 6
}

// ---------- Datos de apoyo ----------

const nameOf = (id, list) => list.find((x) => x.id === id)?.name || 'Equipo eliminado'

function standingsColumns(rules) {
  const draws = rules.standings.allowDraws
  const single = rules.scoring.actions.length === 1 && rules.scoring.actions[0].points === 1
  const head = ['#', 'Equipo', 'PJ', 'G', ...(draws ? ['E'] : []), 'P', single ? 'GF' : 'PF', single ? 'GC' : 'PC', 'DIF', 'PTS']
  const body = (r) => [
    r.pos,
    s(r.team.name),
    r.pj,
    r.g,
    ...(draws ? [r.e] : []),
    r.p,
    r.gf,
    r.gc,
    r.dif > 0 ? `+${r.dif}` : r.dif,
    r.pts
  ]
  return { head, body, draws }
}

function standingsTable(doc, y, title, rows, rules, { highlightIds = [], qualifiers = 0 } = {}) {
  y = heading(doc, y, title)
  const { head, body, draws } = standingsColumns(rules)
  const hi = new Set(highlightIds)
  const center = {}
  for (let i = 2; i < head.length; i++) center[i] = { halign: 'center', cellWidth: 11 }
  center[0] = { halign: 'center', cellWidth: 9 }
  center[head.length - 1] = { halign: 'center', cellWidth: 12, fontStyle: 'bold' }
  void draws
  return table(doc, y, {
    head: [head],
    body: rows.map(body),
    columnStyles: center,
    didParseCell: (d) => {
      if (d.section !== 'body') return
      const row = rows[d.row.index]
      if (hi.has(row.team.id)) {
        d.cell.styles.fillColor = SOFT
        d.cell.styles.fontStyle = 'bold'
      }
      if (qualifiers > 0 && row.pos <= qualifiers && d.column.index === 0) d.cell.styles.fontStyle = 'bold'
    },
    didDrawCell: (d) => {
      if (qualifiers > 0 && d.section === 'body' && d.column.index === 0 && rows[d.row.index].pos <= qualifiers) {
        doc.setFillColor(...ACCENT)
        doc.rect(d.cell.x, d.cell.y, 0.9, d.cell.height, 'F')
      }
    }
  })
}

function playerStats(events) {
  const stats = {}
  const get = (id) => (stats[id] = stats[id] || { pts: 0, fouls: 0, yellow: 0, red: 0, in: false })
  events.forEach((e) => {
    if (!e.playerId && e.type !== 'sub') return
    if (e.type === 'score' && !e.own) get(e.playerId).pts += e.points || 0
    if (e.type === 'foul') get(e.playerId).fouls += 1
    if (e.type === 'yellow') get(e.playerId).yellow += 1
    if (e.type === 'red') get(e.playerId).red += 1
    if (e.type === 'sub' && e.playerId) get(e.playerId).in = true
  })
  return stats
}

// ---------- Informe del partido ----------

export async function exportMatchReport({ tournament, match, teams, players, groups, matches }) {
  const home = teams.find((t) => t.id === match.homeId)
  const away = teams.find((t) => t.id === match.awayId)
  const rules = tournament.rules
  const events = match.events || []
  const group = groups.find((g) => g.id === match.groupId)
  const sub = [match.roundLabel, group?.name, match.date && dayText(match.date), match.time, match.court].filter(Boolean).join('  -  ')

  const { doc, y: y0 } = await startDoc(tournament, 'Informe del partido', sub)
  let y = y0

  // Marcador
  const started = match.status === 'finished' || match.status === 'live'
  const bx = M
  const cx = W / 2
  await drawBadge(doc, home, bx + 6, y + 2, 20)
  await drawBadge(doc, away, W - M - 26, y + 2, 20)
  doc.setTextColor(...INK)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(30)
  doc.text(started ? `${match.homeScore ?? 0}  -  ${match.awayScore ?? 0}` : 'vs', cx, y + 17, { align: 'center' })
  doc.setFontSize(10)
  const nameW = 52
  doc.text(doc.splitTextToSize(s(home?.name || ''), nameW).slice(0, 2), bx + 16, y + 28, { align: 'center' })
  doc.text(doc.splitTextToSize(s(away?.name || ''), nameW).slice(0, 2), W - M - 16, y + 28, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(...MUTE)
  let status = match.status === 'finished' ? 'Partido finalizado' : match.status === 'live' ? 'Partido en juego' : 'Partido programado'
  if (match.penalties) status += `  -  Penales ${match.penalties.home} - ${match.penalties.away}`
  doc.text(status, cx, y + 24, { align: 'center' })
  if (match.status === 'finished') {
    const hs = match.homeScore ?? 0
    const as = match.awayScore ?? 0
    const wid = match.winnerId || (hs > as ? home.id : as > hs ? away.id : null)
    const w = wid ? nameOf(wid, teams) : null
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(...INK)
    doc.text(w ? `Ganador: ${s(w)}` : 'Empate', cx, y + 30, { align: 'center' })
  }
  y += 40
  doc.setDrawColor(...LINE)
  doc.line(M, y, W - M, y)
  y += 7

  const stats = playerStats(events)
  const pname = (id) => {
    const p = players.find((x) => x.id === id)
    return p ? `${p.number}. ${p.name}` : 'Sin identificar'
  }

  // Anotaciones
  const scoreEvents = events.filter((e) => e.type === 'score')
  if (scoreEvents.length > 0) {
    y = heading(doc, y, rules.scoring.actions.length === 1 ? 'Goleadores' : 'Anotaciones')
    const line = (e) => {
      const base = e.playerId ? pname(e.playerId) : 'Sin identificar'
      const tag = e.own ? ' (en contra)' : e.points > 1 || rules.scoring.actions.length > 1 ? ` (${e.actionName})` : ''
      return `${s(base)}${tag}  ${e.label}`
    }
    const credited = (e) => (e.own ? (e.teamId === home.id ? away.id : home.id) : e.teamId)
    const hl = scoreEvents.filter((e) => credited(e) === home.id).map(line)
    const al = scoreEvents.filter((e) => credited(e) === away.id).map(line)
    const rows = Array.from({ length: Math.max(hl.length, al.length) }, (_, i) => [hl[i] || '', al[i] || ''])
    y = table(doc, y, { head: [[s(home.name), s(away.name)]], body: rows, columnStyles: { 0: { cellWidth: (W - M * 2) / 2 }, 1: { cellWidth: (W - M * 2) / 2 } } })
  }

  // Disciplina y cambios
  const disc = events.filter((e) => e.type === 'yellow' || e.type === 'red')
  if (disc.length > 0) {
    y = heading(doc, y, 'Tarjetas')
    y = table(doc, y, {
      head: [['Minuto', 'Tarjeta', 'Jugador', 'Equipo']],
      body: disc.map((e) => [e.label, e.type === 'yellow' ? 'Amarilla' : 'Roja', s(pname(e.playerId)), s(nameOf(e.teamId, teams))]),
      columnStyles: { 0: { cellWidth: 30 }, 1: { cellWidth: 24 } }
    })
  }
  const subs = events.filter((e) => e.type === 'sub')
  if (subs.length > 0) {
    y = heading(doc, y, 'Cambios')
    y = table(doc, y, {
      head: [['Minuto', 'Entra', 'Sale', 'Equipo']],
      body: subs.map((e) => [e.label, s(pname(e.playerId)), s(pname(e.playerOutId)), s(nameOf(e.teamId, teams))]),
      columnStyles: { 0: { cellWidth: 30 } }
    })
  }

  // Alineaciones y estadísticas por jugador
  const start = match.live?.startLineup || { home: [], away: [] }
  const noun = rules.scoring.actions.length === 1 && rules.scoring.actions[0].points === 1 ? 'Goles' : 'Pts'
  const showFouls = rules.discipline.foulsEnabled
  const showCards = rules.discipline.cardsEnabled
  for (const [team, startIds] of [[home, start.home || []], [away, start.away || []]]) {
    const roster = players.filter((p) => p.teamId === team.id).sort((a, b) => a.number - b.number)
    if (roster.length === 0) continue
    y = heading(doc, y, `Jugadores - ${team.name}`)
    const head = ['N', 'Jugador', 'Pos.', 'Rol', noun, ...(showFouls ? ['Faltas'] : []), ...(showCards ? ['TA', 'TR'] : [])]
    const body = roster.map((p) => {
      const st = stats[p.id] || { pts: 0, fouls: 0, yellow: 0, red: 0 }
      const role = startIds.includes(p.id) ? 'Titular' : st.in ? 'Ingresó' : 'Banca'
      return [p.number, s(p.name), s(p.position || ''), role, st.pts || '', ...(showFouls ? [st.fouls || ''] : []), ...(showCards ? [st.yellow || '', st.red || ''] : [])]
    })
    const col = { 0: { cellWidth: 10, halign: 'center' }, 2: { cellWidth: 30 }, 3: { cellWidth: 20 } }
    for (let i = 4; i < head.length; i++) col[i] = { cellWidth: 14, halign: 'center' }
    y = table(doc, y, {
      head: [head],
      body,
      columnStyles: col,
      didParseCell: (d) => {
        if (d.section === 'body' && d.column.index === 3 && d.cell.raw === 'Titular') d.cell.styles.fontStyle = 'bold'
      }
    })
  }

  // Posiciones del grupo con los dos equipos resaltados
  if (match.stage !== 'knockout' && tournament.format.type !== 'knockout') {
    const tables = computeAllStandings({ tournament, groups, teams, matches })
    const mine = tables.find((t) => t.rows.some((r) => r.team.id === home.id)) || tables[0]
    if (mine) {
      y = ensure(doc, y, 50)
      y = standingsTable(doc, y, `Posiciones - ${mine.name}`, mine.rows, rules, {
        highlightIds: [home.id, away.id],
        qualifiers: tournament.format.type === 'groups_playoffs' ? tournament.format.qualifiersPerGroup : 0
      })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.setTextColor(...MUTE)
      doc.text('Tabla actualizada con todos los partidos jugados hasta ahora. Los equipos de este partido van resaltados.', M, y - 2)
      y += 4
    }
  }

  // Cronología
  if (events.length > 0) {
    y = heading(doc, y, 'Cronología')
    const text = (e) => {
      if (e.type === 'score') return `${e.actionName}${e.own ? ' en contra' : ''} - ${pname(e.playerId)}`
      if (e.type === 'sub') return `Cambio - entra ${pname(e.playerId)}, sale ${pname(e.playerOutId)}`
      if (e.type === 'timeout') return 'Tiempo muerto'
      const label = { foul: 'Falta', yellow: 'Tarjeta amarilla', red: 'Tarjeta roja' }[e.type]
      return `${label} - ${pname(e.playerId)}`
    }
    y = table(doc, y, {
      head: [['Minuto', 'Evento', 'Equipo']],
      body: events.map((e) => [e.label, s(text(e)), s(nameOf(e.teamId, teams))]),
      columnStyles: { 0: { cellWidth: 38 }, 2: { cellWidth: 42 } }
    })
  }

  finish(doc, `informe-${fileSafe(home?.name)}-vs-${fileSafe(away?.name)}.pdf`)
}

// ---------- Clasificación y fase final ----------

export async function exportStandings({ tournament, groups, teams, matches }) {
  const { doc, y: y0 } = await startDoc(tournament, 'Tabla de posiciones')
  let y = y0
  const tables = computeAllStandings({ tournament, groups, teams, matches })
  const q = tournament.format.type === 'groups_playoffs' ? tournament.format.qualifiersPerGroup : 0
  tables.forEach((t) => {
    y = ensure(doc, y, 40)
    y = standingsTable(doc, y, t.name, t.rows, tournament.rules, { qualifiers: q })
  })
  const ko = matches.filter((m) => m.stage === 'knockout')
  if (ko.length > 0) {
    y = ensure(doc, y, 40)
    y = heading(doc, y, 'Fase final')
    const rounds = [...new Set(ko.map((m) => `${m.round || 1}|${m.roundLabel || ''}`))].sort(
      (a, b) => parseInt(a, 10) - parseInt(b, 10) || (a.includes('Tercer') ? 1 : 0) - (b.includes('Tercer') ? 1 : 0)
    )
    const body = []
    rounds.forEach((key) =>
      ko.filter((m) => `${m.round || 1}|${m.roundLabel || ''}` === key).forEach((m) => {
        const done = m.status === 'finished'
        body.push([
          s(m.roundLabel || 'Ronda'),
          s(nameOf(m.homeId, teams)),
          done ? `${m.homeScore} - ${m.awayScore}${m.penalties ? ` (pen. ${m.penalties.home}-${m.penalties.away})` : ''}` : 'vs',
          s(nameOf(m.awayId, teams))
        ])
      })
    )
    y = table(doc, y, { head: [['Ronda', 'Local', 'Resultado', 'Visitante']], body, columnStyles: { 2: { halign: 'center', cellWidth: 38 } } })
  }
  if (tables.length === 0 && ko.length === 0) {
    doc.setFontSize(10)
    doc.text('Todavía no hay partidos jugados.', M, y)
  }
  finish(doc, `clasificacion-${fileSafe(tournament.name)}.pdf`)
}

// ---------- Resultados y calendario ----------

function matchRows(list, teams, groups, withScore) {
  return list.map((m) => {
    const g = groups.find((x) => x.id === m.groupId)
    const done = m.status === 'finished' || m.status === 'live'
    return [
      m.time || '',
      s([m.roundLabel, g?.name].filter(Boolean).join(' - ')),
      s(nameOf(m.homeId, teams)),
      done ? `${m.homeScore ?? 0} - ${m.awayScore ?? 0}` : 'vs',
      s(nameOf(m.awayId, teams)),
      s(m.court || ''),
      ...(withScore ? [m.status === 'finished' ? 'Final' : m.status === 'live' ? 'En juego' : ''] : [])
    ]
  })
}

async function matchesPdf({ tournament, groups, teams, list, title, filename, withStatus }) {
  const { doc, y: y0 } = await startDoc(tournament, title)
  let y = y0
  if (list.length === 0) {
    doc.setFontSize(10)
    doc.setTextColor(...MUTE)
    doc.text('No hay partidos para mostrar.', M, y)
  }
  groupByDay(list).forEach((day) => {
    y = ensure(doc, y, 30)
    y = heading(doc, y, dayText(day.date))
    const head = ['Hora', 'Fase', 'Local', 'Res.', 'Visitante', 'Cancha', ...(withStatus ? ['Estado'] : [])]
    y = table(doc, y, {
      head: [head],
      body: matchRows(day.matches, teams, groups, withStatus),
      columnStyles: { 0: { cellWidth: 13 }, 3: { halign: 'center', cellWidth: 17, fontStyle: 'bold' } }
    })
  })
  finish(doc, filename)
}

export const exportResults = ({ tournament, groups, teams, matches }) =>
  matchesPdf({
    tournament,
    groups,
    teams,
    list: matches.filter((m) => m.status === 'finished'),
    title: 'Lista de resultados',
    filename: `resultados-${fileSafe(tournament.name)}.pdf`
  })

export const exportCalendar = ({ tournament, groups, teams, matches }) =>
  matchesPdf({
    tournament,
    groups,
    teams,
    list: matches,
    title: 'Calendario de partidos',
    filename: `calendario-${fileSafe(tournament.name)}.pdf`,
    withStatus: true
  })

// ---------- Equipos y jugadores ----------

export async function exportTeams({ tournament, groups, teams, players }) {
  const { doc, y: y0 } = await startDoc(tournament, 'Equipos y jugadores', `${teams.length} equipos - ${players.length} jugadores`)
  let y = y0
  const groupName = (id) => groups.find((g) => g.id === id)?.name
  const ordered = [...teams].sort((a, b) => (groupName(a.groupId) || 'zz').localeCompare(groupName(b.groupId) || 'zz') || a.name.localeCompare(b.name, 'es'))
  for (const team of ordered) {
    const roster = players.filter((p) => p.teamId === team.id).sort((a, b) => a.number - b.number)
    y = ensure(doc, y, 30)
    await drawBadge(doc, team, M, y - 4, 9)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(...INK)
    doc.text(s(team.name), M + 12, y + 1)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(...MUTE)
    doc.text(s([groupName(team.groupId), team.coach && `DT: ${team.coach}`, `${roster.length} jugadores`].filter(Boolean).join('  -  ')), M + 12, y + 5.5)
    y += 9
    y = roster.length
      ? table(doc, y, {
          head: [['N', 'Jugador', 'Posición']],
          body: roster.map((p) => [p.number, s(p.name), s(p.position || '')]),
          columnStyles: { 0: { cellWidth: 12, halign: 'center' } }
        })
      : y + 4
  }
  finish(doc, `equipos-${fileSafe(tournament.name)}.pdf`)
}
