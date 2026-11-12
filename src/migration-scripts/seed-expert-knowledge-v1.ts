import type { MedusaContainer } from "@medusajs/framework/types"
import seedExpertKnowledge from "../scripts/seed-expert-knowledge"

/**
 * Script de migración de datos: carga la base de conocimiento del sistema
 * experto la primera vez que se ejecuta `medusa db:migrate` (p. ej. en el
 * deploy de Railway). Medusa registra que ya corrió y no lo repite.
 *
 * Si más adelante se actualiza `knowledge/base.ts` y se quiere publicar en
 * producción, se crea un `seed-expert-knowledge-v2.ts` igual a este (el seed es
 * idempotente) o se edita el conocimiento directamente desde el Admin.
 */
export default async function seedExpertKnowledgeV1({
  container,
}: {
  container: MedusaContainer
}) {
  await seedExpertKnowledge({ container, args: [] } as Parameters<typeof seedExpertKnowledge>[0])
}
