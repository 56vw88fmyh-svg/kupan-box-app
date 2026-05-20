import { motion as Motion } from 'framer-motion'

const pageMotion = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -10 },
  transition: { duration: 0.22, ease: [0.22, 1, 0.36, 1] },
}

const cardMotion = {
  initial: { opacity: 0, y: 12 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.18 },
  transition: { duration: 0.24, ease: [0.22, 1, 0.36, 1] },
}

export function MotionPage({ children }) {
  return (
    <Motion.div {...pageMotion}>
      {children}
    </Motion.div>
  )
}

export function MotionCard({ children, className = '', delay = 0, as = 'div' }) {
  const Component = Motion[as] ?? Motion.div

  return (
    <Component
      {...cardMotion}
      transition={{ ...cardMotion.transition, delay }}
      whileHover={{ y: -2, transition: { duration: 0.16 } }}
      className={className}
    >
      {children}
    </Component>
  )
}
