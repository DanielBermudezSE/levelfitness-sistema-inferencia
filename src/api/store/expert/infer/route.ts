import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createInferenceController } from "../../../../modules/expert/inference"

/**
 * Identifica las 5 hipótesis más probables con su peso, consultando la base de
 * conocimiento de forma granular (ver modules/expert/inference).
 *
 *   POST /store/expert/infer   body: { answers: { objetivo, sexo, edad, … } }
 *
 * 400 si faltan respuestas o son inválidas; 200 con el ranking, los hechos
 * deducidos, la traza de reglas y la bitácora de consultas a la BD.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { status, body } = await createInferenceController(req.scope).handle(req.body)
  res.status(status).json(body)
}
