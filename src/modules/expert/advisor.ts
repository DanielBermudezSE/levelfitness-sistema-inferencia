import type { MedusaContainer } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  QueryContext,
} from "@medusajs/framework/utils"
import { EXPERT_MODULE } from "."
import type ExpertModuleService from "./service"
import {
  infer,
  type Answers,
  type FiredRule,
  type InferenceResult,
  type KnowledgeBase,
  type KbRule,
} from "./engine"

/**
 * Capa de aplicación del sistema experto:
 *   - Carga la base de conocimiento desde la BD (solo elementos activos).
 *   - Valida las respuestas del usuario (errores 400 descriptivos).
 *   - Ejecuta el motor de inferencia.
 *   - Resuelve productos del catálogo para cada hipótesis y asigna el
 *     presupuesto (satisfacción de restricciones).
 *   - Persiste la consulta (sistema transaccional).
 */

type ProductMatch = { categories?: string[]; include?: string; exclude?: string; group?: string }

export type LoadedKnowledge = {
  kb: KnowledgeBase
  variables: Awaited<ReturnType<ExpertModuleService["listExpertVariables"]>>
  hypotheses: Awaited<ReturnType<ExpertModuleService["listExpertHypotheses"]>>
}

const ALL = 10000

export async function loadKnowledge(container: MedusaContainer): Promise<LoadedKnowledge> {
  const service: ExpertModuleService = container.resolve(EXPERT_MODULE)
  const [variables, hypotheses, rules] = await Promise.all([
    service.listExpertVariables(
      { active: true },
      { relations: ["options"], order: { sort_order: "ASC" }, take: ALL }
    ),
    service.listExpertHypotheses({ active: true }, { order: { sort_order: "ASC" }, take: ALL }),
    service.listExpertRules(
      { active: true },
      {
        relations: ["conditions", "conditions.variable", "hypothesis", "conclusion_variable"],
        take: ALL,
      }
    ),
  ])

  const activeHyp = new Set(hypotheses.map((h) => h.code))
  const activeVar = new Set(variables.map((v) => v.code))

  const kbRules: KbRule[] = []
  for (const r of rules) {
    const hyp = r.hypothesis?.code ?? null
    const factVar = r.conclusion_variable?.code ?? null
    if (r.conclusion_type === "hypothesis" && (!hyp || !activeHyp.has(hyp))) continue
    if (r.conclusion_type === "fact" && (!factVar || !activeVar.has(factVar))) continue
    const conditions = [...(r.conditions ?? [])]
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({ variable: c.variable?.code ?? "", operator: c.operator, value: c.value }))
    if (conditions.some((c) => !c.variable || !activeVar.has(c.variable))) continue
    kbRules.push({
      code: r.code,
      name: r.name,
      conclusion_type: r.conclusion_type,
      hypothesis: hyp,
      conclusion_variable: factVar,
      conclusion_value: r.conclusion_value,
      certainty: Number(r.certainty),
      priority: r.priority,
      explanation: r.explanation,
      conditions,
    })
  }

  return {
    variables,
    hypotheses,
    kb: {
      variables: variables.map((v) => ({
        code: v.code,
        name: v.name,
        kind: v.kind,
        input_type: v.input_type,
      })),
      hypotheses: hypotheses.map((h) => ({
        code: h.code,
        name: h.name,
        description: h.description,
        kind: h.kind,
      })),
      rules: kbRules,
    },
  }
}

/** Valida las respuestas contra las variables de entrada. Devuelve errores legibles. */
export function validateAnswers(
  variables: LoadedKnowledge["variables"],
  answers: Answers
): string[] {
  const errors: string[] = []
  for (const v of variables) {
    if (v.kind !== "input") continue
    const raw = answers?.[v.code]
    if (raw == null || raw === "" || (Array.isArray(raw) && !raw.length)) {
      errors.push(`Falta responder: ${v.question ?? v.name}`)
      continue
    }
    if (v.input_type === "number") {
      const n = Number(raw)
      if (!Number.isFinite(n)) errors.push(`${v.name} debe ser un número.`)
      else if (v.min_value != null && n < Number(v.min_value))
        errors.push(`${v.name} debe ser mínimo ${v.min_value}${v.unit ? ` ${v.unit}` : ""}.`)
      else if (v.max_value != null && n > Number(v.max_value))
        errors.push(`${v.name} debe ser máximo ${v.max_value}${v.unit ? ` ${v.unit}` : ""}.`)
      continue
    }
    const allowed = new Set((v.options ?? []).map((o) => o.value))
    const list = Array.isArray(raw) ? raw.map(String) : [String(raw)]
    if (v.input_type === "single" && list.length !== 1) errors.push(`${v.name}: elige una sola opción.`)
    const bad = list.filter((x) => !allowed.has(x))
    if (bad.length) errors.push(`${v.name}: opción no válida (${bad.join(", ")}).`)
  }
  return errors
}

// ─────────────────────────────────────────────────────────────────────────────
// Productos y presupuesto
// ─────────────────────────────────────────────────────────────────────────────

export type ProductOut = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number
  variant_id: string
  level: string | null
}

