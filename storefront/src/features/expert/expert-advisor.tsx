"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowRight,
  BrainCircuit,
  Check,
  ChevronDown,
  ChevronLeft,
  Info,
  Loader2,
  RotateCcw,
  ShoppingCart,
  Sparkles,
  Star,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCart } from "@/providers/cart-provider"
import { formatPrice } from "@/utils/format"
import { cn } from "@/lib/utils"
import {
  consultExpert,
  getExpertQuestions,
  sendExpertFeedback,
  type ExpertAnswers,
  type ExpertProduct,
  type ExpertQuestion,
  type ExpertRecommendation,
  type ExpertResult,
  type FiredRule,
} from "@/services/expert"

type Phase = "intro" | "questions" | "loading" | "result" | "error"

const BUDGET_PICKS = [100000, 200000, 300000, 500000]

/**
 * Asesor experto: cuestionario dinámico (las preguntas vienen de la base de
 * conocimiento) y presentación de la inferencia con su explicación.
 */
export function ExpertAdvisor() {
  const [phase, setPhase] = useState<Phase>("intro")
  const [questions, setQuestions] = useState<ExpertQuestion[]>([])
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<ExpertAnswers>({})
  const [result, setResult] = useState<ExpertResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getExpertQuestions()
      .then((qs) => {
        if (!qs.length) setError("El asesor aún no está disponible. Vuelve pronto.")
        setQuestions(qs)
      })
      .catch(() => setError("No pudimos cargar el asesor. Intenta de nuevo en un momento."))
  }, [])

  const submit = async (final: ExpertAnswers) => {
    setPhase("loading")
    try {
      const res = await consultExpert(final)
      setResult(res)
      setPhase("result")
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (e) {
      setError((e as Error)?.message || "No pudimos procesar tus respuestas.")
      setPhase("error")
    }
  }

  const restart = () => {
    setAnswers({})
    setStep(0)
    setResult(null)
    setError(null)
    setPhase("questions")
  }

  if (phase === "intro") {
    return <Intro ready={questions.length > 0} count={questions.length} error={error} onStart={() => setPhase("questions")} />
  }

  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <BrainCircuit className="h-12 w-12 animate-pulse text-accent" />
        <p className="text-lg font-bold">Analizando tu perfil…</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          El motor de inferencia está evaluando las reglas de nuestros expertos con tus respuestas.
        </p>
      </div>
    )
  }

  if (phase === "error") {
    return (
      <div className="flex flex-col items-center gap-4 py-24 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" />
        <p className="max-w-md text-muted-foreground">{error}</p>
        <Button variant="accent" onClick={restart}>Volver a intentar</Button>
      </div>
    )
  }

  if (phase === "result" && result) {
    return <ResultView result={result} onRestart={restart} />
  }

  const q = questions[step]
  if (!q) return null

  const next = (value: ExpertAnswers[string]) => {
    const updated = { ...answers, [q.code]: value }
    setAnswers(updated)
    if (step + 1 < questions.length) setStep(step + 1)
    else submit(updated)
  }

  return (
    <div className="mx-auto max-w-2xl py-8">
      <div className="mb-6">
        <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
          <span>Pregunta {step + 1} de {questions.length}</span>
          <span>{Math.round((step / questions.length) * 100)}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-accent transition-all duration-300"
            style={{ width: `${(step / questions.length) * 100}%` }}
          />
        </div>
      </div>

      <QuestionStep key={q.code} question={q} value={answers[q.code]} onNext={next} />

      {step > 0 && (
        <button
          type="button"
          onClick={() => setStep(step - 1)}
          className="mt-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Anterior
        </button>
      )}
    </div>
  )
}

