import { InvalidAnswersError } from "../negocio/answer-validator"
import type { InferenceService } from "../negocio/inference-service"
import type { RawAnswer } from "../negocio/working-memory"
import { InferencePresenter, type InferenceView } from "./inference-presenter"

export type ControllerResponse =
  | { status: 200; body: InferenceView }
  | { status: 400; body: { message: string; errors?: string[] } }

/**
 * CAPA DE PRESENTACIÓN — controlador. Recibe la petición, valida su forma,
 * delega en la capa de negocio y devuelve el modelo de vista. No conoce SQL
 * ni reglas: solo traduce entre HTTP y el caso de uso.
 */
export class InferenceController {
  constructor(
    private readonly service: InferenceService,
    private readonly presenter = new InferencePresenter()
  ) {}

  async handle(body: unknown): Promise<ControllerResponse> {
    const answers = (body as { answers?: unknown } | null)?.answers
    if (!answers || typeof answers !== "object" || Array.isArray(answers)) {
      return { status: 400, body: { message: "Envía las respuestas en `answers`." } }
    }
    try {
      const outcome = await this.service.identify(answers as Record<string, RawAnswer>)
      return { status: 200, body: this.presenter.present(outcome) }
    } catch (e) {
      if (e instanceof InvalidAnswersError) {
        return { status: 400, body: { message: "Revisa tus respuestas.", errors: e.errors } }
      }
      throw e
    }
  }
}
