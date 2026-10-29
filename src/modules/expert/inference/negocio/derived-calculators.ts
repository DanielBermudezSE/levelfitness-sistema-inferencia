import type { WorkingMemory } from "./working-memory"

/**
 * Demonio: procedimiento que calcula un hecho numérico a partir de otros
 * apenas estos están en la memoria de trabajo (no es una regla SI-ENTONCES).
 */
export interface DerivedCalculator {
  readonly variable: string
  apply(memory: WorkingMemory): void
}

/** IMC = peso (kg) / estatura (m)². */
export class BmiCalculator implements DerivedCalculator {
  readonly variable = "imc"

  apply(memory: WorkingMemory): void {
    const weight = memory.numeric("peso")
    const height = memory.numeric("estatura")
    if (weight == null || !height) return
    const bmi = weight / Math.pow(height / 100, 2)
    memory.assertComputed(this.variable, Math.round(bmi * 10) / 10)
  }
}

export const DEFAULT_CALCULATORS: DerivedCalculator[] = [new BmiCalculator()]
