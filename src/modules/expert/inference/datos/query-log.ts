/**
 * Bitácora de consultas sucesivas a la base de conocimiento.
 *
 * Cada consulta granular que hace el repositorio queda registrada con el
 * gránulo que pidió, la sentencia, sus parámetros, las filas devueltas y el
 * tiempo. Es la evidencia de que la inferencia avanza consultando la BD paso a
 * paso y no recorriendo condicionales escritos en el código.
 */

export type QueryLogEntry = {
  step: number
  granule: string
  sql: string
  params: unknown[]
  rows: number
  ms: number
}

export class QueryLog {
  private readonly entries: QueryLogEntry[] = []

  record(entry: Omit<QueryLogEntry, "step">): void {
    this.entries.push({ step: this.entries.length + 1, ...entry })
  }

  all(): QueryLogEntry[] {
    return [...this.entries]
  }

  get count(): number {
    return this.entries.length
  }

  get totalMs(): number {
    return this.entries.reduce((sum, e) => sum + e.ms, 0)
  }
}
