import type { InputVariableRow } from "../datos/knowledge-repository"
import { ABSENT, CategoricalFact, DerivedFact, NumericFact, type Fact, type FactView } from "./facts"

export type RawAnswer = string | string[] | number | null | undefined

/** Cómo se convierte una respuesta cruda en hecho, según el tipo de variable. */
const FROM_ANSWER: Record<InputVariableRow["input_type"], (raw: RawAnswer) => Fact | null> = {
  number: (raw) => {
    const n = Number(raw)
    return raw === "" || raw == null || !Number.isFinite(n) ? null : new NumericFact(n, "usuario")
  },
  single: (raw) => toCategorical(raw),
  multi: (raw) => toCategorical(raw),
}

function toCategorical(raw: RawAnswer): Fact | null {
  const list = (Array.isArray(raw) ? raw : [raw]).filter((x) => x != null && x !== "").map(String)
  return list.length ? new CategoricalFact(list) : null
}

/**
 * MEMORIA DE TRABAJO: lo que el sistema sabe del usuario en este momento
 * (respuestas, hechos calculados y hechos deducidos con su certeza).
 */
export class WorkingMemory {
  private readonly facts = new Map<string, Fact>()

  fact(variable: string): Fact {
    return this.facts.get(variable) ?? ABSENT
  }

  assertAnswer(variable: InputVariableRow, raw: RawAnswer): void {
    const fact = FROM_ANSWER[variable.input_type](raw)
    if (fact) this.facts.set(variable.code, fact)
  }

  assertComputed(variable: string, value: number): void {
    this.facts.set(variable, new NumericFact(value, "calculado"))
  }

  /** Aporte de una regla a un hecho deducido. Devuelve true si el hecho cambió. */
  derive(variable: string, value: string, rule: string, cf: number, priority: number): boolean {
    const current = this.facts.get(variable)
    const fact = current instanceof DerivedFact ? current : new DerivedFact()
    this.facts.set(variable, fact)
    return fact.assert(value, rule, { cf, priority })
  }

  /** Retira el aporte de una regla a un hecho deducido. Devuelve true si cambió. */
  retract(variable: string, rule: string): boolean {
    const fact = this.facts.get(variable)
    return fact instanceof DerivedFact ? fact.retract(rule) : false
  }

  numeric(variable: string): number | null {
    const fact = this.facts.get(variable)
    return fact instanceof NumericFact ? fact.value : null
  }

  knownVariables(): string[] {
    return [...this.facts.keys()]
  }

  views(): FactView[] {
    return [...this.facts.entries()].flatMap(([variable, fact]) => fact.views(variable))
  }
}
