function App() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '12px',
    }}>
      <div style={{
        fontFamily: 'var(--font-display)',
        fontSize: '28px',
        fontWeight: 700,
        letterSpacing: '0.25em',
        color: 'var(--color-cv)',
        textShadow: '0 0 8px var(--color-cv), 0 0 24px rgba(0,229,255,0.3)',
        textTransform: 'uppercase',
      }}>
        PatchGlow
      </div>
      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: '11px',
        color: 'var(--text-dim)',
        letterSpacing: '0.15em',
      }}>
        BROWSER MODULAR SYNTHESIZER
      </div>
    </div>
  )
}

export default App
