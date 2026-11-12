import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXPERT_MODULE } from "../../../../../modules/expert"
import type ExpertModuleService from "../../../../../modules/expert/service"

/** Edita una hipótesis (estado, descripción, modo de uso). */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: ExpertModuleService = req.scope.resolve(EXPERT_MODULE)
  const [hyp] = await service.listExpertHypotheses({ id: req.params.id }, { take: 1 })
  if (!hyp) {
    res.status(404).json({ message: "Hipótesis no encontrada." })
    return
  }
  const body = (req.body ?? {}) as { active?: boolean; description?: string; usage?: string | null }
  const updated = await service.updateExpertHypotheses({
    id: hyp.id,
    ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
    ...(body.description !== undefined ? { description: body.description } : {}),
    ...(body.usage !== undefined ? { usage: body.usage } : {}),
  })
  res.json({ hypothesis: updated })
}
