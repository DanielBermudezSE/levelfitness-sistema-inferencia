import type { InferenceView } from "./inference-presenter"

/**
 * Vista de texto del mismo modelo de vista (consola). La vista JSON la entrega
 * el endpoint HTTP; ambas consumen el mismo presentador.
 */
export class TextInferenceView {
  render(view: InferenceView): string {
    const bar = (w: number) => "█".repeat(Math.round(w * 30)).padEnd(30, "·")
    const lines: string[] = []

    lines.push("CONSULTAS SUCESIVAS A LA BASE DE CONOCIMIENTO")
    view.consultas.forEach((q) =>
      lines.push(`  ${String(q.paso).padStart(2)}. ${q.granulo.padEnd(48)} ${String(q.filas).padStart(3)} filas  ${q.ms} ms`)
    )

    lines.push("", "HECHOS DEDUCIDOS")
    view.hechos_deducidos.forEach((f) =>
      lines.push(`  ${f.hecho} = ${f.valor}  (FC ${f.certeza}; ${f.reglas.join(", ")})`)
    )

    lines.push("", "HIPÓTESIS IDENTIFICADAS (top 5)")
    view.hipotesis.forEach((h) => {
      lines.push(`  ${h.puesto}. ${h.hipotesis.padEnd(34)} ${bar(h.peso)} ${h.peso_texto.padStart(7)}   FC ${h.certeza.toFixed(3)}  [${h.estado}]`)
      h.a_favor.forEach((r) => lines.push(`       + ${r}`))
      h.en_contra.forEach((r) => lines.push(`       − ${r}`))
    })

    if (view.avisos.length) {
      lines.push("", "AVISOS")
      view.avisos.forEach((a) => lines.push(`  ! ${a.hipotesis} (FC ${a.certeza})`))
    }
    if (view.descartadas.length) {
      lines.push("", "DESCARTADAS")
      view.descartadas.forEach((d) => lines.push(`  ✘ ${d.hipotesis} (FC ${d.certeza})`))
    }

    const r = view.resumen
    lines.push(
      "",
      `Ciclos de agenda: ${r.ciclos_agenda} · Consultas a la BD: ${r.consultas_bd} (${r.tiempo_bd_ms} ms) · ` +
        `Reglas consultadas: ${r.reglas_consultadas} · Reglas disparadas: ${r.reglas_disparadas} · Total: ${r.tiempo_total_ms} ms`
    )
    return lines.join("\n")
  }
}
