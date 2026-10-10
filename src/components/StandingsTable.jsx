import TeamBadge from './TeamBadge'

// Tabla de posiciones de un grupo. "qualifiers" marca a los que pasan a la fase final.
export default function StandingsTable({ title, rows, rules, qualifiers = 0, highlightIds = [] }) {
  const draws = rules.standings.allowDraws
  const hi = new Set(highlightIds)
  const head = 'px-1.5 py-2 text-center text-[11px] font-semibold uppercase tracking-label text-mute'
  const cell = 'px-1.5 py-2.5 text-center text-[13px] tabular-nums'

  return (
    <section>
      {title && <h3 className="eyebrow mb-2">{title}</h3>}
      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-4 py-5 text-sm text-mute">Sin equipos todavía.</p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line">
          <table className="w-full min-w-[360px] border-collapse">
            <thead>
              <tr className="border-b border-line">
                <th className={`${head} w-8 pl-3 text-left`}>#</th>
                <th className={`${head} text-left`}>Equipo</th>
                <th className={head}>PJ</th>
                <th className={head}>G</th>
                {draws && <th className={head}>E</th>}
                <th className={head}>P</th>
                <th className={head}>{rules.scoring.actions.length === 1 && rules.scoring.actions[0].points === 1 ? 'GF' : 'PF'}</th>
                <th className={head}>{rules.scoring.actions.length === 1 && rules.scoring.actions[0].points === 1 ? 'GC' : 'PC'}</th>
                <th className={head}>DIF</th>
                <th className={`${head} pr-3`}>PTS</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const q = qualifiers > 0 && r.pos <= qualifiers
                return (
                  <tr
                    key={r.team.id}
                    className={`border-b border-line last:border-b-0 ${hi.has(r.team.id) ? 'bg-neutral-100' : ''}`}
                  >
                    <td className={`${cell} pl-3 text-left font-semibold ${q ? 'border-l-2 border-accent' : ''}`}>{r.pos}</td>
                    <td className="px-1.5 py-2.5">
                      <span className="flex items-center gap-2">
                        <TeamBadge item={r.team} size={26} />
                        <span className="min-w-0 text-[13px] font-semibold [overflow-wrap:anywhere]">{r.team.name}</span>
                      </span>
                    </td>
                    <td className={cell}>{r.pj}</td>
                    <td className={cell}>{r.g}</td>
                    {draws && <td className={cell}>{r.e}</td>}
                    <td className={cell}>{r.p}</td>
                    <td className={cell}>{r.gf}</td>
                    <td className={cell}>{r.gc}</td>
                    <td className={cell}>{r.dif > 0 ? `+${r.dif}` : r.dif}</td>
                    <td className={`${cell} pr-3 text-[14px] font-semibold`}>{r.pts}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
      {qualifiers > 0 && rows.length > 0 && (
        <p className="mt-2 text-[12px] text-mute">La línea gris marca a los {qualifiers} que pasan a la fase final.</p>
      )}
    </section>
  )
}
