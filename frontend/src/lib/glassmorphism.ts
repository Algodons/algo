export const glassmorphismStyles = {
  card: {
    background: 'rgba(255, 255, 255, 0.05)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
  },
  cardLight: {
    background: 'rgba(255, 255, 255, 0.7)',
    backdropFilter: 'blur(10px)',
    border: '1px solid rgba(255, 255, 255, 0.18)',
    boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.15)',
  },
  panel: {
    background: 'rgba(17, 24, 39, 0.8)',
    backdropFilter: 'blur(12px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
  },
  popup: {
    background: 'rgba(31, 41, 55, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
  },
}

export const glassmorphismClasses = {
  card: 'backdrop-blur-[10px] border border-white/10 shadow-2xl',
  cardDark: 'bg-white/5 backdrop-blur-[10px] border border-white/10',
  cardLight: 'bg-white/70 backdrop-blur-[10px] border border-white/18',
  panel: 'bg-gray-900/80 backdrop-blur-[12px] border border-white/10',
  popup: 'bg-gray-800/95 backdrop-blur-[20px] border border-white/10 shadow-2xl',
}

export function getGlassmorphismStyle(variant: keyof typeof glassmorphismStyles = 'card') {
  return glassmorphismStyles[variant]
}

export function getGlassmorphismClass(variant: keyof typeof glassmorphismClasses = 'card') {
  return glassmorphismClasses[variant]
}
