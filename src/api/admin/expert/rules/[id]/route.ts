import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { EXPERT_MODULE } from "../../../../../modules/expert"
import type ExpertModuleService from "../../../../../modules/expert/service"
import { resolveRuleRefs, type RuleBody } from "../route"

/** Edita una regla (FC, explicación, prioridad, estado y/o condiciones). */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const service: ExpertModuleService = req.scope.resolve(EXPERT_MODULE)
  const [rule] = await service.listExpertRules(
    { id: req.params.id },
    { relations: ["conditions"], take: 1 }
  )
  if (!rule) {
    res.status(404).json({ message: "Regla no encontrada." })
    return
  }

  const body = (req.body ?? {}) as RuleBody
  const { errors, varId } = await resolveRuleRefs(service, {
    ...body,
    conclusion_type: undefined, // la conclusión no se cambia en la edición
  })
  if (errors.length) {
    res.status(400).json({ message: errors.join(" ") })
    return
  }

  const updated = await service.updateExpertRules({
    id: rule.id,
    ...(body.name !== undefined ? { name: body.name.trim() } : {}),
    ...(body.certainty !== undefined ? { certainty: Number(body.certainty) } : {}),
    ...(body.priority !== undefined ? { priority: Number(body.priority) } : {}),
    ...(body.explanation !== undefined ? { explanation: body.explanation.trim() } : {}),
    ...(body.active !== undefined ? { active: Boolean(body.active) } : {}),
  })

  if (body.conditions) {
    if (!body.conditions.length) {
      res.status(400).json({ message: "Una regla necesita al menos una condición." })
      return
    }
    const old = (rule.conditions ?? []).map((c) => c.id)
    if (old.length) await service.deleteExpertRuleConditions(old)
    await service.createExpertRuleConditions(
      body.conditions.map((c, i) => ({
        rule_id: rule.id,
        variable_id: varId.get(c.variable)!,
        operator: c.operator as "eq",
        value: String(c.value).trim(),
        sort_order: i + 1,
      }))
    )
  }

  res.json({ rule: updated })
}

/** Elimina una regla y sus condiciones. */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const service: ExpertModuleService = req.scope.resolve(EXPERT_MODULE)
  const [rule] = await service.listExpertRules(
    { id: req.params.id },
    { relations: ["conditions"], take: 1 }
  )
  if (!rule) {
    res.status(404).json({ message: "Regla no encontrada." })
    return
  }
  const conds = (rule.conditions ?? []).map((c) => c.id)
  if (conds.length) await service.deleteExpertRuleConditions(conds)
  await service.deleteExpertRules(rule.id)
  res.json({ id: rule.id, deleted: true })
}
