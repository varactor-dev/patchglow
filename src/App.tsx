import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { createPortal } from 'react-dom'

// Register all modules before anything renders
import { registerModule } from '@/engine/moduleRegistry'
import oscillatorReg from '@/modules/oscillator'
import outputReg from '@/modules/output'
import keyboardReg from '@/modules/keyboard'
import filterReg from '@/modules/filter'
import envelopeReg from '@/modules/envelope'
import vcaReg from '@/modules/vca'
import lfoReg from '@/modules/lfo'
import mixerReg from '@/modules/mixer'
import sequencerReg from '@/modules/sequencer'
import noiseReg from '@/modules/noise'
import delayReg from '@/modules/delay'
import reverbReg from '@/modules/reverb'
import distortionReg from '@/modules/distortion'
import sampleHoldReg from '@/modules/samplehold'

registerModule(oscillatorReg)
registerModule(outputReg)
registerModule(keyboardReg)
registerModule(filterReg)
registerModule(envelopeReg)
registerModule(vcaReg)
registerModule(lfoReg)
registerModule(mixerReg)
registerModule(sequencerReg)
registerModule(noiseReg)
registerModule(delayReg)
registerModule(reverbReg)
registerModule(distortionReg)
registerModule(sampleHoldReg)

// Core
import { useRackStore } from '@/store/rackStore'
import AudioEngineManager from '@/engine/AudioEngineManager'
import { loadAutosave, initAutosave } from '@/store/persistence'
import { decodePatchFromUrl, clearPatchHash } from '@/store/patchUrl'
import Toolbar from '@/ui/Toolbar/Toolbar'
import Rack from '@/ui/Rack/Rack'
import { computeFitZoom } from '@/ui/utils/layout'
import styles from './App.module.css'

function useIsMobile() {
  return useSyncExternalStore(
    (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) },
    () => window.innerWidth < 768,
  )
}

