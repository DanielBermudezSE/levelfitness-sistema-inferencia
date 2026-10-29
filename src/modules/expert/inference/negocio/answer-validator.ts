import type { InputVariableRow } from "../datos/knowledge-repository"
import type { RawAnswer } from "./working-memory"

export class InvalidAnswersError extends Error {
  constructor(readonly errors: string[]) {
    super("Respuestas inválidas")
  }
}

type Check = (v: InputVariableRow, raw: RawAnswer) => string | null

const isEmpty = (raw: RawAnswer) => raw == null || raw === "" || (Array.isArray(raw) && !raw.length)
const unit = (v: InputVariableRow) => (v.unit ? ` ${v.unit}` : "")

/** Validaciones por tipo de variable. Las reglas vienen de la BD (opciones, mínimos, máximos). */
const CHECKS: Record<InputVariableRow["input_type"], Check[]> = {
  number: [
    (v, raw) => (Number.isFinite(Number(raw)) ? null : `${v.name} debe ser un número.`),
    (v, raw) => (v.min_value != null && Number(raw) < v.min_value ? `${v.name} debe ser mínimo ${v.min_value}${unit(v)}.` : null),
    (v, raw) => (v.max_value != null && Number(raw) > v.max_value ? `${v.name} debe ser máximo ${v.max_value}${unit(v)}.` : null),
  ],
  single: [
    (v, raw) => (Array.isArray(raw) && raw.length !== 1 ? `${v.name}: elige una sola opción.` : null),
    (v, raw) => invalidOptions(v, raw),
  ],
  multi: [(v, raw) => invalidOptions(v, raw)],
}

function invalidOptions(v: InputVariableRow, raw: RawAnswer): string | null {
  const allowed = new Set(v.options)
  const bad = (Array.isArray(raw) ? raw : [raw]).map(String).filter((x) => !allowed.has(x))
  return bad.length ? `${v.name}: opción no válida (${bad.join(", ")}).` : null
}

/** Valida las respuestas contra las variables de entrada consultadas en la BD. */
export class AnswerValidator {
  validate(variables: InputVariableRow[], answers: Record<string, RawAnswer>): void {
    const errors = variables.flatMap((v) => {
      const raw = answers[v.code]
      if (isEmpty(raw)) return [`Falta responder: ${v.question ?? v.name}`]
      const first = CHECKS[v.input_type].map((check) => check(v, raw)).find(Boolean)
      return first ? [first] : []
    })
    if (errors.length) throw new InvalidAnswersError(errors)
  }

  /** "Ninguna" es excluyente con las demás opciones de una pregunta múltiple. */
  normalize(answers: Record<string, RawAnswer>): Record<string, RawAnswer> {
    return Object.fromEntries(
      Object.entries(answers).map(([k, raw]) => [
        k,
        Array.isArray(raw) && raw.length > 1 ? raw.filter((x) => x !== "ninguna") : raw,
      ])
    )
  }
}
