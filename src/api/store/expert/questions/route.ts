import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { loadKnowledge } from "../../../../modules/expert/advisor"

/**
 * Preguntas del asesor experto (variables de entrada de la base de
 * conocimiento). El storefront arma el cuestionario dinámicamente: si el
 * experto agrega una variable en el Admin, aparece aquí sin tocar el front.
 *
 *   GET /store/expert/questions
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { variables } = await loadKnowledge(req.scope)
  const questions = variables
    .filter((v) => v.kind === "input")
    .map((v) => ({
      code: v.code,
      name: v.name,
      question: v.question,
      help: v.help,
      input_type: v.input_type,
      unit: v.unit,
      min: v.min_value,
      max: v.max_value,
      options: [...(v.options ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({ value: o.value, label: o.label })),
    }))
  res.json({ questions })
}
