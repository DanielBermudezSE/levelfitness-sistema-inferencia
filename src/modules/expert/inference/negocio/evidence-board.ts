import { CertaintyFactor } from "./certainty-factor"
import type { Firing } from "./rule"

/**
 * PIZARRA DE EVIDENCIAS: por cada hipótesis guarda el aporte vigente de cada
 * regla que disparó a su favor o en contra. La certeza de la hipótesis es la
 * combinación MYCIN de esos aportes.
 */
export class EvidenceBoard {
  private readonly evidence = new Map<string, Map<string, Firing>>()

  /** Registra (o actualiza) el aporte de una regla. Devuelve true si cambió. */
  add(hypothesis: string, firing: Firing): boolean {
    const byRule = this.evidence.get(hypothesis) ?? new Map<string, Firing>()
    const previous = byRule.get(firing.rule)
    byRule.set(firing.rule, firing)
    this.evidence.set(hypothesis, byRule)
    return previous?.contribution !== firing.contribution
  }

  remove(hypothesis: string, rule: string): boolean {
    return this.evidence.get(hypothesis)?.delete(rule) ?? false
  }

  hypotheses(): string[] {
    return [...this.evidence.entries()].filter(([, byRule]) => byRule.size).map(([h]) => h)
  }

  firings(hypothesis: string): Firing[] {
    return [...(this.evidence.get(hypothesis)?.values() ?? [])].sort(
      (a, b) => b.priority - a.priority || a.rule.localeCompare(b.rule)
    )
  }

  certainty(hypothesis: string): CertaintyFactor {
    return CertaintyFactor.combineAll(this.firings(hypothesis).map((f) => f.contribution))
  }
}
