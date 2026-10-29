import type { InferenceOutcome } from "../negocio/inference-service"
import type { EvaluatedHypothesis, RankedHypothesis } from "../negocio/hypothesis-ranker"

/** Modelo de vista: lo que la interfaz muestra, ya en el lenguaje del usuario. */
export type HypothesisView = {
  puesto: number
  codigo: string
  hipotesis: string
  descripcion: string
  certeza: number
  certeza_texto: string
  peso: number
  peso_texto: string
  estado: string
  a_favor: string[]
  en_contra: string[]
}

export type InferenceView = {
  hipotesis: HypothesisView[]
  avisos: { hipotesis: string; certeza: number; motivo: string[] }[]
  descartadas: { hipotesis: string; certeza: number; motivo: string[] }[]
  hechos_deducidos: { hecho: string; valor: string | number; certeza: number; reglas: string[] }[]
  consultas: { paso: number; granulo: string; filas: number; ms: number }[]
  traza: { ciclo: number; hecho: string; regla: string; accion: string; conclusion: string; aporte: number }[]
  resumen: {
    ciclos_agenda: number
    consultas_bd: number
    tiempo_bd_ms: number
    reglas_consultadas: number
    reglas_disparadas: number
    tiempo_total_ms: number
  }
}

const pct = (n: number) => `${(n * 100).toFixed(1).replace(".", ",")} %`
const reasons = (h: EvaluatedHypothesis, side: "supporting" | "opposing") =>
  h[side].map((f) => `${f.rule} (${f.contribution >= 0 ? "+" : ""}${f.contribution}): ${f.explanation}`)

/** Transforma el resultado de negocio en el modelo de vista. */
export class InferencePresenter {
  present(outcome: InferenceOutcome): InferenceView {
    return {
      hipotesis: outcome.top.map((h: RankedHypothesis) => ({
        puesto: h.rank,
        codigo: h.code,
        hipotesis: h.name,
        descripcion: h.description,
        certeza: h.certainty,
        certeza_texto: pct(h.certainty),
        peso: h.weight,
        peso_texto: pct(h.weight),
        estado: h.status,
        a_favor: reasons(h, "supporting"),
        en_contra: reasons(h, "opposing"),
      })),
      avisos: outcome.advice.map((h) => ({ hipotesis: h.name, certeza: h.certainty, motivo: reasons(h, "supporting") })),
      descartadas: outcome.rejected.map((h) => ({ hipotesis: h.name, certeza: h.certainty, motivo: reasons(h, "opposing") })),
      hechos_deducidos: outcome.facts
        .filter((f) => f.source !== "usuario")
        .map((f) => ({ hecho: f.variable, valor: f.value, certeza: f.certainty, reglas: f.by ?? ["demonio"] })),
      consultas: outcome.queries.map((q) => ({ paso: q.step, granulo: q.granule, filas: q.rows, ms: q.ms })),
      traza: outcome.trace.map((t) => ({
        ciclo: t.cycle,
        hecho: t.trigger,
        regla: t.rule,
        accion: t.action,
        conclusion: t.conclusion,
        aporte: t.contribution,
      })),
      resumen: {
        ciclos_agenda: outcome.stats.cycles,
        consultas_bd: outcome.stats.queries,
        tiempo_bd_ms: outcome.stats.queryMs,
        reglas_consultadas: outcome.stats.rulesConsulted,
        reglas_disparadas: outcome.stats.firedRules,
        tiempo_total_ms: outcome.stats.totalMs,
      },
    }
  }
}
