import type { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { EXPERT_MODULE } from "../modules/expert"
import type ExpertModuleService from "../modules/expert/service"
import { VARIABLES, HYPOTHESES, RULES } from "../modules/expert/knowledge/base"

/**
 * Carga el conocimiento del experto humano en la base de conocimiento.
 *
 *   npm run seed:expert
 *
 * Idempotente:
 *   - Variables e hipótesis se crean o actualizan por su `code` (las consultas
 *     históricas siguen apuntando a las mismas hipótesis).
 *   - Las opciones de cada variable y TODAS las reglas/condiciones se
 *     reconstruyen desde `knowledge/base.ts`.
 */
export default async function seedExpertKnowledge({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const service: ExpertModuleService = container.resolve(EXPERT_MODULE)
  const ALL = { take: 10000 }

  // ── Variables + opciones ───────────────────────────────────────────────────
  const existingVars = await service.listExpertVariables({}, { relations: ["options"], ...ALL })
  const varByCode = new Map(existingVars.map((v) => [v.code, v]))
  const varId = new Map<string, string>()

  for (const [i, v] of VARIABLES.entries()) {
    const data = {
      code: v.code,
      name: v.name,
      question: v.question ?? null,
      help: v.help ?? null,
      kind: v.kind ?? "input",
      input_type: v.input_type,
      unit: v.unit ?? null,
      min_value: v.min ?? null,
      max_value: v.max ?? null,
      sort_order: i + 1,
      active: true,
    }
    const prev = varByCode.get(v.code)
    const saved = prev
      ? await service.updateExpertVariables({ id: prev.id, ...data })
      : await service.createExpertVariables(data)
    varId.set(v.code, saved.id)

    if (prev?.options?.length) {
      await service.deleteExpertVariableOptions(prev.options.map((o) => o.id))
    }
    if (v.options?.length) {
      await service.createExpertVariableOptions(
        v.options.map(([value, label], j) => ({
          variable_id: saved.id,
          value,
          label,
          sort_order: j + 1,
        }))
      )
    }
  }

  // ── Hipótesis ──────────────────────────────────────────────────────────────
  const existingHyp = await service.listExpertHypotheses({}, ALL)
  const hypByCode = new Map(existingHyp.map((h) => [h.code, h]))
  const hypId = new Map<string, string>()

  for (const [i, h] of HYPOTHESES.entries()) {
    const data = {
      code: h.code,
      name: h.name,
      description: h.description,
      kind: h.kind ?? "product",
      product_match: (h.product_match ?? null) as Record<string, unknown> | null,
      usage: h.usage ?? null,
      sort_order: i + 1,
      active: true,
    }
    const prev = hypByCode.get(h.code)
    const saved = prev
      ? await service.updateExpertHypotheses({ id: prev.id, ...data })
      : await service.createExpertHypotheses(data)
    hypId.set(h.code, saved.id)
  }

  // ── Reglas + condiciones (se reconstruyen) ─────────────────────────────────
  const existingRules = await service.listExpertRules({}, { relations: ["conditions"], ...ALL })
  const oldConds = existingRules.flatMap((r) => (r.conditions ?? []).map((c) => c.id))
  if (oldConds.length) await service.deleteExpertRuleConditions(oldConds)
  if (existingRules.length) await service.deleteExpertRules(existingRules.map((r) => r.id))

  for (const r of RULES) {
    for (const [variable] of r.conditions) {
      if (!varId.has(variable)) throw new Error(`Regla ${r.code}: variable desconocida "${variable}"`)
    }
    if (r.h && !hypId.has(r.h)) throw new Error(`Regla ${r.code}: hipótesis desconocida "${r.h}"`)
    if (r.f && !varId.has(r.f[0])) throw new Error(`Regla ${r.code}: hecho desconocido "${r.f[0]}"`)
  }

  const created = await service.createExpertRules(
    RULES.map((r) => ({
      code: r.code,
      name: r.name,
      conclusion_type: r.h ? ("hypothesis" as const) : ("fact" as const),
      hypothesis_id: r.h ? hypId.get(r.h)! : null,
      conclusion_variable_id: r.f ? varId.get(r.f[0])! : null,
      conclusion_value: r.f ? r.f[1] : null,
      certainty: r.cf,
      priority: r.priority ?? 0,
      explanation: r.explanation,
      source: r.source ?? "Experto en nutrición deportiva — Level Fitness",
      active: true,
    }))
  )
  const ruleId = new Map(created.map((r) => [r.code, r.id]))

  await service.createExpertRuleConditions(
    RULES.flatMap((r) =>
      r.conditions.map(([variable, operator, value], i) => ({
        rule_id: ruleId.get(r.code)!,
        variable_id: varId.get(variable)!,
        operator: operator as "eq",
        value,
        sort_order: i + 1,
      }))
    )
  )

  const factRules = RULES.filter((r) => r.f).length
  logger.info(
    `[expert] Conocimiento cargado: ${VARIABLES.length} variables, ${HYPOTHESES.length} hipótesis, ` +
      `${RULES.length} reglas (${factRules} de hechos, ${RULES.length - factRules} de hipótesis), ` +
      `${RULES.reduce((s, r) => s + r.conditions.length, 0)} condiciones.`
  )
}
