import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXPERT_MODULE } from "../../../../modules/expert"
import type ExpertModuleService from "../../../../modules/expert/service"

/**
 * Base de conocimiento completa (incluye elementos inactivos) para el módulo
 * de adquisición de conocimiento del Admin.
 *
 *   GET /admin/expert/knowledge
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const service: ExpertModuleService = req.scope.resolve(EXPERT_MODULE)
  const ALL = { take: 10000 }
  const [variables, hypotheses, rules, consultations] = await Promise.all([
    service.listExpertVariables({}, { relations: ["options"], order: { sort_order: "ASC" }, ...ALL }),
    service.listExpertHypotheses({}, { order: { sort_order: "ASC" }, ...ALL }),
    service.listExpertRules(
      {},
      {
        relations: ["conditions", "conditions.variable", "hypothesis", "conclusion_variable"],
        order: { code: "ASC" },
        ...ALL,
      }
    ),
    service.listExpertConsultations({}, { select: ["id", "rating"], ...ALL }),
  ])

  const rated = consultations.filter((c) => c.rating != null)
  res.json({
    variables: variables.map((v) => ({
      id: v.id,
      code: v.code,
      name: v.name,
      question: v.question,
      kind: v.kind,
      input_type: v.input_type,
      unit: v.unit,
      active: v.active,
      options: [...(v.options ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((o) => ({ value: o.value, label: o.label })),
    })),
    hypotheses: hypotheses.map((h) => ({
      id: h.id,
      code: h.code,
      name: h.name,
      description: h.description,
      kind: h.kind,
      usage: h.usage,
      product_match: h.product_match,
      active: h.active,
    })),
    rules: rules.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      conclusion_type: r.conclusion_type,
      hypothesis: r.hypothesis ? { id: r.hypothesis.id, code: r.hypothesis.code, name: r.hypothesis.name } : null,
      conclusion_variable: r.conclusion_variable
        ? { id: r.conclusion_variable.id, code: r.conclusion_variable.code, name: r.conclusion_variable.name }
        : null,
      conclusion_value: r.conclusion_value,
      certainty: Number(r.certainty),
      priority: r.priority,
      explanation: r.explanation,
      source: r.source,
      active: r.active,
      conditions: [...(r.conditions ?? [])]
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((c) => ({
          variable: c.variable?.code ?? "",
          variable_name: c.variable?.name ?? "",
          operator: c.operator,
          value: c.value,
        })),
    })),
    stats: {
      consultations: consultations.length,
      rated: rated.length,
      avg_rating: rated.length
        ? Math.round((rated.reduce((s, c) => s + (c.rating ?? 0), 0) / rated.length) * 10) / 10
        : null,
    },
  })
}
