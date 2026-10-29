/**
 * MOTOR DE INFERENCIA del sistema experto.
 *
 * Es independiente del dominio: no "sabe" nada de suplementos. Todo el
 * conocimiento llega como datos (reglas, condiciones e hipótesis cargadas desde
 * la base de conocimiento), de modo que el experto puede cambiar el
 * conocimiento sin tocar este código.
 *
 * Técnicas:
 *   1. Memoria de trabajo: hechos con un grado de certeza (0..1).
 *   2. Hechos calculados (demonios): IMC a partir de peso y estatura.
 *   3. Encadenamiento hacia adelante por estratos hasta PUNTO FIJO: las reglas
 *      que deducen hechos intermedios se reevalúan hasta que la memoria de
 *      trabajo deja de cambiar (permite cadenas de inferencia de varios pasos).
 *   4. Razonamiento con incertidumbre: factores de certeza de MYCIN
 *      (combinación de evidencia a favor y en contra; -1 actúa como veto).
 *   5. Resolución de conflictos por prioridad.
 *   6. Módulo de explicación: cada conclusión guarda las reglas que la
 *      sustentan (¿cómo?) y las que la descartan (¿por qué no?), incluyendo la
 *      cadena de hechos intermedios que las hicieron disparar.
 */

export type Operator =
  | "eq"
  | "neq"
  | "in"
  | "not_in"
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "contains"
  | "not_contains"

export type KbCondition = {
  variable: string
  operator: Operator
  value: string
}

export type KbRule = {
  code: string
  name: string
  conclusion_type: "hypothesis" | "fact"
  hypothesis?: string | null
  conclusion_variable?: string | null
  conclusion_value?: string | null
  certainty: number
  priority: number
  explanation: string
  conditions: KbCondition[]
}

export type KbHypothesis = {
  code: string
  name: string
  description: string
  kind: "product" | "advice"
}

export type KbVariable = {
  code: string
  name: string
  kind: "input" | "derived"
  input_type: "single" | "multi" | "number"
}

export type KnowledgeBase = {
  variables: KbVariable[]
  hypotheses: KbHypothesis[]
  rules: KbRule[]
}

export type Answers = Record<string, string | string[] | number | null | undefined>

/** Umbral mínimo de certeza de la premisa para disparar una regla. */
export const FIRE_THRESHOLD = 0.2
/** Certeza mínima para recomendar, para sugerir como opcional y para descartar. */
export const RECOMMEND_THRESHOLD = 0.3
export const OPTIONAL_THRESHOLD = 0.15
export const REJECT_THRESHOLD = -0.2

/** Hecho en memoria de trabajo. */
type Fact =
  | { type: "number"; value: number; source: "usuario" | "calculado" }
  | {
      type: "categorical"
      /** valor → certeza (0..1) */
      values: Map<string, number>
      source: "usuario" | "inferido"
      /** valor → reglas que lo dedujeron (para la explicación) */
      derivedBy: Map<string, string[]>
    }

type WorkingMemory = Map<string, Fact>

export type FiredRule = {
  code: string
  name: string
  explanation: string
  /** Certeza con que se cumplió la premisa (mínimo de las condiciones). */
  premise: number
  /** Certeza aportada a la conclusión (premisa × FC de la regla). */
  contribution: number
  /** Profundidad de inferencia (1 = hechos del usuario; >1 = hechos deducidos). */
  depth: number
  /** Hechos intermedios usados por la regla y las reglas que los dedujeron. */
  chain: { fact: string; value: string; by: string[] }[]
}

export type HypothesisResult = {
  code: string
  name: string
  description: string
  kind: "product" | "advice"
  certainty: number
  status: "recommended" | "optional" | "rejected" | "advice" | "none"
  supporting: FiredRule[]
  opposing: FiredRule[]
}

export type FactView = {
  code: string
  name: string
  source: string
  value: string | number
  certainty: number
  by?: string[]
}

export type InferenceResult = {
  facts: FactView[]
  hypotheses: HypothesisResult[]
  trace: (FiredRule & { conclusion: string })[]
  iterations: number
}

/** Combinación de factores de certeza (MYCIN). -1 es un veto absoluto. */
export function combineCF(a: number, b: number): number {
  if (a === -1 || b === -1) return -1
  if (a >= 0 && b >= 0) return a + b * (1 - a)
  if (a < 0 && b < 0) return a + b * (1 + a)
  return (a + b) / (1 - Math.min(Math.abs(a), Math.abs(b)))
}

const round = (n: number) => Math.round(n * 1000) / 1000

