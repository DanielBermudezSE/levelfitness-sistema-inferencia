import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { loadKnowledge, validateAnswers, advise } from "../../../../modules/expert/advisor"
import type { Answers } from "../../../../modules/expert/engine"

/**
 * Prueba del motor (validación del conocimiento) sin guardar la consulta.
 * Devuelve la traza completa de inferencia para que el experto revise qué
 * reglas dispararon y en qué orden.
 *
 *   POST /admin/expert/test   body: { answers }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body ?? {}) as { answers?: Answers }
  if (!body.answers) {
    res.status(400).json({ message: "Envía las respuestas en `answers`." })
    return
  }
  const loaded = await loadKnowledge(req.scope)
  const errors = validateAnswers(loaded.variables, body.answers)
  if (errors.length) {
    res.status(400).json({ message: "Respuestas inválidas.", errors })
    return
  }
  const out = await advise(req.scope, loaded, body.answers)
  res.json({
    budget: out.budget,
    total: out.total,
    advice: out.advice,
    recommended: out.recommended,
    optional: out.optional,
    rejected: out.rejected,
    facts: out.inference.facts,
    trace: out.inference.trace,
    iterations: out.inference.iterations,
  })
}
