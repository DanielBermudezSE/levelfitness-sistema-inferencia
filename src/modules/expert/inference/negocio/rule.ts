import type { ConditionRow, RuleRow } from "../datos/knowledge-repository"
import type { EvidenceBoard } from "./evidence-board"
import { operator, type OperatorFn } from "./operators"
import type { WorkingMemory } from "./working-memory"

/** Disparo de una regla: cuánto aporta y por qué. */
export type Firing = {
  rule: string
  name: string
  explanation: string
  priority: number
  /** Certeza con que se cumplió la premisa (mínimo de las condiciones). */
  premise: number
  /** Aporte a la conclusión = premisa × FC de la regla. */
  contribution: number
  /** Ciclo de la agenda en que se produjo y hecho que lo provocó. */
  cycle: number
  trigger: string
}

/** Lo que el motor necesita para aplicar la conclusión de una regla. */
export type InferenceContext = { memory: WorkingMemory; board: EvidenceBoard }

/**
 * Conclusión de una regla. Hay dos clases (hecho intermedio e hipótesis) y el
 * motor las trata igual: le pide a la conclusión que se afirme o se retire.
 */
export interface Conclusion {
  readonly label: string
  /** Variable cuyo cambio debe propagarse por la agenda (null si no propaga). */
  readonly propagates: string | null
  assert(ctx: InferenceContext, firing: Firing): boolean
  retract(ctx: InferenceContext, rule: string): boolean
}

class FactConclusion implements Conclusion {
  readonly propagates: string
  constructor(
    private readonly variable: string,
    private readonly value: string
  ) {
    this.propagates = variable
  }
  get label() {
    return `${this.variable} = ${this.value}`
  }
  assert(ctx: InferenceContext, f: Firing): boolean {
    return ctx.memory.derive(this.variable, this.value, f.rule, f.contribution, f.priority)
  }
  retract(ctx: InferenceContext, rule: string): boolean {
    return ctx.memory.retract(this.variable, rule)
  }
}

class HypothesisConclusion implements Conclusion {
  readonly propagates = null
  constructor(private readonly hypothesis: string) {}
  get label() {
    return this.hypothesis
  }
  assert(ctx: InferenceContext, f: Firing): boolean {
    return ctx.board.add(this.hypothesis, f)
  }
  retract(ctx: InferenceContext, rule: string): boolean {
    return ctx.board.remove(this.hypothesis, rule)
  }
}

/** Fábrica de conclusiones según el tipo almacenado en la BD (tabla de despacho). */
const CONCLUSIONS: Record<RuleRow["conclusion_type"], (row: RuleRow) => Conclusion> = {
  fact: (row) => new FactConclusion(row.conclusion_variable!, row.conclusion_value!),
  hypothesis: (row) => new HypothesisConclusion(row.hypothesis!),
}

export class Condition {
  private readonly evaluate: OperatorFn
  constructor(
    readonly variable: string,
    readonly op: string,
    readonly value: string
  ) {
    this.evaluate = operator(op)
  }
  degree(memory: WorkingMemory): number {
    return this.evaluate(memory.fact(this.variable), this.value)
  }
  toString() {
    return `${this.variable} ${this.op} ${this.value}`
  }
}

/** Gránulo de conocimiento: SI <condiciones (Y)> ENTONCES <conclusión> [FC]. */
export class Rule {
  constructor(
    readonly id: string,
    readonly code: string,
    readonly name: string,
    readonly certainty: number,
    readonly priority: number,
    readonly explanation: string,
    readonly conditions: Condition[],
    readonly conclusion: Conclusion
  ) {}

  static fromRows(row: RuleRow, conditions: ConditionRow[]): Rule {
    return new Rule(
      row.id,
      row.code,
      row.name,
      row.certainty,
      row.priority,
      row.explanation,
      conditions.map((c) => new Condition(c.variable, c.operator, c.value)),
      CONCLUSIONS[row.conclusion_type](row)
    )
  }

  /** Certeza de la premisa: conjunción = mínimo de los grados de las condiciones. */
  premise(memory: WorkingMemory): number {
    return this.conditions.reduce((min, c) => Math.min(min, c.degree(memory)), this.conditions.length ? 1 : 0)
  }

  toString() {
    return `SI ${this.conditions.join(" Y ")} ENTONCES ${this.conclusion.label} [FC ${this.certainty}]`
  }
}
