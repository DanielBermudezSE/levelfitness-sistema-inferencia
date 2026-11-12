import { defineRouteConfig } from "@medusajs/admin-sdk"
import { LightBulb, Plus, PencilSquare, Trash } from "@medusajs/icons"
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  IconButton,
  Input,
  Label,
  Select,
  Switch,
  Tabs,
  Text,
  Textarea,
  Checkbox,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { sdk } from "../../lib/sdk"

/**
 * Sistema experto — módulo de adquisición y mantenimiento del conocimiento.
 * Permite al ingeniero del conocimiento/experto revisar, crear y ajustar las
 * reglas (factor de certeza, condiciones, estado), activar hipótesis, probar
 * el motor con un caso y auditar las consultas de los usuarios.
 */

type Option = { value: string; label: string }
type Variable = {
  id: string
  code: string
  name: string
  question: string | null
  kind: "input" | "derived"
  input_type: "single" | "multi" | "number"
  unit: string | null
  active: boolean
  options: Option[]
}
type Hypothesis = {
  id: string
  code: string
  name: string
  description: string
  kind: "product" | "advice"
  usage: string | null
  active: boolean
}
type Condition = { variable: string; variable_name?: string; operator: string; value: string }
type Rule = {
  id: string
  code: string
  name: string
  conclusion_type: "hypothesis" | "fact"
  hypothesis: { id: string; code: string; name: string } | null
  conclusion_variable: { id: string; code: string; name: string } | null
  conclusion_value: string | null
  certainty: number
  priority: number
  explanation: string
  source: string | null
  active: boolean
  conditions: Condition[]
}
type Knowledge = {
  variables: Variable[]
  hypotheses: Hypothesis[]
  rules: Rule[]
  stats: { consultations: number; rated: number; avg_rating: number | null }
}

const OPS: Record<string, string> = {
  eq: "=",
  neq: "≠",
  in: "es uno de",
  not_in: "no es ninguno de",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
  contains: "incluye",
  not_contains: "no incluye",
}

const cfColor = (cf: number) => (cf <= -0.5 ? "red" : cf < 0 ? "orange" : cf >= 0.7 ? "green" : "blue")

const ExpertPage = () => {
  const [kb, setKb] = useState<Knowledge | null>(null)

  const load = async () => {
    try {
      setKb(await sdk.client.fetch<Knowledge>("/admin/expert/knowledge"))
    } catch {
      toast.error("No se pudo cargar la base de conocimiento.")
    }
  }
  useEffect(() => {
    load()
  }, [])

  if (!kb) {
    return (
      <Container className="p-6">
        <Text className="text-ui-fg-subtle">Cargando base de conocimiento…</Text>
      </Container>
    )
  }

  const factRules = kb.rules.filter((r) => r.conclusion_type === "fact").length
  return (
    <Container className="divide-y p-0">
      <div className="flex items-center gap-2 px-6 py-4">
        <LightBulb className="text-ui-fg-subtle" />
        <Heading level="h1">Sistema experto</Heading>
      </div>

      <Tabs defaultValue="resumen" className="px-6 py-4">
        <Tabs.List>
          <Tabs.Trigger value="resumen">Resumen</Tabs.Trigger>
          <Tabs.Trigger value="reglas">Reglas ({kb.rules.length})</Tabs.Trigger>
          <Tabs.Trigger value="hipotesis">Hipótesis ({kb.hypotheses.length})</Tabs.Trigger>
          <Tabs.Trigger value="variables">Variables ({kb.variables.length})</Tabs.Trigger>
          <Tabs.Trigger value="probar">Probar motor</Tabs.Trigger>
          <Tabs.Trigger value="consultas">Consultas ({kb.stats.consultations})</Tabs.Trigger>
        </Tabs.List>

        <Tabs.Content value="resumen" className="pt-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Stat label="Variables" value={kb.variables.length} hint={`${kb.variables.filter((v) => v.kind === "input").length} preguntas`} />
            <Stat label="Hipótesis" value={kb.hypotheses.length} hint={`${kb.hypotheses.filter((h) => h.active).length} activas`} />
            <Stat label="Reglas" value={kb.rules.length} hint={`${factRules} de hechos · ${kb.rules.length - factRules} de hipótesis`} />
            <Stat
              label="Consultas"
              value={kb.stats.consultations}
              hint={kb.stats.avg_rating != null ? `★ ${kb.stats.avg_rating} (${kb.stats.rated} calificadas)` : "Sin calificaciones"}
            />
          </div>
          <Text size="small" className="mt-4 text-ui-fg-subtle">
            Motor de inferencia con encadenamiento hacia adelante hasta punto fijo, factores de certeza
            (MYCIN), hechos derivados, resolución de conflictos por prioridad y módulo de explicación. El
            conocimiento vive en la base de datos: los cambios aquí aplican de inmediato en el asesor de la tienda.
          </Text>
        </Tabs.Content>

        <Tabs.Content value="reglas" className="pt-4">
          <RulesTab kb={kb} reload={load} />
        </Tabs.Content>
        <Tabs.Content value="hipotesis" className="pt-4">
          <HypothesesTab kb={kb} reload={load} />
        </Tabs.Content>
        <Tabs.Content value="variables" className="pt-4">
          <VariablesTab kb={kb} />
        </Tabs.Content>
        <Tabs.Content value="probar" className="pt-4">
          <TestTab kb={kb} />
        </Tabs.Content>
        <Tabs.Content value="consultas" className="pt-4">
          <ConsultationsTab />
        </Tabs.Content>
      </Tabs>
    </Container>
  )
}

