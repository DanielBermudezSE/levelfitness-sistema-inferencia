import type { KnowledgeRepository, InputVariableRow, RuleRow, ConditionRow, HypothesisRow } from "./knowledge-repository"
import { QueryLog } from "./query-log"
import type { VariableSeed, HypothesisSeed, RuleSeed } from "../../knowledge/base"

/**
 * Implementación en memoria del mismo contrato, construida desde el archivo
 * de conocimiento (`knowledge/base.ts`). Sirve para pruebas y para comparar el
 * motor granular con el motor original sin necesitar PostgreSQL: demuestra que
 * la capa de negocio no depende de dónde vive el conocimiento.
 */
export class InMemoryKnowledgeRepository implements KnowledgeRepository {
  constructor(
    private readonly kb: { variables: VariableSeed[]; hypotheses: HypothesisSeed[]; rules: RuleSeed[] },
    private readonly log: QueryLog
  ) {}

  async inputVariables(): Promise<InputVariableRow[]> {
    const rows = this.kb.variables
      .filter((v) => (v.kind ?? "input") === "input")
      .map((v) => ({
        code: v.code,
        name: v.name,
        question: v.question ?? null,
        input_type: v.input_type,
        unit: v.unit ?? null,
        min_value: v.min ?? null,
        max_value: v.max ?? null,
        options: (v.options ?? []).map(([value]) => value),
      }))
    return this.record("Variables de entrada", [], rows)
  }

  async rulesTriggeredBy(variable: string): Promise<RuleRow[]> {
    const rows = this.kb.rules
      .filter((r) => r.conditions.some(([v]) => v === variable))
      .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0) || a.code.localeCompare(b.code))
      .map((r) => ({
        id: r.code,
        code: r.code,
        name: r.name,
        conclusion_type: r.h ? ("hypothesis" as const) : ("fact" as const),
        hypothesis: r.h ?? null,
        conclusion_variable: r.f?.[0] ?? null,
        conclusion_value: r.f?.[1] ?? null,
        certainty: r.cf,
        priority: r.priority ?? 0,
        explanation: r.explanation,
      }))
    return this.record(`Reglas que usan el hecho «${variable}»`, [variable], rows)
  }

  async conditionsOf(ruleIds: string[]): Promise<ConditionRow[]> {
    if (!ruleIds.length) return []
    const wanted = new Set(ruleIds)
    const rows = this.kb.rules
      .filter((r) => wanted.has(r.code))
      .flatMap((r) => r.conditions.map(([variable, operator, value]) => ({ rule_id: r.code, variable, operator, value })))
    return this.record(`Condiciones de ${ruleIds.length} regla(s) nuevas`, ruleIds, rows)
  }

  async hypotheses(codes: string[]): Promise<HypothesisRow[]> {
    if (!codes.length) return []
    const wanted = new Set(codes)
    const rows = this.kb.hypotheses
      .filter((h) => wanted.has(h.code))
      .map((h) => ({ code: h.code, name: h.name, description: h.description, kind: h.kind ?? ("product" as const) }))
    return this.record(`Descripción de ${codes.length} hipótesis`, codes, rows)
  }

  private record<T>(granule: string, params: unknown[], rows: T[]): T[] {
    this.log.record({ granule, sql: "(memoria)", params, rows: rows.length, ms: 0 })
    return rows
  }
}
