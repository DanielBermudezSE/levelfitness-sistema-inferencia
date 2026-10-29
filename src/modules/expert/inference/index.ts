import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PgKnowledgeRepository, type SqlConnection } from "./datos/pg-knowledge-repository"
import { QueryLog } from "./datos/query-log"
import { InferenceService } from "./negocio/inference-service"
import { InferenceController } from "./presentacion/inference-controller"

/**
 * Sistema de inferencia granular en tres capas:
 *
 *   presentacion/  InferenceController → InferencePresenter → vista JSON / texto
 *        │
 *   negocio/       InferenceService → GranularInferenceEngine (agenda, memoria
 *        │         de trabajo, pizarra de evidencias) → HypothesisRanker (top 5)
 *        │
 *   datos/         KnowledgeRepository (contrato) ← PgKnowledgeRepository (SQL)
 *                                                ← InMemoryKnowledgeRepository
 *
 * Raíz de composición: arma las capas para una petición. La bitácora es por
 * petición para que cada consulta muestre solo sus propias consultas a la BD.
 */
export function createInferenceController(container: MedusaContainer): InferenceController {
  const db = container.resolve<SqlConnection>(ContainerRegistrationKeys.PG_CONNECTION)
  const log = new QueryLog()
  const repository = new PgKnowledgeRepository(db, log)
  return new InferenceController(new InferenceService(repository, log))
}

export { InferenceService } from "./negocio/inference-service"
export { InferenceController } from "./presentacion/inference-controller"
export { InferencePresenter } from "./presentacion/inference-presenter"
export { TextInferenceView } from "./presentacion/text-view"
export { QueryLog } from "./datos/query-log"
export { PgKnowledgeRepository } from "./datos/pg-knowledge-repository"
export { InMemoryKnowledgeRepository } from "./datos/in-memory-knowledge-repository"
