import { useState } from 'react'

/**
 * Galu — Galuli's mascot. A purple octopus with 6 arms,
 * one for each AI engine: ChatGPT, Perplexity, Claude, Gemini, Grok, Llama.
 *
 * Usage:
 *   <GaluMascot />                      — default (neutral)
 *   <GaluMascot size={80} />            — bigger
 *   <GaluMascot mood="celebrate" />     — bouncing / arms-up
 *   <GaluMascot mood="scan" />          — gentle pulse
 */
export function GaluMascot({ size = 56, mood = 'default', style = {} }) {
  const [imgFailed, setImgFailed] = useState(false)

  const moodStyle = {
    default: {},
    celebrate: {
      animation: 'galuCelebrate 0.7s ease-in-out infinite alternate',
      transformOrigin: 'bottom center',
    },
    scan: {
      animation: 'galuPulse 1.8s ease-in-out infinite',
    },
  }[mood] || {}

  return (
    <>
      <style>{`
        @keyframes galuCelebrate {
          0%   { transform: rotate(-6deg) scale(1.04) translateY(0px); }
          100% { transform: rotate(6deg)  scale(1.04) translateY(-5px); }
        }
        @keyframes galuPulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%       { opacity: 0.8; transform: scale(0.96); }
        }
      `}</style>
      <div style={{ display: 'inline-block', lineHeight: 0, ...style }}>
        {imgFailed ? (
          <div style={{
            width: size,
            height: size,
            fontSize: size * 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            ...moodStyle,
          }}>🐙</div>
        ) : (
          <img
            src="/dashboard/galu.png"
            alt="Galu"
            width={size}
            height={size}
            style={{ objectFit: 'contain', display: 'block', ...moodStyle }}
            onError={() => setImgFailed(true)}
          />
        )}
      </div>
    </>
  )
}
