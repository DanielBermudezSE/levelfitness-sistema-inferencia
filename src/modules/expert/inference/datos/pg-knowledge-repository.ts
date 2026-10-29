import type { KnowledgeRepository, InputVariableRow, RuleRow, ConditionRow, HypothesisRow } from "./knowledge-repository"
import { QueryLog } from "./query-log"

/** Conexión mínima que necesitamos de Knex (la que expone Medusa como PG_CONNECTION). */
export type SqlConnection = {
  raw(sql: string, bindings?: unknown[]): Promise<{ rows: Record<string, unknown>[] }>
}

const SQL = {
  inputVariables: `
SELECT v.code, v.name, v.question, v.input_type, v.unit, v.min_value, v.max_value,
       COALESCE(array_agg(o.value ORDER BY o.sort_order) FILTER (WHERE o.id IS NOT NULL), '{}') AS options
FROM expert_variable v
LEFT JOIN expert_variable_option o ON o.variable_id = v.id AND o.deleted_at IS NULL
WHERE v.kind = 'input' AND v.active AND v.deleted_at IS NULL
GROUP BY v.id
ORDER BY v.sort_order`,

  rulesTriggeredBy: `
SELECT DISTINCT r.id, r.code, r.name, r.conclusion_type, h.code AS hypothesis,
       cv.code AS conclusion_variable, r.conclusion_value, r.certainty, r.priority, r.explanation
FROM expert_rule_condition c
JOIN expert_variable v   ON v.id = c.variable_id
JOIN expert_rule r       ON r.id = c.rule_id AND r.active AND r.deleted_at IS NULL
LEFT JOIN expert_hypothesis h ON h.id = r.hypothesis_id AND h.active AND h.deleted_at IS NULL
LEFT JOIN expert_variable cv  ON cv.id = r.conclusion_variable_id AND cv.active AND cv.deleted_at IS NULL
WHERE v.code = ? AND c.deleted_at IS NULL
  AND (h.id IS NOT NULL OR cv.id IS NOT NULL)
  AND NOT EXISTS (
    SELECT 1 FROM expert_rule_condition c2
    JOIN expert_variable v2 ON v2.id = c2.variable_id
    WHERE c2.rule_id = r.id AND c2.deleted_at IS NULL AND NOT v2.active)
ORDER BY r.priority DESC, r.code`,

  conditionsOf: (n: number) => `
SELECT c.rule_id, v.code AS variable, c.operator, c.value
FROM expert_rule_condition c
JOIN expert_variable v ON v.id = c.variable_id
WHERE c.rule_id IN (${Array(n).fill("?").join(", ")}) AND c.deleted_at IS NULL
ORDER BY c.rule_id, c.sort_order`,

  hypotheses: (n: number) => `
SELECT h.code, h.name, h.description, h.kind
FROM expert_hypothesis h
WHERE h.code IN (${Array(n).fill("?").join(", ")}) AND h.active AND h.deleted_at IS NULL`,
}

/**
 * Implementación del repositorio sobre PostgreSQL. Cada método ejecuta UNA
 * consulta parametrizada (sin concatenar valores del usuario) y la registra en
 * la bitácora.
 */
export class PgKnowledgeRepository implements KnowledgeRepository {
  constructor(
    private readonly db: SqlConnection,
    private readonly log: QueryLog
  ) {}

  async inputVariables(): Promise<InputVariableRow[]> {
    const rows = await this.run("Variables de entrada", SQL.inputVariables, [])
    return rows.map((r) => ({
      code: String(r.code),
      name: String(r.name),
      question: (r.question as string) ?? null,
      input_type: r.input_type as InputVariableRow["input_type"],
      unit: (r.unit as string) ?? null,
      min_value: r.min_value == null ? null : Number(r.min_value),
      max_value: r.max_value == null ? null : Number(r.max_value),
      options: (r.options as string[]) ?? [],
    }))
  }

  async rulesTriggeredBy(variable: string): Promise<RuleRow[]> {
    const rows = await this.run(`Reglas que usan el hecho «${variable}»`, SQL.rulesTriggeredBy, [variable])
    return rows.map((r) => ({
      id: String(r.id),
      code: String(r.code),
      name: String(r.name),
      conclusion_type: r.conclusion_type as RuleRow["conclusion_type"],
      hypothesis: (r.hypothesis as string) ?? null,
      conclusion_variable: (r.conclusion_variable as string) ?? null,
      conclusion_value: (r.conclusion_value as string) ?? null,
      certainty: Number(r.certainty),
      priority: Number(r.priority),
      explanation: String(r.explanation),
    }))
  }

  async conditionsOf(ruleIds: string[]): Promise<ConditionRow[]> {
    if (!ruleIds.length) return []
    const rows = await this.run(
      `Condiciones de ${ruleIds.length} regla(s) nuevas`,
      SQL.conditionsOf(ruleIds.length),
      ruleIds
    )
    return rows.map((r) => ({
      rule_id: String(r.rule_id),
      variable: String(r.variable),
      operator: String(r.operator),
      value: String(r.value),
    }))
  }

  async hypotheses(codes: string[]): Promise<HypothesisRow[]> {
    if (!codes.length) return []
    const rows = await this.run(`Descripción de ${codes.length} hipótesis`, SQL.hypotheses(codes.length), codes)
    return rows.map((r) => ({
      code: String(r.code),
      name: String(r.name),
      description: String(r.description),
      kind: r.kind as HypothesisRow["kind"],
    }))
  }

  private async run(granule: string, sql: string, params: unknown[]) {
    const start = performance.now()
    const { rows } = await this.db.raw(sql, params)
    this.log.record({
      granule,
      sql: sql.trim(),
      params,
      rows: rows.length,
      ms: Math.round((performance.now() - start) * 10) / 10,
    })
    return rows
  }
}
