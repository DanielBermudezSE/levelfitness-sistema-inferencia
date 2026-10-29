/**
 * Demostración del sistema de inferencia SIN base de datos.
 *
 * Arma las tres capas igual que el endpoint, pero la capa de datos usa el
 * repositorio en memoria (construido desde src/modules/expert/knowledge/base.ts)
 * en lugar de PostgreSQL. Las capas de negocio y presentación son las mismas.
 *
 *   npm run demo                      perfil de ejemplo, vista de texto
 *   npm run demo -- --json            modelo de vista JSON
 *   npm run demo -- perfil.json       perfil propio desde un archivo JSON
 */
import { readFileSync } from "node:fs"
import { VARIABLES, HYPOTHESES, RULES } from "../src/modules/expert/knowledge/base"
import { InMemoryKnowledgeRepository } from "../src/modules/expert/inference/datos/in-memory-knowledge-repository"
import { QueryLog } from "../src/modules/expert/inference/datos/query-log"
import { InferenceService } from "../src/modules/expert/inference/negocio/inference-service"
import { InferenceController } from "../src/modules/expert/inference/presentacion/inference-controller"
import { TextInferenceView } from "../src/modules/expert/inference/presentacion/text-view"
import type { InferenceView } from "../src/modules/expert/inference/presentacion/inference-presenter"

const PERFIL = {
  objetivo: "bajar_grasa",
  sexo: "mujer",
  edad: 34,
  peso: 78,
  estatura: 162,
  experiencia: "intermedio",
  frecuencia: 5,
  duracion: 60,
  tipo_entrenamiento: "mixto",
  horario: "noche",
  dieta: "omnivora",
  proteina_dieta: "baja",
  metabolismo: "normal",
  salud: ["ninguna"],
  presupuesto: 400000,
}

async function main() {
  const args = process.argv.slice(2)
  const file = args.find((a) => a.endsWith(".json"))
  const answers = file ? JSON.parse(readFileSync(file, "utf8")) : PERFIL

  // Raíz de composición: datos → negocio → presentación.
  const log = new QueryLog()
  const repository = new InMemoryKnowledgeRepository({ variables: VARIABLES, hypotheses: HYPOTHESES, rules: RULES }, log)
  const controller = new InferenceController(new InferenceService(repository, log))

  const { status, body } = await controller.handle({ answers })
  if (status !== 200 || args.includes("--json")) {
    console.log(JSON.stringify(body, null, 2))
    return
  }
  console.log("\nPERFIL:", JSON.stringify(answers), "\n")
  console.log(new TextInferenceView().render(body as InferenceView))
}

main()
