import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXPERT_MODULE } from "../../../../modules/expert"
import type ExpertModuleService from "../../../../modules/expert/service"

export type RuleBody = {
  code?: string
  name?: string
  conclusion_type?: "hypothesis" | "fact"
  hypothesis_code?: string | null
  conclusion_variable_code?: string | null
  conclusion_value?: string | null
  certainty?: number
  priority?: number
  explanation?: string
  source?: string | null
  active?: boolean
  conditions?: { variable: string; operator: string; value: string }[]
}

const OPERATORS = ["eq", "neq", "in", "not_in", "gt", "gte", "lt", "lte", "contains", "not_contains"]

/**
 * Resuelve y valida una regla contra la base de conocimiento. Devuelve los
 * errores (→ 400) o los ids de las entidades referenciadas.
 */
export async function resolveRuleRefs(service: ExpertModuleService, body: RuleBody) {
  const errors: string[] = []
  const vars = await service.listExpertVariables({}, { take: 10000 })
  const hyps = await service.listExpertHypotheses({}, { take: 10000 })
  const varId = new Map(vars.map((v) => [v.code, v.id]))
  const hypId = new Map(hyps.map((h) => [h.code, h.id]))

  if (body.certainty != null && (Number(body.certainty) < -1 || Number(body.certainty) > 1)) {
    errors.push("El factor de certeza debe estar entre -1 y 1.")
  }
  if (body.conclusion_type === "hypothesis" && body.hypothesis_code && !hypId.has(body.hypothesis_code)) {
    errors.push(`Hipótesis desconocida: ${body.hypothesis_code}`)
  }
  if (body.conclusion_type === "fact") {
    if (!body.conclusion_variable_code || !varId.has(body.conclusion_variable_code)) {
      errors.push("Indica una variable válida para el hecho concluido.")
    }
    if (!body.conclusion_value) errors.push("Indica el valor del hecho concluido.")
  }
  for (const [i, c] of (body.conditions ?? []).entries()) {
    if (!varId.has(c.variable)) errors.push(`Condición ${i + 1}: variable desconocida "${c.variable}".`)
    if (!OPERATORS.includes(c.operator)) errors.push(`Condición ${i + 1}: operador inválido "${c.operator}".`)
    if (c.value == null || String(c.value).trim() === "") errors.push(`Condición ${i + 1}: falta el valor.`)
  }
  return { errors, varId, hypId }
}

/** Crea una regla con sus condiciones. POST /admin/expert/rules */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: ExpertModuleService = req.scope.resolve(EXPERT_MODULE)
  const body = (req.body ?? {}) as RuleBody

  const missing: string[] = []
  if (!body.code?.trim()) missing.push("código")
  if (!body.name?.trim()) missing.push("nombre")
  if (!body.conclusion_type) missing.push("tipo de conclusión")
  if (body.conclusion_type === "hypothesis" && !body.hypothesis_code) missing.push("hipótesis")
  if (body.certainty == null) missing.push("factor de certeza")
  if (!body.explanation?.trim()) missing.push("explicación")
  if (!body.conditions?.length) missing.push("al menos una condición")
  if (missing.length) {
    res.status(400).json({ message: `Faltan datos: ${missing.join(", ")}.` })
    return
  }

  const [dup] = await service.listExpertRules({ code: body.code!.trim() }, { take: 1 })
  if (dup) {
    res.status(400).json({ message: `Ya existe una regla con el código ${body.code}.` })
    return
  }

  const { errors, varId, hypId } = await resolveRuleRefs(service, body)
  if (errors.length) {
    res.status(400).json({ message: errors.join(" ") })
    return
  }

  const rule = await service.createExpertRules({
    code: body.code!.trim(),
    name: body.name!.trim(),
    conclusion_type: body.conclusion_type!,
    hypothesis_id: body.conclusion_type === "hypothesis" ? hypId.get(body.hypothesis_code!)! : null,
    conclusion_variable_id:
      body.conclusion_type === "fact" ? varId.get(body.conclusion_variable_code!)! : null,
    conclusion_value: body.conclusion_type === "fact" ? body.conclusion_value! : null,
    certainty: Number(body.certainty),
    priority: Number(body.priority ?? 50),
    explanation: body.explanation!.trim(),
    source: body.source ?? "Adquirido desde el Admin",
    active: body.active ?? true,
  })

  await service.createExpertRuleConditions(
    body.conditions!.map((c, i) => ({
      rule_id: rule.id,
      variable_id: varId.get(c.variable)!,
      operator: c.operator as "eq",
      value: String(c.value).trim(),
      sort_order: i + 1,
    }))
  )

  res.json({ rule })
}