const Stat = ({ label, value, hint }: { label: string; value: number; hint: string }) => (
  <div className="rounded-lg border p-4">
    <Text size="xsmall" className="text-ui-fg-subtle">{label}</Text>
    <Text size="xlarge" weight="plus">{value}</Text>
    <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text>
  </div>
)

/** Etiqueta legible de un valor según las opciones de la variable. */
function useLabeler(kb: Knowledge) {
  return useMemo(() => {
    const byCode = new Map(kb.variables.map((v) => [v.code, v]))
    return (variable: string, value: string) => {
      const v = byCode.get(variable)
      if (!v || v.input_type === "number") return value
      return value
        .split(",")
        .map((x) => v.options.find((o) => o.value === x.trim())?.label ?? x)
        .join(", ")
    }
  }, [kb])
}

// ─────────────────────────────────────────────────────────────────────────────
// Reglas
// ─────────────────────────────────────────────────────────────────────────────
const RulesTab = ({ kb, reload }: { kb: Knowledge; reload: () => void }) => {
  const label = useLabeler(kb)
  const [filter, setFilter] = useState("all")
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<Rule | "new" | null>(null)

  const rules = kb.rules.filter((r) => {
    if (filter === "fact" && r.conclusion_type !== "fact") return false
    if (filter !== "all" && filter !== "fact" && r.hypothesis?.code !== filter) return false
    if (q && !`${r.code} ${r.name} ${r.explanation}`.toLowerCase().includes(q.toLowerCase())) return false
    return true
  })

  const toggle = async (r: Rule) => {
    try {
      await sdk.client.fetch(`/admin/expert/rules/${r.id}`, { method: "POST", body: { active: !r.active } })
      reload()
    } catch {
      toast.error("No se pudo cambiar el estado.")
    }
  }
  const remove = async (r: Rule) => {
    if (!window.confirm(`¿Eliminar la regla ${r.code}?`)) return
    try {
      await sdk.client.fetch(`/admin/expert/rules/${r.id}`, { method: "DELETE" })
      toast.success("Regla eliminada.")
      reload()
    } catch {
      toast.error("No se pudo eliminar.")
    }
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="w-64">
          <Select value={filter} onValueChange={setFilter}>
            <Select.Trigger><Select.Value /></Select.Trigger>
            <Select.Content>
              <Select.Item value="all">Todas las reglas</Select.Item>
              <Select.Item value="fact">Hechos intermedios</Select.Item>
              {kb.hypotheses.map((h) => (
                <Select.Item key={h.code} value={h.code}>{h.name}</Select.Item>
              ))}
            </Select.Content>
          </Select>
        </div>
        <Input className="w-64" placeholder="Buscar…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="ml-auto">
          <Button variant="primary" size="small" onClick={() => setEditing("new")}>
            <Plus /> Nueva regla
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {rules.map((r) => (
          <div key={r.id} className={`rounded-lg border p-3 ${r.active ? "" : "opacity-50"}`}>
            <div className="flex items-start gap-3">
              <Badge size="2xsmall" color="grey">{r.code}</Badge>
              <div className="min-w-0 flex-1">
                <Text size="small" weight="plus">{r.name}</Text>
                <Text size="xsmall" className="mt-1 font-mono text-ui-fg-subtle">
                  SI{" "}
                  {r.conditions.map((c, i) => (
                    <span key={i}>
                      {i > 0 && " Y "}
                      {c.variable_name || c.variable} {OPS[c.operator] ?? c.operator} {label(c.variable, c.value)}
                    </span>
                  ))}{" "}
                  ENTONCES{" "}
                  {r.conclusion_type === "fact"
                    ? `${r.conclusion_variable?.name} = ${label(r.conclusion_variable?.code ?? "", r.conclusion_value ?? "")}`
                    : r.hypothesis?.name}
                </Text>
                <Text size="xsmall" className="mt-1 text-ui-fg-muted">{r.explanation}</Text>
              </div>
              <Badge size="2xsmall" color={cfColor(r.certainty)}>FC {r.certainty}</Badge>
              <Switch checked={r.active} onCheckedChange={() => toggle(r)} />
              <IconButton size="small" variant="transparent" onClick={() => setEditing(r)}><PencilSquare /></IconButton>
              <IconButton size="small" variant="transparent" onClick={() => remove(r)}><Trash className="text-ui-fg-error" /></IconButton>
            </div>
          </div>
        ))}
        {!rules.length && <Text className="text-ui-fg-subtle">Sin reglas para este filtro.</Text>}
      </div>

      {editing && (
        <RuleDrawer
          kb={kb}
          rule={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

const RuleDrawer = ({
  kb,
  rule,
  onClose,
  onSaved,
}: {
  kb: Knowledge
  rule: Rule | null
  onClose: () => void
  onSaved: () => void
}) => {
  const [code, setCode] = useState(rule?.code ?? "")
  const [name, setName] = useState(rule?.name ?? "")
  const [type, setType] = useState<"hypothesis" | "fact">(rule?.conclusion_type ?? "hypothesis")
  const [hyp, setHyp] = useState(rule?.hypothesis?.code ?? kb.hypotheses[0]?.code ?? "")
  const [factVar, setFactVar] = useState(rule?.conclusion_variable?.code ?? "")
  const [factVal, setFactVal] = useState(rule?.conclusion_value ?? "")
  const [cf, setCf] = useState(String(rule?.certainty ?? "0.5"))
  const [priority, setPriority] = useState(String(rule?.priority ?? 50))
  const [explanation, setExplanation] = useState(rule?.explanation ?? "")
  const [conds, setConds] = useState<Condition[]>(
    rule?.conditions.map((c) => ({ variable: c.variable, operator: c.operator, value: c.value })) ?? [
      { variable: kb.variables[0]?.code ?? "", operator: "eq", value: "" },
    ]
  )
  const [saving, setSaving] = useState(false)

  const derived = kb.variables.filter((v) => v.kind === "derived" && v.input_type !== "number")
  const varOf = (c: string) => kb.variables.find((v) => v.code === c)

  const save = async () => {
    setSaving(true)
    try {
      const body = {
        code,
        name,
        conclusion_type: type,
        hypothesis_code: type === "hypothesis" ? hyp : null,
        conclusion_variable_code: type === "fact" ? factVar : null,
        conclusion_value: type === "fact" ? factVal : null,
        certainty: Number(cf),
        priority: Number(priority),
        explanation,
        conditions: conds,
      }
      await sdk.client.fetch(rule ? `/admin/expert/rules/${rule.id}` : "/admin/expert/rules", {
        method: "POST",
        body,
      })
      toast.success(rule ? "Regla actualizada." : "Regla creada.")
      onSaved()
    } catch (e) {
      toast.error((e as Error).message || "No se pudo guardar la regla.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Drawer open onOpenChange={(o) => !o && onClose()}>
      <Drawer.Content className="max-w-xl">
        <Drawer.Header>
          <Drawer.Title>{rule ? `Editar ${rule.code}` : "Nueva regla"}</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="flex flex-col gap-4 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label size="small">Código</Label>
              <Input value={code} onChange={(e) => setCode(e.target.value)} disabled={!!rule} placeholder="R90" />
            </div>
            <div className="col-span-2">
              <Label size="small">Nombre</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
          </div>

          <div>
            <Label size="small">Condiciones (todas deben cumplirse)</Label>
            <div className="mt-1 flex flex-col gap-2">
              {conds.map((c, i) => {
                const v = varOf(c.variable)
                return (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-40">
                      <Select value={c.variable} onValueChange={(val) => setConds(conds.map((x, j) => (j === i ? { ...x, variable: val, value: "" } : x)))}>
                        <Select.Trigger><Select.Value /></Select.Trigger>
                        <Select.Content>
                          {kb.variables.map((vv) => (
                            <Select.Item key={vv.code} value={vv.code}>{vv.name}</Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                    <div className="w-36">
                      <Select value={c.operator} onValueChange={(val) => setConds(conds.map((x, j) => (j === i ? { ...x, operator: val } : x)))}>
                        <Select.Trigger><Select.Value /></Select.Trigger>
                        <Select.Content>
                          {Object.entries(OPS).map(([k, l]) => (
                            <Select.Item key={k} value={k}>{l}</Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>
                    <Input
                      className="flex-1"
                      value={c.value}
                      placeholder={v?.input_type === "number" ? "número" : v?.options.map((o) => o.value).slice(0, 3).join(", ")}
                      onChange={(e) => setConds(conds.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    />
                    <IconButton size="small" variant="transparent" onClick={() => setConds(conds.filter((_, j) => j !== i))} disabled={conds.length === 1}>
                      <Trash />
                    </IconButton>
                  </div>
                )
              })}
              <Button
                size="small"
                variant="secondary"
                className="self-start"
                onClick={() => setConds([...conds, { variable: kb.variables[0]?.code ?? "", operator: "eq", value: "" }])}
              >
                <Plus /> Condición
              </Button>
            </div>
          </div>

          <div>
            <Label size="small">Conclusión</Label>
            <div className="mt-1 grid grid-cols-2 gap-2">
              <Select value={type} onValueChange={(v) => setType(v as "hypothesis" | "fact")} disabled={!!rule}>
                <Select.Trigger><Select.Value /></Select.Trigger>
                <Select.Content>
                  <Select.Item value="hypothesis">Hipótesis</Select.Item>
                  <Select.Item value="fact">Hecho intermedio</Select.Item>
                </Select.Content>
              </Select>
              {type === "hypothesis" ? (
                <Select value={hyp} onValueChange={setHyp} disabled={!!rule}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    {kb.hypotheses.map((h) => (
                      <Select.Item key={h.code} value={h.code}>{h.name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              ) : (
                <div className="flex gap-2">
                  <Select value={factVar} onValueChange={setFactVar} disabled={!!rule}>
                    <Select.Trigger><Select.Value placeholder="Variable" /></Select.Trigger>
                    <Select.Content>
                      {derived.map((v) => (
                        <Select.Item key={v.code} value={v.code}>{v.name}</Select.Item>
                      ))}
                    </Select.Content>
                  </Select>
                  <Input value={factVal} onChange={(e) => setFactVal(e.target.value)} placeholder="valor" disabled={!!rule} />
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label size="small">Factor de certeza (-1 a 1)</Label>
              <Input type="number" step="0.05" min={-1} max={1} value={cf} onChange={(e) => setCf(e.target.value)} />
            </div>
            <div>
              <Label size="small">Prioridad</Label>
              <Input type="number" value={priority} onChange={(e) => setPriority(e.target.value)} />
            </div>
          </div>

          <div>
            <Label size="small">Explicación (se muestra al usuario)</Label>
            <Textarea value={explanation} onChange={(e) => setExplanation(e.target.value)} rows={3} />
          </div>
        </Drawer.Body>
        <Drawer.Footer>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          <Button variant="primary" onClick={save} isLoading={saving}>Guardar</Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Hipótesis y variables
// ─────────────────────────────────────────────────────────────────────────────
const HypothesesTab = ({ kb, reload }: { kb: Knowledge; reload: () => void }) => {
  const toggle = async (h: Hypothesis) => {
    try {
      await sdk.client.fetch(`/admin/expert/hypotheses/${h.id}`, { method: "POST", body: { active: !h.active } })
      reload()
    } catch {
      toast.error("No se pudo cambiar el estado.")
    }
  }
  return (
    <div className="flex flex-col gap-2">
      {kb.hypotheses.map((h) => {
        const rules = kb.rules.filter((r) => r.hypothesis?.code === h.code)
        const pos = rules.filter((r) => r.certainty > 0).length
        const neg = rules.length - pos
        return (
          <div key={h.id} className={`flex items-start gap-3 rounded-lg border p-3 ${h.active ? "" : "opacity-50"}`}>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Text size="small" weight="plus">{h.name}</Text>
                <Badge size="2xsmall" color="grey">{h.code}</Badge>
                {h.kind === "advice" && <Badge size="2xsmall" color="orange">Aviso</Badge>}
              </div>
              <Text size="xsmall" className="text-ui-fg-subtle">{h.description}</Text>
            </div>
            <Badge size="2xsmall" color="green">{pos} a favor</Badge>
            <Badge size="2xsmall" color="red">{neg} en contra</Badge>
            <Switch checked={h.active} onCheckedChange={() => toggle(h)} />
          </div>
        )
      })}
    </div>
  )
}

const VariablesTab = ({ kb }: { kb: Knowledge }) => (
  <div className="flex flex-col gap-2">
    {kb.variables.map((v) => (
      <div key={v.id} className="rounded-lg border p-3">
        <div className="flex items-center gap-2">
          <Text size="small" weight="plus">{v.name}</Text>
          <Badge size="2xsmall" color="grey">{v.code}</Badge>
          <Badge size="2xsmall" color={v.kind === "input" ? "blue" : "purple"}>
            {v.kind === "input" ? "Pregunta" : "Hecho deducido"}
          </Badge>
          <Badge size="2xsmall" color="grey">{v.input_type}{v.unit ? ` · ${v.unit}` : ""}</Badge>
        </div>
        {v.question && <Text size="xsmall" className="text-ui-fg-subtle">{v.question}</Text>}
        {!!v.options.length && (
          <Text size="xsmall" className="mt-1 text-ui-fg-muted">
            {v.options.map((o) => `${o.label} (${o.value})`).join(" · ")}
          </Text>
        )}
      </div>
    ))}
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Probar el motor
// ─────────────────────────────────────────────────────────────────────────────
type FiredRule = { code: string; name: string; explanation: string; contribution: number; depth: number }
type Rec = {
  code: string
  name: string
  certainty: number
  reasons: FiredRule[]
  against: FiredRule[]
  product: { title: string; price: number } | null
  out_of_budget: boolean
}
type TestOut = {
  budget: number | null
  total: number
  advice: Rec[]
  recommended: Rec[]
  optional: Rec[]
  rejected: Rec[]
  facts: { code: string; name: string; value: string | number; certainty: number; source: string; by?: string[] }[]
  trace: (FiredRule & { conclusion: string; premise: number })[]
  iterations: number
}

const TestTab = ({ kb }: { kb: Knowledge }) => {
  const inputs = kb.variables.filter((v) => v.kind === "input" && v.active)
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({})
  const [out, setOut] = useState<TestOut | null>(null)
  const [running, setRunning] = useState(false)

  const run = async () => {
    setRunning(true)
    try {
      const body = Object.fromEntries(
        Object.entries(answers).map(([k, v]) => {
          const def = inputs.find((i) => i.code === k)
          return [k, def?.input_type === "number" ? Number(v) : v]
        })
      )
      setOut(await sdk.client.fetch<TestOut>("/admin/expert/test", { method: "POST", body: { answers: body } }))
    } catch (e) {
      toast.error((e as Error).message || "Respuestas incompletas o inválidas.")
    } finally {
      setRunning(false)
    }
  }

  const money = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`

  return (
    <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
      <div className="flex flex-col gap-3">
        {inputs.map((v) => (
          <div key={v.code}>
            <Label size="small">{v.name}{v.unit ? ` (${v.unit})` : ""}</Label>
            {v.input_type === "number" ? (
              <Input type="number" value={(answers[v.code] as string) ?? ""} onChange={(e) => setAnswers({ ...answers, [v.code]: e.target.value })} />
            ) : v.input_type === "single" ? (
              <Select value={(answers[v.code] as string) ?? ""} onValueChange={(val) => setAnswers({ ...answers, [v.code]: val })}>
                <Select.Trigger><Select.Value placeholder="Elige…" /></Select.Trigger>
                <Select.Content>
                  {v.options.map((o) => (
                    <Select.Item key={o.value} value={o.value}>{o.label}</Select.Item>
                  ))}
                </Select.Content>
              </Select>
            ) : (
              <div className="mt-1 grid grid-cols-2 gap-1">
                {v.options.map((o) => {
                  const cur = (answers[v.code] as string[]) ?? []
                  return (
                    <label key={o.value} className="flex items-center gap-2 text-xs">
                      <Checkbox
                        checked={cur.includes(o.value)}
                        onCheckedChange={() =>
                          setAnswers({
                            ...answers,
                            [v.code]: cur.includes(o.value) ? cur.filter((x) => x !== o.value) : [...cur, o.value],
                          })
                        }
                      />
                      {o.label}
                    </label>
                  )
                })}
              </div>
            )}
          </div>
        ))}
        <Button variant="primary" onClick={run} isLoading={running}>Ejecutar inferencia</Button>
      </div>

      <div className="flex flex-col gap-4">
        {!out ? (
          <Text className="text-ui-fg-subtle">Completa el caso y ejecuta la inferencia para ver la traza.</Text>
        ) : (
          <>
            <Text size="small" className="text-ui-fg-subtle">
              {out.iterations} iteraciones hasta el punto fijo · {out.trace.length} reglas disparadas · total{" "}
              {money(out.total)}{out.budget != null ? ` de ${money(out.budget)}` : ""}
            </Text>
            <Section title="Hechos (memoria de trabajo)">
              {out.facts.map((f, i) => (
                <Text key={i} size="xsmall" className="font-mono">
                  {f.source === "usuario" ? "●" : f.source === "calculado" ? "◆" : "▲"} {f.name} = {String(f.value)}
                  {f.source === "inferido" ? ` (FC ${f.certainty}) ← ${f.by?.join(", ")}` : ""}
                </Text>
              ))}
            </Section>
            {[...out.advice, ...out.recommended, ...out.optional, ...out.rejected].length > 0 && (
              <Section title="Conclusiones">
                {[
                  ...out.advice.map((r) => ({ ...r, tag: "Aviso", color: "orange" as const })),
                  ...out.recommended.map((r) => ({ ...r, tag: "Recomendado", color: "green" as const })),
                  ...out.optional.map((r) => ({ ...r, tag: "Opcional", color: "blue" as const })),
                  ...out.rejected.map((r) => ({ ...r, tag: "Descartado", color: "red" as const })),
                ].map((r) => (
                  <div key={r.code} className="flex items-center gap-2">
                    <Badge size="2xsmall" color={r.color}>{r.tag}</Badge>
                    <Text size="xsmall" weight="plus">{r.name}</Text>
                    <Text size="xsmall" className="text-ui-fg-subtle">FC {r.certainty}</Text>
                    <Text size="xsmall" className="text-ui-fg-muted">
                      {[...r.reasons.map((x) => `+${x.code}`), ...r.against.map((x) => `−${x.code}`)].join(" ")}
                    </Text>
                    {r.product && (
                      <Text size="xsmall" className="ml-auto">
                        {r.product.title} · {money(r.product.price)}
                      </Text>
                    )}
                    {r.out_of_budget && <Badge size="2xsmall" color="orange">Sin presupuesto</Badge>}
                  </div>
                ))}
              </Section>
            )}
            <Section title="Traza de inferencia">
              {out.trace.map((t, i) => (
                <Text key={i} size="xsmall" className="font-mono">
                  [{t.depth}] {t.code} ⇒ {t.conclusion} · premisa {t.premise} · aporte {t.contribution}
                </Text>
              ))}
            </Section>
          </>
        )}
      </div>
    </div>
  )
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="rounded-lg border p-3">
    <Text size="small" weight="plus" className="mb-2">{title}</Text>
    <div className="flex flex-col gap-1">{children}</div>
  </div>
)

// ─────────────────────────────────────────────────────────────────────────────
// Consultas
// ─────────────────────────────────────────────────────────────────────────────
type Consultation = {
  id: string
  created_at: string
  customer_id: string | null
  budget: number | null
  total_recommended: number | null
  rating: number | null
  feedback: string | null
  results: { hypothesis: string; status: string; certainty: number }[]
}

const ConsultationsTab = () => {
  const [items, setItems] = useState<Consultation[] | null>(null)
  useEffect(() => {
    sdk.client
      .fetch<{ consultations: Consultation[] }>("/admin/expert/consultations?limit=100")
      .then((r) => setItems(r.consultations))
      .catch(() => toast.error("No se pudieron cargar las consultas."))
  }, [])
  if (!items) return <Text className="text-ui-fg-subtle">Cargando…</Text>
  if (!items.length) return <Text className="text-ui-fg-subtle">Aún no hay consultas.</Text>
  return (
    <div className="flex flex-col gap-2">
      {items.map((c) => (
        <div key={c.id} className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Text size="small" weight="plus">{new Date(c.created_at).toLocaleString("es-CO")}</Text>
            <Badge size="2xsmall" color={c.customer_id ? "blue" : "grey"}>{c.customer_id ? "Cliente" : "Invitado"}</Badge>
            {c.budget != null && (
              <Text size="xsmall" className="text-ui-fg-subtle">
                Presupuesto ${Math.round(c.budget).toLocaleString("es-CO")} · recomendado $
                {Math.round(c.total_recommended ?? 0).toLocaleString("es-CO")}
              </Text>
            )}
            {c.rating != null && <Badge size="2xsmall" color="green">★ {c.rating}</Badge>}
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {c.results.map((r, i) => (
              <Badge
                key={i}
                size="2xsmall"
                color={r.status === "recommended" ? "green" : r.status === "rejected" ? "red" : r.status === "advice" ? "orange" : "blue"}
              >
                {r.hypothesis} {r.certainty}
              </Badge>
            ))}
          </div>
          {c.feedback && <Text size="xsmall" className="mt-1 text-ui-fg-muted">“{c.feedback}”</Text>}
        </div>
      ))}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Sistema experto",
  icon: LightBulb,
})

export default ExpertPage
