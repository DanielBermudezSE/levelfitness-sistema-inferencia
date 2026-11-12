import { Container } from "@/components/ui/container"
import { ExpertAdvisor } from "@/features/expert/expert-advisor"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Asesor experto en suplementos",
  description:
    "Responde unas preguntas y nuestro sistema experto te recomienda los suplementos ideales para tu objetivo, tu salud y tu presupuesto, explicándote el porqué.",
  path: "/asesor",
})

export default function AsesorPage() {
  return (
    <Container>
      <ExpertAdvisor />
    </Container>
  )
}
