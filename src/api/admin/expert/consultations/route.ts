import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXPERT_MODULE } from "../../../../modules/expert"
import type ExpertModuleService from "../../../../modules/expert/service"

/**
 * Historial de consultas (sistema transaccional).
 *
 *   GET /admin/expert/consultations?limit=50&offset=0
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ExpertModuleService = req.scope.resolve(EXPERT_MODULE)
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 200)
  const offset = Math.max(Number(req.query.offset) || 0, 0)

  const [consultations, count] = await service.listAndCountExpertConsultations(
    {},
    {
      relations: ["results", "results.hypothesis"],
      order: { created_at: "DESC" },
      take: limit,
      skip: offset,
    }
  )

  res.json({
    count,
    consultations: consultations.map((c) => ({
      id: c.id,
      created_at: c.created_at,
      customer_id: c.customer_id,
      answers: c.answers,
      budget: c.budget,
      total_recommended: c.total_recommended,
      rating: c.rating,
      feedback: c.feedback,
      results: [...(c.results ?? [])]
        .sort((a, b) => a.rank - b.rank)
        .map((r) => ({
          hypothesis: r.hypothesis?.name ?? "",
          code: r.hypothesis?.code ?? "",
          status: r.status,
          certainty: Number(r.certainty),
          reasons: r.reasons,
        })),
    })),
  })
}
