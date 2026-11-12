import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXPERT_MODULE } from "../../../../../../modules/expert"
import type ExpertModuleService from "../../../../../../modules/expert/service"

/**
 * Retroalimentación del usuario sobre una recomendación (1–5 estrellas).
 * Sirve para validar el conocimiento: el experto ve en el Admin qué tan
 * útiles resultan las recomendaciones.
 *
 *   POST /store/expert/consultations/:id/feedback   body: { rating, comment? }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { rating, comment } = (req.body ?? {}) as { rating?: number; comment?: string }
  const n = Number(rating)
  if (!Number.isInteger(n) || n < 1 || n > 5) {
    res.status(400).json({ message: "La calificación debe ser un número entero de 1 a 5." })
    return
  }

  const service: ExpertModuleService = req.scope.resolve(EXPERT_MODULE)
  const [existing] = await service.listExpertConsultations({ id: req.params.id }, { take: 1 })
  if (!existing) {
    res.status(404).json({ message: "Consulta no encontrada." })
    return
  }

  await service.updateExpertConsultations({
    id: existing.id,
    rating: n,
    feedback: comment?.trim().slice(0, 1000) || null,
  })
  res.json({ ok: true })
}