function Intro({
  ready,
  count,
  error,
  onStart,
}: {
  ready: boolean
  count: number
  error: string | null
  onStart: () => void
}) {
  return (
    <div className="mx-auto max-w-2xl py-12 text-center">
      <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent/15">
        <Sparkles className="h-8 w-8 text-accent" />
      </div>
      <h1 className="text-3xl font-black tracking-tight sm:text-4xl">Asesor experto en suplementos</h1>
      <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
        Responde {count || "unas"} preguntas sobre tu objetivo, tu entrenamiento, tu salud y tu presupuesto. Nuestro
        sistema experto razona con el conocimiento de nutricionistas deportivos y te dice qué te conviene, qué no y
        por qué.
      </p>
      <ul className="mx-auto mt-6 grid max-w-lg gap-2 text-left text-sm sm:grid-cols-3">
        {[
          "Considera tu salud y descarta lo contraindicado",
          "Arma tu stack dentro de tu presupuesto",
          "Te explica cada recomendación",
        ].map((t) => (
          <li key={t} className="flex items-start gap-2 rounded-lg border border-border bg-card p-3">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <span>{t}</span>
          </li>
        ))}
      </ul>
      {error ? (
        <p className="mt-6 text-sm text-destructive">{error}</p>
      ) : (
        <Button variant="accent" size="lg" className="mt-8" onClick={onStart} disabled={!ready}>
          {ready ? (
            <>Empezar <ArrowRight className="h-4 w-4" /></>
          ) : (
            <><Loader2 className="h-4 w-4 animate-spin" /> Cargando…</>
          )}
        </Button>
      )}
      <p className="mx-auto mt-6 max-w-md text-xs text-muted-foreground">
        Orientación general sobre suplementos de venta libre. No reemplaza la valoración de un profesional de la salud.
      </p>
    </div>
  )
}

