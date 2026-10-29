import { FIRE_THRESHOLD } from "../../engine"
import type { ConditionRow, InputVariableRow, KnowledgeRepository, RuleRow } from "../datos/knowledge-repository"
import { Agenda } from "./agenda"
import { DEFAULT_CALCULATORS, type DerivedCalculator } from "./derived-calculators"
import { EvidenceBoard } from "./evidence-board"
import { Rule, type Firing, type InferenceContext } from "./rule"
import { WorkingMemory, type RawAnswer } from "./working-memory"

export type TraceEvent = Firing & {
  action: "dispara" | "retira"
  conclusion: string
}

export type EngineRun = {
  memory: WorkingMemory
  board: EvidenceBoard
  trace: TraceEvent[]
  cycles: number
  rulesConsulted: number
}

/** Tope de seguridad: garantiza terminación aunque el conocimiento tenga ciclos. */
const MAX_CYCLES = 500

/**
 * MOTOR DE INFERENCIA GRANULAR (encadenamiento hacia adelante dirigido por
 * agenda).
 *
 *   1. Las respuestas del usuario y los hechos calculados entran a la memoria
 *      de trabajo y a la agenda.
 *   2. Se saca un hecho de la agenda y se CONSULTA a la BD el gránulo de
 *      reglas que lo mencionan (y las condiciones de las que aún no conoce).
 *   3. Cada regla del gránulo evalúa su premisa contra la memoria de trabajo:
 *      si supera el umbral, afirma su conclusión con certeza premisa × FC; si
 *      no, retira el aporte que hubiera hecho antes.
 *   4. Si la conclusión es un hecho intermedio que cambió, ese hecho entra a la
 *      agenda y provoca una nueva consulta (encadenamiento).
 *   5. Se repite hasta vaciar la agenda (punto fijo).
 *
 * El motor no contiene conocimiento del dominio: no sabe qué es "creatina" ni
 * "embarazo". Todo llega de la base de conocimiento en cada consulta.
 */
export class GranularInferenceEngine {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly calculators: DerivedCalculator[] = DEFAULT_CALCULATORS
  ) {}

  async run(variables: InputVariableRow[], answers: Record<string, RawAnswer>): Promise<EngineRun> {
    const memory = new WorkingMemory()
    variables.forEach((v) => memory.assertAnswer(v, answers[v.code]))
    this.calculators.forEach((c) => c.apply(memory))

    const ctx: InferenceContext = { memory, board: new EvidenceBoard() }
    const agenda = new Agenda(memory.knownVariables())
    const known = new Map<string, Rule>()
    const trace: TraceEvent[] = []
    let cycles = 0

    for (let variable = agenda.next(); variable !== undefined && cycles < MAX_CYCLES; variable = agenda.next()) {
      cycles++
      const granule = await this.granuleOf(variable, known)

      for (const rule of granule) {
        const premise = rule.premise(memory)
        const firing: Firing = {
          rule: rule.code,
          name: rule.name,
          explanation: rule.explanation,
          priority: rule.priority,
          premise: round(premise),
          contribution: round(premise * rule.certainty),
          cycle: cycles,
          trigger: variable,
        }
        const fires = premise >= FIRE_THRESHOLD
        const changed = fires ? rule.conclusion.assert(ctx, firing) : rule.conclusion.retract(ctx, rule.code)
        if (!changed) continue

        trace.push({ ...firing, action: fires ? "dispara" : "retira", conclusion: rule.conclusion.label })
        if (rule.conclusion.propagates) agenda.push(rule.conclusion.propagates)
      }
    }

    return { memory, board: ctx.board, trace, cycles, rulesConsulted: known.size }
  }

  /**
   * Consulta granular: reglas cuya premisa menciona `variable`. Solo se piden a
   * la BD las condiciones de las reglas que el motor aún no ha visto.
   */
  private async granuleOf(variable: string, known: Map<string, Rule>): Promise<Rule[]> {
    const rows: RuleRow[] = await this.repository.rulesTriggeredBy(variable)
    const unseen = rows.filter((r) => !known.has(r.id))
    const conditions = await this.repository.conditionsOf(unseen.map((r) => r.id))

    const byRule = new Map<string, ConditionRow[]>()
    conditions.forEach((c) => byRule.set(c.rule_id, [...(byRule.get(c.rule_id) ?? []), c]))
    unseen.forEach((r) => known.set(r.id, Rule.fromRows(r, byRule.get(r.id) ?? [])))

    return rows.map((r) => known.get(r.id)!)
  }
}

const round = (n: number) => Math.round(n * 1000) / 1000
