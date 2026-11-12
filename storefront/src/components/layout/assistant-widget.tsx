"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ChevronRight, Send, Sparkles, X } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  whatsappLink,
  WHATSAPP_QUICK_MESSAGES,
} from "@/constants/whatsapp"

/** Glifo oficial de WhatsApp (relleno con currentColor). */
function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden
      className={className}
    >
      <path d="M16.003 3.2c-7.06 0-12.8 5.74-12.8 12.8 0 2.26.6 4.46 1.73 6.4L3.2 28.8l6.56-1.72a12.7 12.7 0 0 0 6.24 1.62h.01c7.06 0 12.8-5.74 12.8-12.8 0-3.42-1.33-6.64-3.75-9.06A12.7 12.7 0 0 0 16.003 3.2Zm0 23.36h-.01a10.6 10.6 0 0 1-5.4-1.48l-.39-.23-4 1.05 1.07-3.9-.25-.4a10.55 10.55 0 0 1-1.62-5.6c0-5.86 4.77-10.62 10.62-10.62 2.84 0 5.5 1.1 7.5 3.11a10.55 10.55 0 0 1 3.1 7.52c0 5.86-4.77 10.62-10.62 10.62Zm5.83-7.95c-.32-.16-1.89-.93-2.18-1.04-.29-.11-.5-.16-.71.16-.21.32-.82 1.04-1 1.25-.18.21-.37.24-.69.08-.32-.16-1.35-.5-2.57-1.58-.95-.85-1.59-1.9-1.78-2.22-.18-.32-.02-.49.14-.65.14-.14.32-.37.48-.55.16-.18.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.71-1.71-.97-2.34-.26-.62-.52-.53-.71-.54l-.6-.01c-.21 0-.55.08-.84.4-.29.32-1.1 1.08-1.1 2.63s1.13 3.05 1.29 3.26c.16.21 2.22 3.39 5.38 4.76.75.32 1.34.51 1.8.66.76.24 1.45.21 1.99.13.61-.09 1.89-.77 2.16-1.52.27-.75.27-1.39.19-1.52-.08-.13-.29-.21-.61-.37Z" />
    </svg>
  )
}

const WA_GREEN = "#25D366"

/**
 * Botón flotante de ayuda (esquina inferior derecha) con el avatar del asesor.
 * Al abrirlo ofrece dos acciones:
 *  1. El test del asesor experto (/asesor) para saber qué suplemento conviene.
 *  2. Hablar con un asesor por WhatsApp: mensajes rápidos y un campo libre que
 *     abren el chat con el número de Level Fitness y el mensaje prellenado.
 */
export function AssistantWidget() {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<"menu" | "whatsapp">("menu")
  const [custom, setCustom] = useState("")
  const rootRef = useRef<HTMLDivElement>(null)

  // Cerrar al hacer clic fuera o con Escape.
  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  // Cada vez que se abre, empieza en el menú principal.
  useEffect(() => {
    if (open) setView("menu")
  }, [open])

  const openChat = (message: string) => {
    window.open(whatsappLink(message), "_blank", "noopener,noreferrer")
    setOpen(false)
    setCustom("")
  }

  return (
    <div
      ref={rootRef}
      className="fixed bottom-20 right-4 z-40 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6"
    >
      {/* Menú principal: test del asesor experto o WhatsApp */}
      {open && view === "menu" && (
        <div
          role="dialog"
          aria-label="¿En qué te ayudamos?"
          className="w-[calc(100vw-2rem)] max-w-xs overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in"
        >
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Image
              src="/asesor-avatar.png"
              alt=""
              width={40}
              height={40}
              className="h-10 w-10 shrink-0 rounded-full"
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">
                ¡Hola! ¿En qué te ayudamos?
              </p>
              <p className="text-xs leading-tight text-muted-foreground">
                Elige una opción
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="rounded-full p-1 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 p-3">
            <Link
              href="/asesor"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-3 rounded-xl border border-[color:var(--accent)] bg-accent/10 px-3 py-3 text-left transition hover:bg-accent/20"
            >
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-foreground">
                <Sparkles className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  ¿Qué suplemento es para mí?
                </span>
                <span className="block text-xs text-muted-foreground">
                  Test de 2 min: te recomendamos según tu objetivo, salud y
                  presupuesto
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>

            <button
              type="button"
              onClick={() => setView("whatsapp")}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-background px-3 py-3 text-left transition hover:bg-secondary/60"
            >
              <span
                className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-white"
                style={{ backgroundColor: WA_GREEN }}
              >
                <WhatsAppIcon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-bold text-foreground">
                  Hablar con un asesor
                </span>
                <span className="block text-xs text-muted-foreground">
                  Escríbenos por WhatsApp
                </span>
              </span>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </button>
          </div>
        </div>
      )}

      {/* WhatsApp: mensajes rápidos y mensaje libre */}
      {open && view === "whatsapp" && (
        <div
          role="dialog"
          aria-label="Opciones de contacto por WhatsApp"
          className="w-[calc(100vw-2rem)] max-w-xs overflow-hidden rounded-2xl border border-border bg-card shadow-2xl animate-fade-in"
        >
          <div
            className="flex items-center gap-3 px-4 py-3 text-white"
            style={{ backgroundColor: WA_GREEN }}
          >
            <button
              type="button"
              onClick={() => setView("menu")}
              aria-label="Volver"
              className="-ml-1 rounded-full p-1 text-white/90 transition hover:bg-white/20"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <WhatsAppIcon className="h-6 w-6 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">
                Chatea con nosotros
              </p>
              <p className="text-xs leading-tight text-white/80">
                Respondemos lo antes posible
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
              className="rounded-full p-1 text-white/90 transition hover:bg-white/20"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-2 p-3">
            <p className="px-1 text-xs font-medium text-muted-foreground">
              Mensajes rápidos
            </p>
            {WHATSAPP_QUICK_MESSAGES.map((msg) => (
              <button
                key={msg}
                type="button"
                onClick={() => openChat(msg)}
                className="flex w-full items-start gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm text-foreground transition hover:border-[color:var(--accent)] hover:bg-accent/5"
              >
                <span className="flex-1">{msg.trim()}</span>
              </button>
            ))}

            {/* Mensaje libre */}
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (custom.trim()) openChat(custom)
              }}
              className="flex items-end gap-2 pt-1"
            >
              <input
                type="text"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                placeholder="Escribe tu mensaje…"
                aria-label="Escribe tu mensaje"
                className="min-w-0 flex-1 rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-[color:var(--accent)]"
              />
              <button
                type="submit"
                disabled={!custom.trim()}
                aria-label="Enviar por WhatsApp"
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-white transition disabled:opacity-40"
                style={{ backgroundColor: WA_GREEN }}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Burbuja con el avatar del asesor */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Cerrar ayuda" : "Abrir ayuda: asesor de suplementos y WhatsApp"}
        aria-expanded={open}
        className={cn(
          "grid h-16 w-16 place-items-center overflow-hidden rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]",
          open && "bg-foreground text-background"
        )}
      >
        {open ? (
          <X className="h-6 w-6" />
        ) : (
          <Image
            src="/asesor-avatar.png"
            alt=""
            width={64}
            height={64}
            priority
            className="h-16 w-16"
          />
        )}
      </button>
    </div>
  )
}
