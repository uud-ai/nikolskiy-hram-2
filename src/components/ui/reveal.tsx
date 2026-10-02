import * as React from "react"
import { motion, type Variants } from "motion/react"
import { cn } from "@/lib/utils"

const variants: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] },
  },
}

interface RevealProps extends React.ComponentProps<typeof motion.div> {
  delay?: number
}

export function Reveal({ className, delay = 0, children, ...props }: RevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-80px" }}
      variants={variants}
      transition={{ delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  )
}