type Candidate = ProductOut & { score: number; categories: string[] }

const LEVELS = ["principiante", "intermedio", "avanzado"]
const FEMALE_RE = /women|girl|mujer|fema\b|fema trope/i
const MALE_RE = /optimen|\bmen\b|testo|monster test(?! girl)|testabolic|wianabol|oxa-var/i

async function loadCatalog(container: MedusaContainer): Promise<Candidate[]> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "currency_code"],
  })
  const region =
    (regions as { id: string; currency_code: string }[]).find((r) => r.currency_code === "cop") ??
    (regions as { id: string; currency_code: string }[])[0]

  const { data } = await query.graph({
    entity: "product",
    fields: [
      "id",
      "title",
      "handle",
      "thumbnail",
      "categories.handle",
      "tags.value",
      "variants.id",
      "variants.calculated_price.calculated_amount",
    ],
    filters: { status: "published" },
    context: region
      ? {
          variants: {
            calculated_price: QueryContext({
              region_id: region.id,
              currency_code: region.currency_code,
            }),
          },
        }
      : undefined,
    pagination: { take: ALL },
  })

  const out: Candidate[] = []
  for (const p of data as {
    id: string
    title: string
    handle: string
    thumbnail: string | null
    categories?: { handle: string }[]
    tags?: { value: string }[]
    variants?: { id: string; calculated_price?: { calculated_amount?: number } }[]
  }[]) {
    let best: { id: string; price: number } | null = null
    for (const v of p.variants ?? []) {
      const price = v.calculated_price?.calculated_amount
      if (typeof price !== "number") continue
      if (!best || price < best.price) best = { id: v.id, price }
    }
    if (!best) continue
    out.push({
      id: p.id,
      title: p.title,
      handle: p.handle,
      thumbnail: p.thumbnail,
      price: best.price,
      variant_id: best.id,
      level: (p.tags ?? []).map((t) => t.value).find((t) => LEVELS.includes(t)) ?? null,
      categories: (p.categories ?? []).map((c) => c.handle),
      score: 0,
    })
  }
  return out
}

function matches(p: Candidate, m: ProductMatch | null | undefined): boolean {
  if (!m) return false
  if (m.categories?.length && !p.categories.some((c) => m.categories!.includes(c))) return false
  if (m.include && !new RegExp(m.include, "i").test(p.title)) return false
  if (m.exclude && new RegExp(m.exclude, "i").test(p.title)) return false
  return true
}

/** Puntaje del producto para este usuario (nivel y compatibilidad por sexo). */
function scoreFor(p: Candidate, answers: Answers): number | null {
  const sexo = answers.sexo
  if (sexo === "mujer" && MALE_RE.test(p.title)) return null
  if (sexo === "hombre" && FEMALE_RE.test(p.title)) return null
  let s = 0
  const exp = String(answers.experiencia ?? "")
  if (p.level && exp) {
    const d = Math.abs(LEVELS.indexOf(p.level) - LEVELS.indexOf(exp))
    s += d === 0 ? 0.3 : d === 1 ? 0 : -0.2
  }
  return s
}

export type Recommendation = {
  code: string
  name: string
  description: string
  usage: string | null
  certainty: number
  status: string
  reasons: FiredRule[]
  against: FiredRule[]
  product: ProductOut | null
  alternatives: ProductOut[]
  out_of_budget: boolean
  /** Si es sustituta de otra recomendación del mismo grupo de exclusión. */
  alternative_to?: string
}

const strip = (c: Candidate): ProductOut => ({
  id: c.id,
  title: c.title,
  handle: c.handle,
  thumbnail: c.thumbnail,
  price: c.price,
  variant_id: c.variant_id,
  level: c.level,
})

export type AdvisorOutput = {
  inference: InferenceResult
  recommended: Recommendation[]
  optional: Recommendation[]
  rejected: Recommendation[]
  advice: Recommendation[]
  budget: number | null
  total: number
}

