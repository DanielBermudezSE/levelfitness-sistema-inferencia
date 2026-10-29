/**
 * AGENDA: cola de hechos nuevos o modificados que todavía no se han usado para
 * consultar la base de conocimiento. Cada hecho que sale de la agenda genera
 * una consulta granular ("¿qué reglas te mencionan?"); cada hecho que una regla
 * deduce vuelve a entrar. La inferencia termina cuando la agenda queda vacía
 * (punto fijo: ningún hecho nuevo).
 */
export class Agenda {
  private readonly queue: string[] = []
  private readonly pending = new Set<string>()

  constructor(initial: string[] = []) {
    initial.forEach((v) => this.push(v))
  }

  push(variable: string): void {
    if (this.pending.has(variable)) return
    this.pending.add(variable)
    this.queue.push(variable)
  }

  next(): string | undefined {
    const variable = this.queue.shift()
    if (variable !== undefined) this.pending.delete(variable)
    return variable
  }

  get size(): number {
    return this.queue.length
  }
}
