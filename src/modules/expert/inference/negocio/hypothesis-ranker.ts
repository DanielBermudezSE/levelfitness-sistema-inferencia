import { OPTIONAL_THRESHOLD, RECOMMEND_THRESHOLD, REJECT_THRESHOLD } from "../../engine"
import type { HypothesisRow } from "../datos/knowledge-repository"
import type { EvidenceBoard } from "./evidence-board"
import type { Firing } from "./rule"

export type HypothesisStatus = "recomendada" | "opcional" | "descartada" | "aviso" | "sin evidencia"

export type EvaluatedHypothesis = HypothesisRow & {
  /** Factor de certeza combinado (-1..1). */
  certainty: number
  status: HypothesisStatus
  supporting: Firing[]
  opposing: Firing[]
}

export type RankedHypothesis = EvaluatedHypothesis & {
  rank: number
  /** Peso probabilístico normalizado entre las hipótesis del ranking (suma 1). */
  weight: number
}

export type Ranking = {
  top: RankedHypothesis[]
  advice: EvaluatedHypothesis[]
  rejected: EvaluatedHypothesis[]
  evaluated: EvaluatedHypothesis[]
}

/**
 * Umbrales de clasificación, de mayor a menor. Se recorren como tabla: el
 * primero que la certeza alcanza define el estado.
 */
const STATUS_BY_KIND: Record<HypothesisRow["kind"], [min: number, status: HypothesisStatus][]> = {
  product: [
    [RECOMMEND_THRESHOLD, "recomendada"],
    [OPTIONAL_THRESHOLD, "opcional"],
    [REJECT_THRESHOLD + 1e-9, "sin evidencia"],
    [-Infinity, "descartada"],
  ],
  advice: [
    [0.5, "aviso"],
    [-Infinity, "sin evidencia"],
  ],
}

/**
 * Ordena las hipótesis por certeza y asigna a las N mejores un peso
 * probabilístico: P(hᵢ) = FCᵢ / Σ FCⱼ (j = 1..N), de modo que los pesos del
 * ranking suman 100 % y son comparables entre sí.
 */
export class HypothesisRanker {
  constructor(private readonly size = 5) {}

  rank(board: EvidenceBoard, hypotheses: HypothesisRow[]): Ranking {
    const evaluated = hypotheses
      .map((h) => this.evaluate(board, h))
      .sort((a, b) => b.certainty - a.certainty || a.code.localeCompare(b.code))

    const candidates = evaluated.filter((h) => h.kind === "product" && h.certainty > 0).slice(0, this.size)
    const total = candidates.reduce((sum, h) => sum + h.certainty, 0)

    return {
      top: candidates.map((h, i) => ({ ...h, rank: i + 1, weight: Math.round((h.certainty / total) * 1000) / 1000 })),
      advice: evaluated.filter((h) => h.status === "aviso"),
      rejected: evaluated.filter((h) => h.status === "descartada"),
      evaluated,
    }
  }

  private evaluate(board: EvidenceBoard, h: HypothesisRow): EvaluatedHypothesis {
    const certainty = board.certainty(h.code).rounded
    const firings = board.firings(h.code)
    const [, status] = STATUS_BY_KIND[h.kind].find(([min]) => certainty >= min)!
    return {
      ...h,
      certainty,
      status,
      supporting: firings.filter((f) => f.contribution >= 0),
      opposing: firings.filter((f) => f.contribution < 0),
    }
  }
}