/** Construye la memoria de trabajo inicial con las respuestas del usuario. */
function initialMemory(kb: KnowledgeBase, answers: Answers): WorkingMemory {
  const wm: WorkingMemory = new Map()
  for (const v of kb.variables) {
    if (v.kind !== "input") continue
    const raw = answers[v.code]
    if (raw == null || raw === "") continue

    if (v.input_type === "number") {
      const n = Number(raw)
      if (Number.isFinite(n)) wm.set(v.code, { type: "number", value: n, source: "usuario" })
      continue
    }
    const list = (Array.isArray(raw) ? raw : [raw]).map(String).filter(Boolean)
    if (!list.length) continue
    wm.set(v.code, {
      type: "categorical",
      values: new Map(list.map((x) => [x, 1])),
      source: "usuario",
      derivedBy: new Map(),
    })
  }

  // Demonio: IMC = peso (kg) / estatura (m)²
  const peso = wm.get("peso")
  const est = wm.get("estatura")
  if (peso?.type === "number" && est?.type === "number" && est.value > 0) {
    const imc = peso.value / Math.pow(est.value / 100, 2)
    wm.set("imc", { type: "number", value: Math.round(imc * 10) / 10, source: "calculado" })
  }
  return wm
}

/** Grado (0..1) en que se cumple una condición dada la memoria de trabajo. */
function evaluateCondition(c: KbCondition, wm: WorkingMemory): number {
  const fact = wm.get(c.variable)
  const list = c.value.split(",").map((s) => s.trim()).filter(Boolean)

  if (c.operator === "gt" || c.operator === "gte" || c.operator === "lt" || c.operator === "lte") {
    if (!fact || fact.type !== "number") return 0
    const target = Number(c.value)
    const v = fact.value
    const ok =
      c.operator === "gt" ? v > target
      : c.operator === "gte" ? v >= target
      : c.operator === "lt" ? v < target
      : v <= target
    return ok ? 1 : 0
  }

  // Comparación numérica de igualdad sobre hechos numéricos.
  if (fact?.type === "number") {
    const eq = fact.value === Number(c.value)
    if (c.operator === "eq") return eq ? 1 : 0
    if (c.operator === "neq") return eq ? 0 : 1
    return 0
  }

  const cfOf = (val: string) => (fact?.type === "categorical" ? fact.values.get(val) ?? 0 : 0)
  const maxOf = (vals: string[]) => Math.max(0, ...vals.map(cfOf))

  switch (c.operator) {
    case "eq":
    case "contains":
      return cfOf(c.value)
    case "in":
      return maxOf(list)
    // Negaciones: si el hecho no está en memoria, la negación se cumple.
    case "neq":
    case "not_contains":
      return 1 - cfOf(c.value)
    case "not_in":
      return 1 - maxOf(list)
    default:
      return 0
  }
}

/** Certeza de la premisa (conjunción = mínimo de las condiciones). */
function evaluatePremise(rule: KbRule, wm: WorkingMemory): number {
  if (!rule.conditions.length) return 0
  let min = 1
  for (const c of rule.conditions) {
    min = Math.min(min, evaluateCondition(c, wm))
    if (min === 0) return 0
  }
  return min
}

/** Hechos inferidos que una regla usó y quién los dedujo (cadena de razonamiento). */
function chainOf(rule: KbRule, wm: WorkingMemory): FiredRule["chain"] {
  const chain: FiredRule["chain"] = []
  for (const c of rule.conditions) {
    const f = wm.get(c.variable)
    if (f?.type !== "categorical" || f.source !== "inferido") continue
    for (const [value, by] of f.derivedBy) {
      if (c.value.split(",").map((s) => s.trim()).includes(value)) {
        chain.push({ fact: c.variable, value, by })
      }
    }
  }
  return chain
}

/**
 * Ejecuta la inferencia completa sobre las respuestas del usuario.
 */
