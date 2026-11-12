import { sdk } from "@/lib/sdk"

/**
 * Cliente del sistema experto (asesor de suplementos). Las preguntas vienen de
 * la base de conocimiento del backend, así que el cuestionario se arma solo.
 */

export type ExpertQuestion = {
  code: string
  name: string
  question: string | null
  help: string | null
  input_type: "single" | "multi" | "number"
  unit: string | null
  min: number | null
  max: number | null
  options: { value: string; label: string }[]
}

export type ExpertAnswers = Record<string, string | string[] | number>

export type FiredRule = {
  code: string
  name: string
  explanation: string
  premise: number
  contribution: number
  depth: number
  chain: { fact: string; value: string; by: string[] }[]
}

export type ExpertProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number
  variant_id: string
  level: string | null
}

export type ExpertRecommendation = {
  code: string
  name: string
  description: string
  usage: string | null
  certainty: number
  status: string
  reasons: FiredRule[]
  against: FiredRule[]
  product: ExpertProduct | null
  alternatives: ExpertProduct[]
  out_of_budget: boolean
  /** Sustituta de otra recomendación (mismo grupo, p. ej. tipos de proteína). */
  alternative_to?: string
}

export type ExpertFact = {
  code: string
  name: string
  source: string
  value: string | number
  label: string
  certainty: number
  by?: string[]
}

export type ExpertResult = {
  consultation_id: string
  budget: number | null
  total: number
  advice: ExpertRecommendation[]
  recommended: ExpertRecommendation[]
  optional: ExpertRecommendation[]
  rejected: ExpertRecommendation[]
  facts: ExpertFact[]
  fact_rules: Record<string, string>
  stats: { iterations: number; fired_rules: number; rules_in_kb: number }
}

export async function getExpertQuestions(): Promise<ExpertQuestion[]> {
  const { questions } = await sdk.client.fetch<{ questions: ExpertQuestion[] }>(
    "/store/expert/questions",
    { method: "GET" }
  )
  return questions ?? []
}

export async function consultExpert(answers: ExpertAnswers): Promise<ExpertResult> {
  return sdk.client.fetch<ExpertResult>("/store/expert/consult", {
    method: "POST",
    body: { answers },
  })
}

export async function sendExpertFeedback(
  consultationId: string,
  rating: number,
  comment?: string
): Promise<void> {
  await sdk.client.fetch(`/store/expert/consultations/${consultationId}/feedback`, {
    method: "POST",
    body: { rating, comment },
  })
}
