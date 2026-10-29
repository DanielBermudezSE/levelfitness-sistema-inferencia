import type { ExecArgs } from "@medusajs/framework/types"
import { createInferenceController, TextInferenceView } from "../modules/expert/inference"

/**
 * Demostración del sistema de inferencia granular contra la BD real.
 *
 *   npm run demo:inferencia            (perfil de ejemplo)
 *   npm run demo:inferencia -- json    (imprime el modelo de vista JSON)
 */
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

export default async function demoInferencia({ container, args }: ExecArgs) {
  const { status, body } = await createInferenceController(container).handle({ answers: PERFIL })
  if (args?.includes("json") || status !== 200) {
    console.log(JSON.stringify(body, null, 2))
    return
  }
  console.log("\nPERFIL:", JSON.stringify(PERFIL), "\n")
  console.log(new TextInferenceView().render(body as Parameters<TextInferenceView["render"]>[0]))
}