export function infer(kb: KnowledgeBase, answers: Answers): InferenceResult {
  const base = initialMemory(kb, answers)
  const byPriority = (a: KbRule, b: KbRule) => b.priority - a.priority
  const factRules = kb.rules.filter((r) => r.conclusion_type === "fact").sort(byPriority)
  const hypRules = kb.rules.filter((r) => r.conclusion_type === "hypothesis").sort(byPriority)

  // ── Estrato 1: hechos intermedios hasta punto fijo ─────────────────────────
  let wm: WorkingMemory = new Map(base)
  const depthOf = new Map<string, number>() // regla → primera iteración en que disparó
  let fired: FiredRule[] = []
  let iterations = 0
  let signature = ""

  for (iterations = 1; iterations <= 12; iterations++) {
    const derived = new Map<string, { values: Map<string, number>; by: Map<string, string[]> }>()
    const firedNow: FiredRule[] = []

    for (const rule of factRules) {
      if (!rule.conclusion_variable || rule.conclusion_value == null) continue
      const premise = evaluatePremise(rule, wm)
      if (premise < FIRE_THRESHOLD) continue
      if (!depthOf.has(rule.code)) depthOf.set(rule.code, iterations)

      const contribution = premise * rule.certainty
      const slot = derived.get(rule.conclusion_variable) ?? { values: new Map(), by: new Map() }
      const prev = slot.values.get(rule.conclusion_value)
      slot.values.set(
        rule.conclusion_value,
        prev == null ? contribution : combineCF(prev, contribution)
      )
      slot.by.set(rule.conclusion_value, [...(slot.by.get(rule.conclusion_value) ?? []), rule.code])
      derived.set(rule.conclusion_variable, slot)

      firedNow.push({
        code: rule.code,
        name: rule.name,
        explanation: rule.explanation,
        premise: round(premise),
        contribution: round(contribution),
        depth: depthOf.get(rule.code)!,
        chain: chainOf(rule, wm),
      })
    }

    // Nueva memoria = hechos base + hechos deducidos en esta pasada (sin doble conteo).
    const next: WorkingMemory = new Map(base)
    for (const [code, slot] of derived) {
      const positive = new Map([...slot.values].filter(([, cf]) => cf > 0).map(([v, cf]) => [v, Math.min(1, cf)]))
      if (!positive.size) continue
      next.set(code, { type: "categorical", values: positive, source: "inferido", derivedBy: slot.by })
    }

    const sig = JSON.stringify(
      [...next].map(([k, f]) => [k, f.type === "number" ? f.value : [...f.values].map(([v, c]) => [v, round(c)])])
    )
    wm = next
    fired = firedNow
    if (sig === signature) break // punto fijo alcanzado
    signature = sig
  }

  // ── Estrato 2: evaluación de hipótesis ─────────────────────────────────────
  const acc = new Map<string, { cf: number | null; supporting: FiredRule[]; opposing: FiredRule[] }>()
  const trace: InferenceResult["trace"] = fired.map((f) => {
    const r = factRules.find((x) => x.code === f.code)!
    return { ...f, conclusion: `${r.conclusion_variable} = ${r.conclusion_value}` }
  })

  for (const rule of hypRules) {
    if (!rule.hypothesis) continue
    const premise = evaluatePremise(rule, wm)
    if (premise < FIRE_THRESHOLD) continue
    const contribution = premise * rule.certainty
    const entry = acc.get(rule.hypothesis) ?? { cf: null, supporting: [], opposing: [] }
    entry.cf = entry.cf == null ? contribution : combineCF(entry.cf, contribution)
    const firedRule: FiredRule = {
      code: rule.code,
      name: rule.name,
      explanation: rule.explanation,
      premise: round(premise),
      contribution: round(contribution),
      depth: 1 + Math.max(0, ...chainOf(rule, wm).flatMap((c) => c.by.map((b) => depthOf.get(b) ?? 1))),
      chain: chainOf(rule, wm),
    }
    ;(contribution >= 0 ? entry.supporting : entry.opposing).push(firedRule)
    acc.set(rule.hypothesis, entry)
    trace.push({ ...firedRule, conclusion: rule.hypothesis })
  }

  const hypotheses: HypothesisResult[] = kb.hypotheses.map((h) => {
    const e = acc.get(h.code)
    const cf = e?.cf ?? 0
    let status: HypothesisResult["status"] = "none"
    if (h.kind === "advice") status = cf >= 0.5 ? "advice" : "none"
    else if (cf >= RECOMMEND_THRESHOLD) status = "recommended"
    else if (cf >= OPTIONAL_THRESHOLD) status = "optional"
    else if (e && cf <= REJECT_THRESHOLD) status = "rejected"
    return {
      code: h.code,
      name: h.name,
      description: h.description,
      kind: h.kind,
      certainty: round(cf),
      status,
      supporting: e?.supporting ?? [],
      opposing: e?.opposing ?? [],
    }
  })
  hypotheses.sort((a, b) => b.certainty - a.certainty)

  // Vista de la memoria de trabajo final (para auditoría y explicación).
  const names = new Map(kb.variables.map((v) => [v.code, v.name]))
  const facts: FactView[] = []
  for (const [code, f] of wm) {
    if (f.type === "number") {
      facts.push({ code, name: names.get(code) ?? code, source: f.source, value: f.value, certainty: 1 })
    } else {
      for (const [value, cf] of f.values) {
        facts.push({
          code,
          name: names.get(code) ?? code,
          source: f.source,
          value,
          certainty: round(cf),
          by: f.derivedBy.get(value),
        })
      }
    }
  }

  return { facts, hypotheses, trace, iterations }
}
