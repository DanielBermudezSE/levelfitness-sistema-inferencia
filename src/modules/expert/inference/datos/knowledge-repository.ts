/**
 * CAPA DE DATOS — contrato de acceso a la base de conocimiento.
 *
 * El motor nunca recibe la base de conocimiento completa: la consulta por
 * GRÁNULOS, a medida que la memoria de trabajo va conociendo hechos. Cada
 * método de este contrato es una consulta pequeña y específica:
 *
 *   1. inputVariables()        ¿qué atributos describen al usuario?
 *   2. rulesTriggeredBy(v)     ¿qué reglas mencionan el hecho v en su premisa?
 *   3. conditionsOf(ids)       ¿cuáles son las condiciones de esas reglas?
 *   4. hypotheses(codes)       ¿qué significan las hipótesis que reunieron evidencia?
 *
 * Así el conocimiento puede crecer en la BD sin que el motor lo cargue entero,
 * y la implementación puede cambiarse (PostgreSQL, memoria para pruebas…) sin
 * tocar la capa de negocio (inversión de dependencias).
 */

export type InputVariableRow = {
  code: string
  name: string
  question: string | null
  input_type: "single" | "multi" | "number"
  unit: string | null
  min_value: number | null
  max_value: number | null
  options: string[]
}

export type RuleRow = {
  id: string
  code: string
  name: string
  conclusion_type: "hypothesis" | "fact"
  hypothesis: string | null
  conclusion_variable: string | null
  conclusion_value: string | null
  certainty: number
  priority: number
  explanation: string
}

export type ConditionRow = {
  rule_id: string
  variable: string
  operator: string
  value: string
}

export type HypothesisRow = {
  code: string
  name: string
  description: string
  kind: "product" | "advice"
}

export interface KnowledgeRepository {
  inputVariables(): Promise<InputVariableRow[]>
  rulesTriggeredBy(variable: string): Promise<RuleRow[]>
  conditionsOf(ruleIds: string[]): Promise<ConditionRow[]>
  hypotheses(codes: string[]): Promise<HypothesisRow[]>
}
