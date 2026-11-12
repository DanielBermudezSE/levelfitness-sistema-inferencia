import { model } from "@medusajs/framework/utils"

/**
 * Sistema experto de recomendación de suplementos.
 *
 * BASE DE CONOCIMIENTO (lo que sabe el experto humano):
 *   - expert_variable / expert_variable_option: atributos que describen al
 *     usuario (preguntas) y hechos intermedios que el motor deduce.
 *   - expert_hypothesis: conclusiones posibles (familias de producto o avisos).
 *   - expert_rule / expert_rule_condition: reglas SI <condiciones> ENTONCES
 *     <conclusión> con un factor de certeza (-1..1).
 *
 * SISTEMA TRANSACCIONAL (lo que ocurre en cada consulta):
 *   - expert_consultation: respuestas del usuario, memoria de trabajo final y
 *     traza de inferencia.
 *   - expert_consultation_result: hipótesis evaluadas con su certeza, estado y
 *     productos propuestos.
 */

/** Atributo del dominio: pregunta al usuario (input) o hecho deducido (derived). */
export const ExpertVariable = model
  .define("expert_variable", {
    id: model.id({ prefix: "exvar" }).primaryKey(),
    code: model.text().unique(),
    name: model.text(),
    /** Texto de la pregunta (solo variables de entrada). */
    question: model.text().nullable(),
    help: model.text().nullable(),
    kind: model.enum(["input", "derived"]).default("input"),
    input_type: model.enum(["single", "multi", "number"]).default("single"),
    unit: model.text().nullable(),
    min_value: model.float().nullable(),
    max_value: model.float().nullable(),
    sort_order: model.number().default(0),
    active: model.boolean().default(true),
    options: model.hasMany(() => ExpertVariableOption, { mappedBy: "variable" }),
    conditions: model.hasMany(() => ExpertRuleCondition, {
      mappedBy: "variable",
    }),
    concluding_rules: model.hasMany(() => ExpertRule, {
      mappedBy: "conclusion_variable",
    }),
  })
  .cascades({ delete: ["options"] })

/** Valor admitido para una variable categórica. */
export const ExpertVariableOption = model.define("expert_variable_option", {
  id: model.id({ prefix: "exopt" }).primaryKey(),
  value: model.text(),
  label: model.text(),
  sort_order: model.number().default(0),
  variable: model.belongsTo(() => ExpertVariable, { mappedBy: "options" }),
})

/** Hipótesis / conclusión: familia de producto recomendable o aviso. */
export const ExpertHypothesis = model.define("expert_hypothesis", {
  id: model.id({ prefix: "exhyp" }).primaryKey(),
  code: model.text().unique(),
  name: model.text(),
  description: model.text(),
  kind: model.enum(["product", "advice"]).default("product"),
  /**
   * Cómo encontrar productos de esta familia en el catálogo:
   * { categories: string[], include?: string, exclude?: string } (regex sobre el título).
   */
  product_match: model.json().nullable(),
  /** Indicación general de uso (no es prescripción). */
  usage: model.text().nullable(),
  sort_order: model.number().default(0),
  active: model.boolean().default(true),
  rules: model.hasMany(() => ExpertRule, { mappedBy: "hypothesis" }),
  results: model.hasMany(() => ExpertConsultationResult, {
    mappedBy: "hypothesis",
  }),
})

/** Regla de producción SI <condiciones (AND)> ENTONCES <conclusión> [FC]. */
export const ExpertRule = model
  .define("expert_rule", {
    id: model.id({ prefix: "exrule" }).primaryKey(),
    code: model.text().unique(),
    name: model.text(),
    /** "hypothesis" concluye una hipótesis; "fact" deduce un hecho intermedio. */
    conclusion_type: model.enum(["hypothesis", "fact"]),
    hypothesis: model
      .belongsTo(() => ExpertHypothesis, { mappedBy: "rules" })
      .nullable(),
    conclusion_variable: model
      .belongsTo(() => ExpertVariable, { mappedBy: "concluding_rules" })
      .nullable(),
    conclusion_value: model.text().nullable(),
    /** Factor de certeza (-1 = descarta por completo, 1 = certeza total). */
    certainty: model.float(),
    /** Resolución de conflictos: mayor prioridad se evalúa primero. */
    priority: model.number().default(0),
    /** Justificación en lenguaje natural (módulo de explicación). */
    explanation: model.text(),
    /** Fuente del conocimiento (experto, evidencia científica…). */
    source: model.text().nullable(),
    active: model.boolean().default(true),
    conditions: model.hasMany(() => ExpertRuleCondition, { mappedBy: "rule" }),
  })
  .cascades({ delete: ["conditions"] })

/** Condición (premisa) de una regla. Todas las de una regla se unen con AND. */
export const ExpertRuleCondition = model.define("expert_rule_condition", {
  id: model.id({ prefix: "excond" }).primaryKey(),
  operator: model.enum([
    "eq",
    "neq",
    "in",
    "not_in",
    "gt",
    "gte",
    "lt",
    "lte",
    "contains",
    "not_contains",
  ]),
  /** Valor comparado; para in/not_in, lista separada por comas. */
  value: model.text(),
  sort_order: model.number().default(0),
  rule: model.belongsTo(() => ExpertRule, { mappedBy: "conditions" }),
  variable: model.belongsTo(() => ExpertVariable, { mappedBy: "conditions" }),
})

/** Consulta realizada por un usuario (transaccional). */
export const ExpertConsultation = model
  .define("expert_consultation", {
    id: model.id({ prefix: "excons" }).primaryKey(),
    /** Cliente de Medusa si estaba autenticado (invitado = null). */
    customer_id: model.text().nullable(),
    answers: model.json(),
    /** Memoria de trabajo final (hechos de entrada, calculados e inferidos). */
    facts: model.json().nullable(),
    /** Traza de reglas disparadas (para auditoría y explicación). */
    trace: model.json().nullable(),
    budget: model.float().nullable(),
    total_recommended: model.float().nullable(),
    /** Retroalimentación del usuario (1–5) para validar el conocimiento. */
    rating: model.number().nullable(),
    feedback: model.text().nullable(),
    results: model.hasMany(() => ExpertConsultationResult, {
      mappedBy: "consultation",
    }),
  })
  .cascades({ delete: ["results"] })

/** Resultado de una hipótesis dentro de una consulta. */
export const ExpertConsultationResult = model.define(
  "expert_consultation_result",
  {
    id: model.id({ prefix: "exres" }).primaryKey(),
    certainty: model.float(),
    status: model.enum(["recommended", "optional", "rejected", "advice"]),
    rank: model.number().default(0),
    product_ids: model.json().nullable(),
    selected_product_id: model.text().nullable(),
    reasons: model.json().nullable(),
    consultation: model.belongsTo(() => ExpertConsultation, {
      mappedBy: "results",
    }),
    hypothesis: model.belongsTo(() => ExpertHypothesis, { mappedBy: "results" }),
  }
)