export async function advise(
  container: MedusaContainer,
  loaded: LoadedKnowledge,
  answers: Answers
): Promise<AdvisorOutput> {
  const inference = infer(loaded.kb, answers)
  const catalog = await loadCatalog(container)
  const hypByCode = new Map(loaded.hypotheses.map((h) => [h.code, h]))
  const budget = answers.presupuesto != null ? Number(answers.presupuesto) : null

  // Candidatos compatibles por hipótesis.
  const candidatesOf = (code: string): Candidate[] => {
    const h = hypByCode.get(code)
    const match = h?.product_match as ProductMatch | null
    const list: Candidate[] = []
    for (const p of catalog) {
      if (!matches(p, match)) continue
      const s = scoreFor(p, answers)
      if (s == null) continue
      list.push({ ...p, score: s })
    }
    return list
  }

  const build = (h: InferenceResult["hypotheses"][number]): Recommendation => ({
    code: h.code,
    name: h.name,
    description: h.description,
    usage: hypByCode.get(h.code)?.usage ?? null,
    certainty: h.certainty,
    status: h.status,
    reasons: h.supporting,
    against: h.opposing,
    product: null,
    alternatives: [],
    out_of_budget: false,
  })

  const optional = inference.hypotheses
    .filter((h) => h.status === "optional" && h.kind === "product")
    .map(build)

  // Grupos de exclusión (sustitutos, p. ej. whey vs. isolate vs. vegetal): solo
  // se recomienda la de mayor certeza; las demás pasan a opcionales como
  // alternativa. Las hipótesis ya vienen ordenadas por certeza descendente.
  const recommended: Recommendation[] = []
  const groupWinner = new Map<string, string>()
  for (const h of inference.hypotheses) {
    if (h.status !== "recommended" || h.kind !== "product") continue
    const group = (hypByCode.get(h.code)?.product_match as ProductMatch | null)?.group
    const rec = build(h)
    if (group && groupWinner.has(group)) {
      rec.status = "optional"
      rec.alternative_to = groupWinner.get(group)
      optional.unshift(rec)
      continue
    }
    if (group) groupWinner.set(group, h.name)
    recommended.push(rec)
  }
  const rejected = inference.hypotheses.filter((h) => h.status === "rejected").map(build)
  const advice = inference.hypotheses.filter((h) => h.status === "advice").map(build)

  // Paso 1 — cobertura: la opción más económica para cada hipótesis, en orden
  // de certeza, mientras alcance el presupuesto.
  let remaining = budget ?? Number.POSITIVE_INFINITY
  const pools = new Map<string, Candidate[]>()
  const chosen = new Map<string, Candidate>()
  for (const rec of recommended) {
    const pool = candidatesOf(rec.code)
    pools.set(rec.code, pool)
    if (!pool.length) continue
    const cheapest = [...pool].sort((a, b) => a.price - b.price)[0]
    if (cheapest.price <= remaining) {
      chosen.set(rec.code, cheapest)
      remaining -= cheapest.price
    } else {
      rec.out_of_budget = true
      rec.alternatives = [strip(cheapest)]
    }
  }

  // Paso 2 — mejora: con el sobrante, sube a la opción mejor puntuada para tu
  // nivel (también en orden de certeza).
  for (const rec of recommended) {
    const current = chosen.get(rec.code)
    if (!current) continue
    const better = [...(pools.get(rec.code) ?? [])]
      .filter((c) => c.score > current.score)
      .sort((a, b) => b.score - a.score || a.price - b.price)
    for (const b of better) {
      const diff = b.price - current.price
      if (diff <= remaining) {
        chosen.set(rec.code, b)
        remaining -= diff
        break
      }
    }
  }

  for (const rec of recommended) {
    const sel = chosen.get(rec.code)
    if (!sel) continue
    rec.product = strip(sel)
    rec.alternatives = [...(pools.get(rec.code) ?? [])]
      .filter((c) => c.id !== sel.id)
      .sort((a, b) => b.score - a.score || a.price - b.price)
      .slice(0, 3)
      .map(strip)
  }

  // Opcionales: sugerencia más económica (fuera del presupuesto asignado).
  for (const rec of optional) {
    const cheapest = candidatesOf(rec.code).sort((a, b) => a.price - b.price)[0]
    if (cheapest) rec.product = strip(cheapest)
  }

  const total = recommended.reduce((s, r) => s + (r.product?.price ?? 0), 0)
  return { inference, recommended, optional, rejected, advice, budget, total }
}

/** Persiste la consulta y sus resultados (sistema transaccional). */
export async function saveConsultation(
  container: MedusaContainer,
  loaded: LoadedKnowledge,
  answers: Answers,
  out: AdvisorOutput,
  customerId: string | null
): Promise<string> {
  const service: ExpertModuleService = container.resolve(EXPERT_MODULE)
  const consultation = await service.createExpertConsultations({
    customer_id: customerId,
    answers: answers as Record<string, unknown>,
    facts: out.inference.facts as unknown as Record<string, unknown>,
    trace: out.inference.trace as unknown as Record<string, unknown>,
    budget: out.budget,
    total_recommended: out.total,
  })

  const hypId = new Map(loaded.hypotheses.map((h) => [h.code, h.id]))
  const rows = [
    ...out.advice.map((r) => ({ r, status: "advice" as const })),
    ...out.recommended.map((r) => ({ r, status: "recommended" as const })),
    ...out.optional.map((r) => ({ r, status: "optional" as const })),
    ...out.rejected.map((r) => ({ r, status: "rejected" as const })),
  ]
  if (rows.length) {
    await service.createExpertConsultationResults(
      rows
        .filter(({ r }) => hypId.has(r.code))
        .map(({ r, status }, i) => ({
          consultation_id: consultation.id,
          hypothesis_id: hypId.get(r.code)!,
          certainty: r.certainty,
          status,
          rank: i + 1,
          product_ids: [r.product?.id, ...r.alternatives.map((a) => a.id)].filter(
            Boolean
          ) as unknown as Record<string, unknown>,
          selected_product_id: r.product?.id ?? null,
          reasons: [...r.reasons, ...r.against].map((x) => x.code) as unknown as Record<
            string,
            unknown
          >,
        }))
    )
  }
  return consultation.id
}
