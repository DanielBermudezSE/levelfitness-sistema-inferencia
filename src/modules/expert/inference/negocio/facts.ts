import { CertaintyFactor } from "./certainty-factor"

export type FactSource = "usuario" | "calculado" | "inferido" | "desconocido"

export type FactView = {
  variable: string
  value: string | number
  certainty: number
  source: FactSource
  /** Reglas que dedujeron el valor (solo hechos inferidos). */
  by?: string[]
}

/**
 * Un hecho de la memoria de trabajo. Las condiciones de las reglas le
 * preguntan "¿en qué grado (0..1) vales X?" sin saber de qué tipo es: cada
 * clase responde a su manera (polimorfismo en lugar de condicionales por tipo).
 */
export interface Fact {
  readonly source: FactSource
  /** Grado en que el hecho toma el valor `value`. */
  degreeOf(value: string): number
  /** Grado máximo entre varios valores (disyunción). */
  degreeOfAny(values: string[]): number
  /** Grado en que el valor numérico cumple el predicado. */
  compare(predicate: (n: number) => boolean): number
  views(variable: string): FactView[]
}

/** Objeto nulo: hecho que no está en memoria. Toda afirmación vale 0. */
class AbsentFact implements Fact {
  readonly source = "desconocido" as const
  degreeOf(): number {
    return 0
  }
  degreeOfAny(): number {
    return 0
  }
  compare(): number {
    return 0
  }
  views(): FactView[] {
    return []
  }
}

export const ABSENT: Fact = new AbsentFact()

/** Hecho numérico (edad, peso, IMC…). */
export class NumericFact implements Fact {
  constructor(
    readonly value: number,
    readonly source: "usuario" | "calculado"
  ) {}

  degreeOf(value: string): number {
    return Number(this.value === Number(value))
  }
  degreeOfAny(): number {
    return 0
  }
  compare(predicate: (n: number) => boolean): number {
    return Number(predicate(this.value))
  }
  views(variable: string): FactView[] {
    return [{ variable, value: this.value, certainty: 1, source: this.source }]
  }
}

/** Hecho categórico dado por el usuario: cada valor elegido tiene certeza 1. */
export class CategoricalFact implements Fact {
  readonly source = "usuario" as const
  private readonly values: Set<string>

  constructor(values: string[]) {
    this.values = new Set(values)
  }

  degreeOf(value: string): number {
    return Number(this.values.has(value))
  }
  degreeOfAny(values: string[]): number {
    return Math.max(0, ...values.map((v) => this.degreeOf(v)))
  }
  compare(): number {
    return 0
  }
  views(variable: string): FactView[] {
    return [...this.values].map((value) => ({ variable, value, certainty: 1, source: this.source }))
  }
}

type Contribution = { cf: number; priority: number }

/**
 * Hecho deducido por reglas. Guarda la contribución de cada regla por separado:
 * si una regla deja de cumplirse se retira solo su aporte, y la certeza del
 * valor es siempre la combinación MYCIN de los aportes vigentes.
 */
export class DerivedFact implements Fact {
  readonly source = "inferido" as const
  /** valor → (regla → aporte) */
  private readonly contributions = new Map<string, Map<string, Contribution>>()

  /** Registra el aporte de una regla. Devuelve true si cambió la certeza del valor. */
  assert(value: string, rule: string, contribution: Contribution): boolean {
    const before = this.degreeOf(value)
    const byRule = this.contributions.get(value) ?? new Map<string, Contribution>()
    byRule.set(rule, contribution)
    this.contributions.set(value, byRule)
    return this.degreeOf(value) !== before
  }

  /** Retira el aporte de una regla. Devuelve true si cambió alguna certeza. */
  retract(rule: string): boolean {
    let changed = false
    for (const [value, byRule] of this.contributions) {
      if (!byRule.has(rule)) continue
      const before = this.degreeOf(value)
      byRule.delete(rule)
      changed ||= this.degreeOf(value) !== before
    }
    return changed
  }

  degreeOf(value: string): number {
    const byRule = this.contributions.get(value)
    if (!byRule) return 0
    const ordered = [...byRule.entries()]
      .sort(([ra, a], [rb, b]) => b.priority - a.priority || ra.localeCompare(rb))
      .map(([, c]) => c.cf)
    return Math.max(0, CertaintyFactor.combineAll(ordered).value)
  }
  degreeOfAny(values: string[]): number {
    return Math.max(0, ...values.map((v) => this.degreeOf(v)))
  }
  compare(): number {
    return 0
  }
  views(variable: string): FactView[] {
    return [...this.contributions.entries()]
      .map(([value, byRule]) => ({
        variable,
        value,
        certainty: CertaintyFactor.of(this.degreeOf(value)).rounded,
        source: this.source,
        by: [...byRule.keys()].sort(),
      }))
      .filter((v) => v.certainty > 0)
  }
}
