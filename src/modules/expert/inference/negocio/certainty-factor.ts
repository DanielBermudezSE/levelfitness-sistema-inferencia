import { combineCF } from "../../engine"

/**
 * Factor de certeza (escala MYCIN, -1..1) como objeto de valor.
 *
 *   FC = 1   certeza total a favor
 *   FC = 0   sin evidencia
 *   FC = -1  veto: descarta la hipótesis aunque haya evidencia a favor
 *
 * La combinación de dos evidencias sobre la misma conclusión es:
 *   ambas ≥ 0:  a + b(1 − a)
 *   ambas < 0:  a + b(1 + a)
 *   signos ≠:   (a + b) / (1 − min(|a|, |b|))
 */
export class CertaintyFactor {
  static readonly NONE = new CertaintyFactor(0)

  private constructor(readonly value: number) {}

  static of(value: number): CertaintyFactor {
    return new CertaintyFactor(Math.max(-1, Math.min(1, value)))
  }

  /** Combina una lista de evidencias en el orden dado (empezando sin evidencia). */
  static combineAll(values: number[]): CertaintyFactor {
    return values.reduce((acc, v) => acc.combine(CertaintyFactor.of(v)), CertaintyFactor.NONE)
  }

  combine(other: CertaintyFactor): CertaintyFactor {
    return CertaintyFactor.of(combineCF(this.value, other.value))
  }

  get rounded(): number {
    return Math.round(this.value * 1000) / 1000
  }
}
