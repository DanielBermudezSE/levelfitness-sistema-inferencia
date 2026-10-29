import type { KnowledgeRepository } from "../datos/knowledge-repository"
import type { QueryLog, QueryLogEntry } from "../datos/query-log"
import { AnswerValidator } from "./answer-validator"
import type { FactView } from "./facts"
import { HypothesisRanker, type Ranking } from "./hypothesis-ranker"
import { GranularInferenceEngine, type TraceEvent } from "./inference-engine"
import type { RawAnswer } from "./working-memory"

export type InferenceOutcome = Ranking & {
  facts: FactView[]
  trace: TraceEvent[]
  queries: QueryLogEntry[]
  stats: {
    cycles: number
    queries: number
    queryMs: number
    rulesConsulted: number
    firedRules: number
    totalMs: number
  }
}

/**
 * CAPA DE NEGOCIO — caso de uso "Identificar hipótesis".
 * Orquesta: validar respuestas → inferir con consultas granulares → rankear.
 */
export class InferenceService {
  constructor(
    private readonly repository: KnowledgeRepository,
    private readonly log: QueryLog,
    private readonly engine = new GranularInferenceEngine(repository),
    private readonly ranker = new HypothesisRanker(5),
    private readonly validator = new AnswerValidator()
  ) {}

  async identify(rawAnswers: Record<string, RawAnswer>): Promise<InferenceOutcome> {
    const start = performance.now()
    const variables = await this.repository.inputVariables()
    const answers = this.validator.normalize(rawAnswers)
    this.validator.validate(variables, answers)

    const run = await this.engine.run(variables, answers)
    const hypotheses = await this.repository.hypotheses(run.board.hypotheses())
    const ranking = this.ranker.rank(run.board, hypotheses)
    const fired = new Set(run.trace.filter((t) => t.action === "dispara").map((t) => t.rule))

    return {
      ...ranking,
      facts: run.memory.views(),
      trace: run.trace,
      queries: this.log.all(),
      stats: {
        cycles: run.cycles,
        queries: this.log.count,
        queryMs: Math.round(this.log.totalMs * 10) / 10,
        rulesConsulted: run.rulesConsulted,
        firedRules: fired.size,
        totalMs: Math.round(performance.now() - start),
      },
    }
  }
}