export default function App() {
  const isMobile = useIsMobile()
  const audioStarted = useRackStore((s) => s.audioStarted)
  const setAudioStarted = useRackStore((s) => s.setAudioStarted)
  const [showAbout, setShowAbout] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const initializedRef = useRef(false)
  const rackAreaRef = useRef<HTMLDivElement>(null)
  const pinchRef = useRef({ dist: 0, zoom: 1 })

  const handleStartAudio = useCallback(async () => {
    try {
      await AudioEngineManager.getInstance().start()
    } catch { /* ignore — dismiss overlay regardless */ }
    setAudioStarted()
  }, [setAudioStarted])

  const handleWelcomeDemo = useCallback(async () => {
    localStorage.setItem('patchglow-welcomed', 'true')
    setShowWelcome(false)
    await AudioEngineManager.getInstance().start()
    setAudioStarted()
    try {
      const res = await fetch('/patches/neon-dreams.json')
      const json = await res.text()
      useRackStore.getState().importPatch(json)
    } catch { /* ignore */ }
  }, [setAudioStarted])

  const handleWelcomeEmpty = useCallback(async () => {
    localStorage.setItem('patchglow-welcomed', 'true')
    setShowWelcome(false)
    await AudioEngineManager.getInstance().start()
    setAudioStarted()
  }, [setAudioStarted])

  // Document-level listener: start audio on first touch/click anywhere.
  // Bypasses all DOM/CSS/z-index issues with overlays on iOS WKWebView.
  useEffect(() => {
    if (audioStarted || showWelcome) return
    const start = async () => {
      try { await AudioEngineManager.getInstance().start() } catch { /* ignore */ }
      setAudioStarted()
    }
    document.addEventListener('touchstart', start, { once: true })
    document.addEventListener('mousedown', start, { once: true })
    return () => {
      document.removeEventListener('touchstart', start)
      document.removeEventListener('mousedown', start)
    }
  }, [audioStarted, showWelcome, setAudioStarted])

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (!toastMessage) return
    const timer = setTimeout(() => setToastMessage(null), 4000)
    return () => clearTimeout(timer)
  }, [toastMessage])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // 1. Check URL hash for shared patch (takes priority over autosave)
    let restored = false
    if (window.location.hash.startsWith('#patch=')) {
      decodePatchFromUrl().then((json) => {
        if (json) {
          useRackStore.getState().importPatch(json)
          clearPatchHash()
          setToastMessage('Loaded shared patch from link')
        }
      }).catch(() => {})
      restored = true // skip autosave + welcome when URL patch present
    } else {
      // 2. Try restoring autosave
      restored = loadAutosave()
    }

    // 3. Init audio engine (subscribes to store, syncs modules/connections)
    AudioEngineManager.getInstance().init()

    // 4. Start autosave for future changes
    initAutosave()

    // 5. If no autosave/URL: show welcome or auto-load demo
    if (!restored) {
      if (isMobile) {
        // Mobile: always load demo, skip welcome
        localStorage.setItem('patchglow-welcomed', 'true')
        fetch('/patches/neon-dreams.json')
          .then((r) => r.text())
          .then((json) => useRackStore.getState().importPatch(json))
          .catch(() => {})
      } else if (!localStorage.getItem('patchglow-welcomed')) {
        setShowWelcome(true)
      } else {
        // Returning visitor with no autosave — auto-load demo
        fetch('/patches/neon-dreams.json')
          .then((r) => r.text())
          .then((json) => useRackStore.getState().importPatch(json))
          .catch(() => {})
      }
    }

    // 5. Auto-fit zoom if content doesn't fit viewport
    const fit = computeFitZoom()
    if (fit < 0.95) useRackStore.getState().setZoom(fit)
  }, [])

  // Keyboard shortcuts: Cmd/Ctrl +/- for zoom, Cmd/Ctrl+0 for fit, Cmd/Ctrl+Z undo, Cmd/Ctrl+Shift+Z redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // C key (no modifier): cycle cable display mode
      if (e.key === 'c' || e.key === 'C') {
        const tag = (e.target as HTMLElement)?.tagName
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return
        if (e.metaKey || e.ctrlKey || e.altKey) return
        e.preventDefault()
        useRackStore.getState().cycleCableDisplayMode()
        return
      }
      if (!(e.metaKey || e.ctrlKey)) return
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault()
        if (e.shiftKey) {
          useRackStore.getState().redo()
        } else {
          useRackStore.getState().undo()
        }
        return
      }
      const { zoom, setZoom } = useRackStore.getState()
      if (e.key === '=' || e.key === '+') {
        e.preventDefault()
        setZoom(zoom + 0.1)
      } else if (e.key === '-') {
        e.preventDefault()
        setZoom(zoom - 0.1)
      } else if (e.key === '0') {
        e.preventDefault()
        setZoom(computeFitZoom())
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Pinch-to-zoom: trackpad (ctrl+wheel) and touch gestures
  useEffect(() => {
    const el = rackAreaRef.current
    if (!el) return

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault()
        const delta = -e.deltaY * 0.005
        const { zoom, setZoom } = useRackStore.getState()
        setZoom(zoom + delta)
      }
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        pinchRef.current = {
          dist: Math.sqrt(dx * dx + dy * dy),
          zoom: useRackStore.getState().zoom,
        }
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault()
        const dx = e.touches[1].clientX - e.touches[0].clientX
        const dy = e.touches[1].clientY - e.touches[0].clientY
        const dist = Math.sqrt(dx * dx + dy * dy)
        const scale = dist / pinchRef.current.dist
        useRackStore.getState().setZoom(pinchRef.current.zoom * scale)
      }
    }

    el.addEventListener('wheel', onWheel, { passive: false })
    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    return () => {
      el.removeEventListener('wheel', onWheel)
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
    }
  }, [])

  return (
    <div className={styles.app}>
      <Toolbar onAbout={() => setShowAbout(true)} onToast={setToastMessage} />
      <div className={styles.rackArea} ref={rackAreaRef}>
        <Rack scrollContainerRef={rackAreaRef} />
      </div>

      {/* Mobile tap-to-start overlay — portaled to body to escape overflow:hidden */}
      {isMobile && !audioStarted && createPortal(
        <div className={styles.mobileStartOverlay} onPointerDown={handleStartAudio}>
          <div className={styles.overlayContent}>
            <div className={styles.overlayTitle}>PatchGlow</div>
            <button className={styles.overlayButton} type="button" onPointerDown={handleStartAudio}>
              TAP TO START
            </button>
            <div className={styles.overlayHint}>Tap anywhere to begin</div>
          </div>
        </div>,
        document.body,
      )}

      {/* Desktop audio start overlay — hidden when welcome screen is active */}
      {!isMobile && !audioStarted && !showWelcome && createPortal(
        <div className={styles.audioOverlay} onPointerDown={handleStartAudio}>
          <div className={styles.overlayContent}>
            <div className={styles.overlayTitle}>PatchGlow</div>
            <button className={styles.overlayButton} type="button" onPointerDown={handleStartAudio}>
              ◉ START AUDIO
            </button>
            <div className={styles.overlayHint}>Click anywhere to begin</div>
          </div>
        </div>,
        document.body,
      )}

      {/* Welcome screen — first visit only, desktop only */}
      {!isMobile && showWelcome && createPortal(
        <div className={styles.welcomeOverlay}>
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeLogo}>PatchGlow</div>
            <div className={styles.welcomeSubtitle}>Welcome to PatchGlow</div>
            <div className={styles.welcomeTagline}>
              A visual modular synthesizer that teaches you synthesis
              by showing you what&apos;s happening.
            </div>

            {/* Cable illustration */}
            <svg className={styles.welcomeCables} width="160" height="50" viewBox="0 0 160 50" fill="none">
              <defs>
                <filter id="glow">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                </filter>
              </defs>
              <path d="M10 40 C40 40, 50 10, 80 10" stroke="#ff6b35" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
              <path d="M30 45 C60 45, 80 15, 110 15" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
              <path d="M60 42 C90 42, 110 12, 150 12" stroke="#ff2ecb" strokeWidth="2.5" strokeLinecap="round" filter="url(#glow)" />
            </svg>

            <div className={styles.welcomeFeatures}>
              <div className={styles.welcomeFeature}>
                <span className={styles.welcomeDot} style={{ color: '#ff6b35', background: '#ff6b35' }} />
                <span>Each module visualizes its function — watch waveforms, filter curves, and envelopes in real time</span>
              </div>
              <div className={styles.welcomeFeature}>
                <span className={styles.welcomeDot} style={{ color: '#00e5ff', background: '#00e5ff' }} />
                <span>Patch cables glow with the actual signal flowing through them — see audio, modulation, and triggers</span>
              </div>
              <div className={styles.welcomeFeature}>
                <span className={styles.welcomeDot} style={{ color: '#ff2ecb', background: '#ff2ecb' }} />
                <span>Connect modules, turn knobs, and hear the result instantly — learn by doing</span>
              </div>
            </div>

            <div className={styles.welcomeButtons}>
              <button className={styles.welcomePrimaryBtn} onClick={handleWelcomeDemo}>
                Explore — Load Demo Patch
              </button>
              <button className={styles.welcomeSecondaryBtn} onClick={handleWelcomeEmpty}>
                Start Empty
              </button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* About modal */}
      {showAbout && (
        <div className={styles.aboutOverlay} onClick={() => setShowAbout(false)}>
          <div className={styles.aboutModal} onClick={(e) => e.stopPropagation()}>
            <button className={styles.aboutClose} onClick={() => setShowAbout(false)}>
              ✕
            </button>
            <div className={styles.aboutLogo}>PatchGlow</div>
            <div className={styles.aboutTagline}>
              A visual modular synthesizer that teaches synthesis by showing you what&apos;s happening
            </div>
            <div className={styles.aboutVersion}>v0.1.0</div>
            <div className={styles.aboutDivider} />
            <div className={styles.aboutBody}>
              PatchGlow is an open-source creative coding project. Every module visualizes its function
              in real time. Patch cables glow with the actual signal flowing through them. Built for
              learning, built for exploring.
            </div>
            <div className={styles.aboutDivider} />
            <div className={styles.aboutLinks}>
              <a className={styles.aboutLink} href="https://github.com/kc-cl/patchglow" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a className={styles.aboutLink} href="mailto:info@patchglow.app">
                info@patchglow.app
              </a>
            </div>
            <div className={styles.aboutDivider} />
            <div className={styles.aboutSectionTitle}>Acknowledgments</div>
            <div className={styles.aboutAcknowledgments}>
              <div className={styles.ackEntry}>
                <span className={styles.ackName} style={{ color: '#00e5ff' }}>Tone.js</span>
                <span className={styles.ackDesc}>The Web Audio framework at the heart of PatchGlow&apos;s sound engine. Tone.js makes sophisticated audio synthesis accessible in the browser and without it this project simply wouldn&apos;t exist. Created by Yotam Mann.</span>
                <a className={styles.aboutLink} href="https://tonejs.github.io" target="_blank" rel="noopener noreferrer">tonejs.github.io</a>
              </div>
              <div className={styles.ackEntry}>
                <span className={styles.ackName} style={{ color: '#a855f7' }}>Mutable Instruments</span>
                <span className={styles.ackDesc}>{`\u00C9milie Gillet\u2019s decision to open source the firmware for every Mutable Instruments Eurorack module set an extraordinary standard for generosity in the synth community. The DSP algorithms and synthesis concepts behind Plaits, Clouds, Rings, and others were an invaluable reference.`}</span>
                <a className={styles.aboutLink} href="https://pichenettes.github.io/mutable-instruments-documentation" target="_blank" rel="noopener noreferrer">mutable-instruments-documentation</a>
              </div>
              <div className={styles.ackEntry}>
                <span className={styles.ackName} style={{ color: '#61dafb' }}>React</span>
                <span className={styles.ackDesc}>The UI framework that makes PatchGlow&apos;s modular, component-based architecture possible. Each module in PatchGlow is literally a React component.</span>
                <a className={styles.aboutLink} href="https://react.dev" target="_blank" rel="noopener noreferrer">react.dev</a>
              </div>
              <div className={styles.ackEntry}>
                <span className={styles.ackName} style={{ color: '#646cff' }}>Vite</span>
                <span className={styles.ackDesc}>The build tool that enables instant development feedback and fast production builds.</span>
                <a className={styles.aboutLink} href="https://vitejs.dev" target="_blank" rel="noopener noreferrer">vitejs.dev</a>
              </div>
              <div className={styles.ackEntry}>
                <span className={styles.ackName} style={{ color: '#f59e0b' }}>Zustand</span>
                <span className={styles.ackDesc}>The lightweight state management library that tracks every module, cable, and knob position in PatchGlow.</span>
                <a className={styles.aboutLink} href="https://github.com/pmndrs/zustand" target="_blank" rel="noopener noreferrer">github.com/pmndrs/zustand</a>
              </div>
              <div className={styles.ackEntry}>
                <span className={styles.ackName} style={{ color: '#22d3ee' }}>@dnd-kit</span>
                <span className={styles.ackDesc}>The drag and drop toolkit that powers module placement and rearrangement in the rack.</span>
                <a className={styles.aboutLink} href="https://dndkit.com" target="_blank" rel="noopener noreferrer">dndkit.com</a>
              </div>
              <div className={styles.ackEntry}>
                <span className={styles.ackName} style={{ color: '#84cc16' }}>Patchcab</span>
                <span className={styles.ackDesc}>An earlier browser-based modular synth built with Tone.js and Svelte by Spectrome that served as architectural inspiration for PatchGlow&apos;s module and patching systems.</span>
                <a className={styles.aboutLink} href="https://github.com/spectrome/patchcab" target="_blank" rel="noopener noreferrer">github.com/spectrome/patchcab</a>
              </div>
              <div className={styles.ackEntry}>
                <span className={styles.ackName} style={{ color: '#ff6b35' }}>VCV Rack</span>
                <span className={styles.ackDesc}>The gold standard virtual Eurorack environment. VCV Rack&apos;s approach to faithfully emulating the modular synth experience was a constant reference point for how modules should behave and interact.</span>
                <a className={styles.aboutLink} href="https://vcvrack.com" target="_blank" rel="noopener noreferrer">vcvrack.com</a>
              </div>
            </div>
            <div className={styles.aboutDivider} />
            <div className={styles.aboutLicense}>
              <a className={styles.aboutLink} href="https://github.com/kc-cl/patchglow/blob/main/LICENSE" target="_blank" rel="noopener noreferrer">
                MIT License
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toastMessage && (
        <div className={styles.toast} role="status" aria-live="polite">{toastMessage}</div>
      )}
    </div>
  )
}
