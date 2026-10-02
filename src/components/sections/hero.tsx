import { useRef } from "react"
import { motion, useMotionValue, useSpring } from "motion/react"
import { ChevronDown } from "lucide-react"

export function Hero() {
  const ref = useRef<HTMLElement>(null)
  const mx = useMotionValue(0)
  const my = useMotionValue(0)
  const glowX = useSpring(mx, { stiffness: 50, damping: 20 })
  const glowY = useSpring(my, { stiffness: 50, damping: 20 })

  function handlePointerMove(e: React.PointerEvent<HTMLElement>) {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    mx.set(e.clientX - rect.left)
    my.set(e.clientY - rect.top)
  }

  return (
    <section
      id="top"
      ref={ref}
      onPointerMove={handlePointerMove}
      className="relative flex min-h-[100svh] items-center justify-center overflow-hidden bg-ink"
    >
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.12 }}
        animate={{ scale: 1 }}
        transition={{ duration: 8, ease: [0.16, 1, 0.3, 1] }}
      >
        <img
          src="/images/hero-church.jpg"
          alt="Храм святителя Николая Чудотворца в поселке Усть-Карск"
          className="h-full w-full object-cover"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/35 to-ink/80" />

      <motion.div
        aria-hidden
        className="pointer-events-none absolute size-[55vmax] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-80 mix-blend-soft-light blur-3xl"
        style={{
          left: glowX,
          top: glowY,
          background:
            "radial-gradient(circle, color-mix(in srgb, var(--color-gold) 25%, transparent) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-4xl px-6 text-center">
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-balance font-serif text-4xl font-semibold leading-[1.15] text-white sm:text-5xl md:text-6xl"
        >
          Церковь Николая Чудотворца
          <br />в Усть-Карске
        </motion.h1>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          transition={{ duration: 0.8, delay: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-7 h-px w-24 bg-gradient-to-r from-transparent via-gold to-transparent"
        />

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.05, ease: [0.16, 1, 0.3, 1] }}
          className="mx-auto mt-7 max-w-xl text-balance font-sans text-base text-white/85 sm:text-lg"
        >
          Приходская жизнь, богослужения и духовное наследие посёлка
          в Забайкальском крае
        </motion.p>
      </div>

      <motion.a
        href="#about"
        aria-label="Пролистать к разделу «О храме»"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 8, 0] }}
        transition={{
          opacity: { duration: 1, delay: 1.4 },
          y: { duration: 2.2, repeat: Infinity, ease: "easeInOut", delay: 1.6 },
        }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 text-white/80 transition-colors hover:text-gold-glow"
      >
        <ChevronDown className="size-7" />
      </motion.a>
    </section>
  )
}
