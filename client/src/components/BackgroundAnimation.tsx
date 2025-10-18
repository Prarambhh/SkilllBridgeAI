import { useEffect, useRef } from 'react'
import './BackgroundAnimation.css'

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  size: number
  opacity: number
  color: string
}

interface BackgroundAnimationProps {
  variant?: 'default' | 'interview' | 'dashboard' | 'auth'
  intensity?: 'low' | 'medium' | 'high'
}

export default function BackgroundAnimation({ 
  variant = 'default', 
  intensity = 'low' 
}: BackgroundAnimationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>(0)
  const particlesRef = useRef<Particle[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReducedMotion) return

    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
      // Ensure canvas covers full viewport
      canvas.style.width = '100vw'
      canvas.style.height = '100vh'
      console.log('Canvas resized:', canvas.width, 'x', canvas.height)
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Particle configuration based on variant and intensity
    const getParticleConfig = () => {
      const baseCount = intensity === 'low' ? 40 : intensity === 'medium' ? 60 : 80
      
      switch (variant) {
        case 'interview':
          return {
            count: baseCount,
            colors: ['rgba(59, 130, 246, 0.6)', 'rgba(147, 197, 253, 0.5)', 'rgba(219, 234, 254, 0.4)'],
            speed: 0.5,
            sizeRange: [3, 6]
          }
        case 'dashboard':
          return {
            count: baseCount,
            colors: ['rgba(16, 185, 129, 0.6)', 'rgba(52, 211, 153, 0.5)', 'rgba(167, 243, 208, 0.4)'],
            speed: 0.6,
            sizeRange: [3, 7]
          }
        case 'auth':
          return {
            count: baseCount,
            colors: ['rgba(139, 92, 246, 0.6)', 'rgba(196, 181, 253, 0.5)', 'rgba(221, 214, 254, 0.4)'],
            speed: 0.4,
            sizeRange: [3, 5]
          }
        default:
          return {
            count: baseCount,
            colors: ['rgba(59, 130, 246, 0.5)', 'rgba(147, 197, 253, 0.4)', 'rgba(219, 234, 254, 0.3)'],
            speed: 0.5,
            sizeRange: [3, 6]
          }
      }
    }

    const config = getParticleConfig()

    // Initialize particles
    const initParticles = () => {
      particlesRef.current = []
      for (let i = 0; i < config.count; i++) {
        particlesRef.current.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * config.speed,
          vy: (Math.random() - 0.5) * config.speed,
          size: config.sizeRange[0] + Math.random() * (config.sizeRange[1] - config.sizeRange[0]),
          opacity: 0.6 + Math.random() * 0.4,
          color: config.colors[Math.floor(Math.random() * config.colors.length)]
        })
      }
    }

    initParticles()

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update and draw particles
      particlesRef.current.forEach((particle) => {
        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Bounce off edges
        if (particle.x <= 0 || particle.x >= canvas.width) particle.vx *= -1
        if (particle.y <= 0 || particle.y >= canvas.height) particle.vy *= -1

        // Keep particles in bounds
        particle.x = Math.max(0, Math.min(canvas.width, particle.x))
        particle.y = Math.max(0, Math.min(canvas.height, particle.y))

        // Subtle opacity animation
        particle.opacity += (Math.random() - 0.5) * 0.02
        particle.opacity = Math.max(0.2, Math.min(1.0, particle.opacity))

        // Draw particle
        ctx.save()
        ctx.globalAlpha = particle.opacity
        ctx.fillStyle = particle.color
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      })

      // Draw connections between nearby particles (very subtle)
      if (intensity !== 'low') {
        particlesRef.current.forEach((particle, i) => {
          particlesRef.current.slice(i + 1).forEach((otherParticle) => {
            const dx = particle.x - otherParticle.x
            const dy = particle.y - otherParticle.y
            const distance = Math.sqrt(dx * dx + dy * dy)

            if (distance < 100) {
              ctx.save()
              ctx.globalAlpha = (1 - distance / 100) * 0.4
              ctx.strokeStyle = particle.color
              ctx.lineWidth = 0.5
              ctx.beginPath()
              ctx.moveTo(particle.x, particle.y)
              ctx.lineTo(otherParticle.x, otherParticle.y)
              ctx.stroke()
              ctx.restore()
            }
          })
        })
      }

      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [variant, intensity])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 background-animation-canvas"
      style={{ 
        background: variant === 'auth' 
          ? 'linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
          : variant === 'dashboard'
          ? 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(59, 130, 246, 0.1) 100%)'
          : variant === 'interview'
          ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(147, 197, 253, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(59, 130, 246, 0.08) 0%, rgba(147, 197, 253, 0.08) 100%)'
      }}
    />
  )
}