function QuestionStep({
  question: q,
  value,
  onNext,
}: {
  question: ExpertQuestion
  value: ExpertAnswers[string] | undefined
  onNext: (v: ExpertAnswers[string]) => void
}) {
  const [num, setNum] = useState(value != null && !Array.isArray(value) ? String(value) : "")
  const [multi, setMulti] = useState<string[]>(Array.isArray(value) ? value : [])
  const [err, setErr] = useState<string | null>(null)

  const submitNumber = () => {
    const n = Number(num)
    if (num.trim() === "" || !Number.isFinite(n)) return setErr("Ingresa un número.")
    if (q.min != null && n < q.min) return setErr(`El mínimo es ${q.min}${q.unit ? ` ${q.unit}` : ""}.`)
    if (q.max != null && n > q.max) return setErr(`El máximo es ${q.max}${q.unit ? ` ${q.unit}` : ""}.`)
    onNext(n)
  }

  const toggleMulti = (v: string) => {
    setMulti((cur) => {
      if (v === "ninguna") return cur.includes("ninguna") ? [] : ["ninguna"]
      const base = cur.filter((x) => x !== "ninguna")
      return base.includes(v) ? base.filter((x) => x !== v) : [...base, v]
    })
  }

  return (
    <div>
      <h2 className="text-2xl font-extrabold sm:text-3xl">{q.question ?? q.name}</h2>
      {q.help && <p className="mt-2 text-sm text-muted-foreground">{q.help}</p>}

      {q.input_type === "single" && (
        <div className="mt-6 grid gap-2">
          {q.options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onNext(o.value)}
              className={cn(
                "flex items-center justify-between rounded-xl border px-4 py-3.5 text-left font-medium transition-colors",
                value === o.value
                  ? "border-accent bg-accent/10"
                  : "border-border bg-card hover:border-accent/60 hover:bg-secondary/50"
              )}
            >
              {o.label}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      )}

      {q.input_type === "multi" && (
        <>
          <div className="mt-6 grid gap-2 sm:grid-cols-2">
            {q.options.map((o) => {
              const on = multi.includes(o.value)
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => toggleMulti(o.value)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                    on ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-secondary/50"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                      on ? "border-accent bg-accent text-accent-foreground" : "border-muted-foreground/40"
                    )}
                  >
                    {on && <Check className="h-3.5 w-3.5" />}
                  </span>
                  {o.label}
                </button>
              )
            })}
          </div>
          <Button variant="accent" size="lg" className="mt-6" disabled={!multi.length} onClick={() => onNext(multi)}>
            Continuar <ArrowRight className="h-4 w-4" />
          </Button>
        </>
      )}

      {q.input_type === "number" && (
        <form
          className="mt-6"
          onSubmit={(e) => {
            e.preventDefault()
            submitNumber()
          }}
        >
          {q.code === "presupuesto" && (
            <div className="mb-3 flex flex-wrap gap-2">
              {BUDGET_PICKS.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => {
                    setNum(String(b))
                    setErr(null)
                  }}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-sm font-semibold",
                    num === String(b) ? "border-accent bg-accent text-accent-foreground" : "border-border hover:bg-secondary"
                  )}
                >
                  {formatPrice(b, "COP")}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-center gap-2">
            <Input
              autoFocus
              type="number"
              inputMode="decimal"
              value={num}
              min={q.min ?? undefined}
              max={q.max ?? undefined}
              onChange={(e) => {
                setNum(e.target.value)
                setErr(null)
              }}
              className="h-12 max-w-xs text-lg"
            />
            {q.unit && <span className="text-sm text-muted-foreground">{q.unit}</span>}
          </div>
          {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
          <Button type="submit" variant="accent" size="lg" className="mt-6">
            Continuar <ArrowRight className="h-4 w-4" />
          </Button>
        </form>
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Resultados
// ─────────────────────────────────────────────────────────────────────────────

function ResultView({ result, onRestart }: { result: ExpertResult; onRestart: () => void }) {
  const { addItem, openMiniCart } = useCart()
  const [added, setAdded] = useState<Set<string>>(new Set())
  const [addingAll, setAddingAll] = useState(false)

  const selected = useMemo(
    () => result.recommended.map((r) => r.product).filter(Boolean) as ExpertProduct[],
    [result]
  )

  const add = async (p: ExpertProduct) => {
    await addItem(p.variant_id, 1, { name: p.title, price: p.price, currency: "COP" })
    setAdded((s) => new Set(s).add(p.id))
  }

  const addAll = async () => {
    setAddingAll(true)
    try {
      for (const p of selected) if (!added.has(p.id)) await add(p)
      openMiniCart()
    } finally {
      setAddingAll(false)
    }
  }

  const derived = result.facts.filter((f) => f.code !== "imc")
  const imc = result.facts.find((f) => f.code === "imc")
  const inBudget = result.recommended.filter((r) => !r.out_of_budget)
  const stretch = result.recommended.filter((r) => r.out_of_budget)

  return (
    <div className="mx-auto max-w-4xl py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-accent">Resultado del asesor experto</p>
          <h1 className="text-3xl font-black tracking-tight">Tu recomendación personalizada</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {result.stats.fired_rules} de {result.stats.rules_in_kb} reglas aplicadas · {result.stats.iterations} ciclos de inferencia
          </p>
        </div>
        <Button variant="outline" onClick={onRestart}>
          <RotateCcw className="h-4 w-4" /> Repetir test
        </Button>
      </div>

      {/* Avisos (p. ej. consultar al médico) */}
      {result.advice.map((a) => (
        <div key={a.code} className="mt-6 flex gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
          <div>
            <p className="font-bold">{a.name}</p>
            <p className="text-sm text-muted-foreground">{a.description}</p>
            <ul className="mt-1 list-disc pl-5 text-sm text-muted-foreground">
              {a.reasons.map((r) => (
                <li key={r.code}>{r.explanation}</li>
              ))}
            </ul>
          </div>
        </div>
      ))}

      {/* Lo que el sistema dedujo */}
      {(derived.length > 0 || imc) && (
        <section className="mt-6 rounded-xl border border-border bg-card p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold">
            <BrainCircuit className="h-4 w-4 text-accent" /> Lo que deducimos de tu perfil
          </p>
          <div className="flex flex-wrap gap-2">
            {imc && <FactChip label={`IMC ${imc.value}`} />}
            {derived.map((f, i) => (
              <FactChip
                key={i}
                label={`${f.name}: ${f.label}`}
                certainty={f.certainty}
                title={(f.by ?? []).map((c) => result.fact_rules[c]).filter(Boolean).join(" · ")}
              />
            ))}
          </div>
        </section>
      )}

      {/* Stack recomendado */}
      <section className="mt-8">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-extrabold">Te recomendamos</h2>
            {result.budget != null && (
              <p className="text-sm text-muted-foreground">
                Total {formatPrice(result.total, "COP")} de tu presupuesto de {formatPrice(result.budget, "COP")}
              </p>
            )}
          </div>
          {selected.length > 0 && (
            <Button variant="accent" onClick={addAll} disabled={addingAll}>
              {addingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" />}
              Añadir todo al carrito
            </Button>
          )}
        </div>

        {result.recommended.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Con tu perfil no encontramos un suplemento que te convenga con suficiente certeza. Prioriza tu alimentación y
            descanso{result.advice.length ? ", y consulta a un profesional" : ""}.
          </p>
        ) : inBudget.length === 0 ? (
          <p className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
            Con el presupuesto indicado no alcanza para ninguna de tus recomendaciones. Mira abajo las opciones
            priorizadas y desde cuánto cuestan.
          </p>
        ) : (
          <div className="grid gap-4">
            {inBudget.map((r) => (
              <RecommendationCard
                key={r.code}
                rec={r}
                factRules={result.fact_rules}
                added={!!r.product && added.has(r.product.id)}
                onAdd={add}
              />
            ))}
          </div>
        )}
      </section>

      {/* Recomendado, pero no cupo en el presupuesto (orden de prioridad) */}
      {stretch.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-extrabold">Si amplías tu presupuesto</h2>
          <p className="mb-3 text-sm text-muted-foreground">
            También te convienen, en este orden de prioridad:
          </p>
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {stretch.map((r) => {
              const cheapest = r.alternatives[0]
              return (
                <div key={r.code} className="flex flex-wrap items-center gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{r.name}</p>
                    <p className="text-sm text-muted-foreground">{r.reasons[0]?.explanation ?? r.description}</p>
                  </div>
                  <Confidence value={r.certainty} />
                  {cheapest && (
                    <Link
                      href={`/productos/${cheapest.handle}`}
                      className="w-full text-sm font-semibold text-accent hover:underline sm:w-auto"
                    >
                      Desde {formatPrice(cheapest.price, "COP")}
                    </Link>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {/* Opcionales */}
      {result.optional.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-extrabold">También podrías considerar</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {result.optional.map((r) => (
              <div key={r.code} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-bold">{r.name}</p>
                  <Confidence value={r.certainty} />
                </div>
                {r.alternative_to && (
                  <p className="mt-1 text-xs font-semibold text-accent">Alternativa a: {r.alternative_to}</p>
                )}
                <p className="mt-1 text-sm text-muted-foreground">{r.reasons[0]?.explanation ?? r.description}</p>
                {r.product && (
                  <Link href={`/productos/${r.product.handle}`} className="mt-2 inline-block text-sm font-semibold text-accent hover:underline">
                    {r.product.title} · {formatPrice(r.product.price, "COP")}
                  </Link>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Descartados */}
      {result.rejected.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-1 text-lg font-extrabold">Lo que no te recomendamos</h2>
          <p className="mb-3 text-sm text-muted-foreground">Y por qué, según tu perfil:</p>
          <div className="grid gap-2">
            {result.rejected.map((r) => (
              <div key={r.code} className="flex gap-3 rounded-xl border border-border bg-card p-4">
                <X className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
                <div>
                  <p className="font-bold">{r.name}</p>
                  <ul className="mt-1 space-y-1 text-sm text-muted-foreground">
                    {r.against.map((a) => (
                      <li key={a.code}>
                        {a.explanation}
                        <ChainNote rule={a} factRules={result.fact_rules} />
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <FeedbackBox consultationId={result.consultation_id} />

      <p className="mt-8 flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        Recomendación orientativa generada por un sistema experto a partir de conocimiento de nutrición deportiva. No es
        un diagnóstico ni una prescripción: si tienes una condición médica, consulta a un profesional antes de tomar
        suplementos y respeta siempre la porción indicada en la etiqueta.
      </p>
    </div>
  )
}

function FactChip({ label, certainty, title }: { label: string; certainty?: number; title?: string }) {
  return (
    <span
      title={title}
      className="rounded-full border border-border bg-secondary/40 px-3 py-1 text-xs font-medium"
    >
      {label}
      {certainty != null && certainty < 1 && (
        <span className="ml-1 text-muted-foreground">({Math.round(certainty * 100)}%)</span>
      )}
    </span>
  )
}

function Confidence({ value }: { value: number }) {
  const pct = Math.round(Math.max(0, value) * 100)
  return (
    <span className="shrink-0 rounded-full bg-accent/15 px-2.5 py-1 text-xs font-bold text-accent">
      {pct}% de afinidad
    </span>
  )
}

/** Muestra de qué hechos deducidos dependió una regla (cadena de inferencia). */
function ChainNote({ rule, factRules }: { rule: FiredRule; factRules: Record<string, string> }) {
  if (!rule.chain?.length) return null
  const texts = rule.chain.flatMap((c) => c.by.map((code) => factRules[code])).filter(Boolean)
  if (!texts.length) return null
  return (
    <span className="mt-0.5 block text-xs text-muted-foreground/80">
      Lo dedujimos porque: {[...new Set(texts)].join(" · ")}
    </span>
  )
}

function RecommendationCard({
  rec,
  factRules,
  added,
  onAdd,
}: {
  rec: ExpertRecommendation
  factRules: Record<string, string>
  added: boolean
  onAdd: (p: ExpertProduct) => Promise<void>
}) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const p = rec.product

  return (
    <article className="rounded-xl border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row">
        {p && (
          <Link
            href={`/productos/${p.handle}`}
            className="relative mx-auto h-28 w-28 shrink-0 overflow-hidden rounded-lg bg-white sm:mx-0"
          >
            {p.thumbnail && <Image src={p.thumbnail} alt={p.title} fill sizes="112px" className="object-contain p-1" />}
          </Link>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-lg font-extrabold">{rec.name}</p>
              <p className="text-sm text-muted-foreground">{rec.description}</p>
            </div>
            <Confidence value={rec.certainty} />
          </div>

          {p ? (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-secondary/40 p-3">
              <div className="min-w-0">
                <Link href={`/productos/${p.handle}`} className="line-clamp-1 text-sm font-semibold hover:underline">
                  {p.title}
                </Link>
                <p className="text-sm font-bold">{formatPrice(p.price, "COP")}</p>
              </div>
              <Button
                variant={added ? "outline" : "accent"}
                size="sm"
                disabled={adding || added}
                onClick={async () => {
                  setAdding(true)
                  try {
                    await onAdd(p)
                  } finally {
                    setAdding(false)
                  }
                }}
              >
                {added ? <><Check className="h-4 w-4" /> Añadido</> : adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <><ShoppingCart className="h-4 w-4" /> Añadir</>}
              </Button>
            </div>
          ) : rec.out_of_budget ? (
            <div className="mt-3 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <p className="font-semibold">No alcanzó tu presupuesto</p>
              {rec.alternatives[0] && (
                <p className="text-muted-foreground">
                  Opción más económica:{" "}
                  <Link href={`/productos/${rec.alternatives[0].handle}`} className="font-semibold text-foreground hover:underline">
                    {rec.alternatives[0].title} · {formatPrice(rec.alternatives[0].price, "COP")}
                  </Link>
                </p>
              )}
            </div>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">Pronto tendremos un producto de esta familia en la tienda.</p>
          )}

          {rec.usage && (
            <p className="mt-3 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">Cómo usarlo: </span>
              {rec.usage}
            </p>
          )}

          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent"
          >
            ¿Por qué te lo recomendamos?
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
          </button>

          {open && (
            <div className="mt-2 space-y-2 text-sm">
              <ul className="space-y-1.5">
                {rec.reasons.map((r) => (
                  <li key={r.code} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                    <span>
                      {r.explanation}
                      <ChainNote rule={r} factRules={factRules} />
                    </span>
                  </li>
                ))}
                {rec.against.map((r) => (
                  <li key={r.code} className="flex gap-2 text-muted-foreground">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                    <span>A tener en cuenta: {r.explanation}</span>
                  </li>
                ))}
              </ul>
              {rec.alternatives.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground">Otras opciones de esta familia:</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {rec.alternatives.map((a) => (
                      <Link
                        key={a.id}
                        href={`/productos/${a.handle}`}
                        className="rounded-full border border-border px-3 py-1 text-xs hover:bg-secondary"
                      >
                        {a.title} · {formatPrice(a.price, "COP")}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </article>
  )
}

function FeedbackBox({ consultationId }: { consultationId: string }) {
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [comment, setComment] = useState("")
  const [state, setState] = useState<"idle" | "sending" | "done">("idle")

  if (state === "done") {
    return (
      <div className="mt-10 rounded-xl border border-accent/40 bg-accent/5 p-5 text-center text-sm font-semibold">
        ¡Gracias! Tu opinión ayuda a nuestros expertos a mejorar el asesor.
      </div>
    )
  }

  return (
    <section className="mt-10 rounded-xl border border-border bg-card p-5">
      <p className="font-bold">¿Te sirvió esta recomendación?</p>
      <div className="mt-2 flex gap-1" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" aria-label={`${n} estrellas`} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>
            <Star className={cn("h-7 w-7", (hover || rating) >= n ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40")} />
          </button>
        ))}
      </div>
      {rating > 0 && (
        <div className="mt-3 flex flex-col gap-2 sm:flex-row">
          <Input value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comentario (opcional)" />
          <Button
            variant="accent"
            disabled={state === "sending"}
            onClick={async () => {
              setState("sending")
              try {
                await sendExpertFeedback(consultationId, rating, comment)
              } finally {
                setState("done")
              }
            }}
          >
            Enviar
          </Button>
        </div>
      )}
    </section>
  )
}
