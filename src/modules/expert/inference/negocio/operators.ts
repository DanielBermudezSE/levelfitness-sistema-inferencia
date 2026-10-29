import type { Fact } from "./facts"

/**
 * Tabla de operadores de las condiciones. Cada operador es una función que
 * devuelve el grado (0..1) en que el hecho cumple la condición. El motor
 * busca el operador en esta tabla con el código que viene de la BD: no hay
 * una cadena de if/switch por operador ni por variable del dominio.
 *
 * Las negaciones se cumplen cuando el hecho no está en memoria (mundo cerrado).
 */
export type OperatorFn = (fact: Fact, value: string) => number

const list = (value: string) =>
  value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

export const OPERATORS: Readonly<Record<string, OperatorFn>> = {
  eq: (f, v) => f.degreeOf(v),
  contains: (f, v) => f.degreeOf(v),
  in: (f, v) => f.degreeOfAny(list(v)),
  neq: (f, v) => 1 - f.degreeOf(v),
  not_contains: (f, v) => 1 - f.degreeOf(v),
  not_in: (f, v) => 1 - f.degreeOfAny(list(v)),
  gt: (f, v) => f.compare((n) => n > Number(v)),
  gte: (f, v) => f.compare((n) => n >= Number(v)),
  lt: (f, v) => f.compare((n) => n < Number(v)),
  lte: (f, v) => f.compare((n) => n <= Number(v)),
}

export function operator(code: string): OperatorFn {
  const fn = OPERATORS[code]
  if (!fn) throw new Error(`Operador desconocido en la base de conocimiento: ${code}`)
  return fn
}
