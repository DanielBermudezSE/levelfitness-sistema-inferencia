import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import {
  loadKnowledge,
  validateAnswers,
  advise,
  saveConsultation,
} from "../../../../modules/expert/advisor"
import type { Answers } from "../../../../modules/expert/engine"

/**
 * Ejecuta una consulta al sistema experto.
 *
 *   POST /store/expert/consult   body: { answers: { objetivo, sexo, edad, … } }
 *
 * 400 si faltan respuestas o son inválidas; 200 con recomendaciones,
 * descartes justificados, avisos y la memoria de trabajo (hechos deducidos).
 */
export async function POST(req: AuthenticatedMedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { answers?: Answers }
  if (!body.answers || typeof body.answers !== "object") {
    res.status(400).json({ message: "Envía las respuestas en `answers`." })
    return
  }

  const loaded = await loadKnowledge(req.scope)
  const errors = validateAnswers(loaded.variables, body.answers)
  if (errors.length) {
    res.status(400).json({ message: "Revisa tus respuestas.", errors })
    return
  }

  // "Ninguna" es excluyente con otras condiciones de salud.
  const salud = body.answers.salud
  if (Array.isArray(salud) && salud.length > 1) {
    body.answers.salud = salud.filter((s) => s !== "ninguna")
  }

  const out = await advise(req.scope, loaded, body.answers)
  const customerId =
    req.auth_context?.actor_type === "customer" ? req.auth_context.actor_id : null
  const consultationId = await saveConsultation(
    req.scope,
    loaded,
    body.answers,
    out,
    customerId
  )

  // Etiquetas legibles de los valores y explicación de las reglas que
  // dedujeron cada hecho (para mostrar la cadena de razonamiento).
  const labels = new Map(
    loaded.variables.map((v) => [v.code, new Map((v.options ?? []).map((o) => [o.value, o.label]))])
  )
  const factRuleText = Object.fromEntries(
    loaded.kb.rules
      .filter((r) => r.conclusion_type === "fact")
      .map((r) => [r.code, r.explanation])
  )

  res.json({
    consultation_id: consultationId,
    budget: out.budget,
    total: out.total,
    advice: out.advice,
    recommended: out.recommended,
    optional: out.optional,
    rejected: out.rejected,
    // Solo los hechos que dedujo el sistema (no repetimos las respuestas).
    facts: out.inference.facts
      .filter((f) => f.source !== "usuario")
      .map((f) => ({
        ...f,
        label: labels.get(f.code)?.get(String(f.value)) ?? String(f.value),
      })),
    fact_rules: factRuleText,
    stats: {
      iterations: out.inference.iterations,
      fired_rules: out.inference.trace.length,
      rules_in_kb: loaded.kb.rules.length,
    },
  })
}
