// Audio komplett per Web Audio API synthetisiert – keine Sounddateien nötig.
// Kurze, freundliche Effekte (Schritt, Sammeln, Wurf, Treffer, Bauen, Sieg,
// Portal) und eine leise, sanfte Endlos-Musik im magischen Stil.

const MUTE_KEY = 'verlorene-portale:muted'

class GameAudioManager {
  private ctx?: AudioContext
  private master?: GainNode
  private sfx?: GainNode
  private music?: GainNode
  private muted = false
  private musicPlaying = false
  private musicTimeout?: ReturnType<typeof setTimeout>
  private nextLoop = 0

  constructor() {
    try {
      this.muted = localStorage.getItem(MUTE_KEY) === '1'
    } catch {
      /* ignorieren */
    }
  }

  private init() {
    if (this.ctx) return
    const Ctx =
      (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext })
        .AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    this.ctx = new Ctx()
    this.master = this.ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    this.master.connect(this.ctx.destination)
    this.sfx = this.ctx.createGain()
    this.sfx.gain.value = 0.5
    this.sfx.connect(this.master)
    this.music = this.ctx.createGain()
    this.music.gain.value = 0.11 // leise
    this.music.connect(this.master)
  }

  /** Beim ersten Antippen aufrufen (Autoplay-Freigabe). */
  ensureStarted() {
    this.init()
    this.ctx?.resume()
    if (!this.muted && !this.musicPlaying) this.startMusic()
  }

  isMuted() {
    return this.muted
  }

  /** Stummschaltung umschalten; gibt den neuen Zustand zurück. */
  toggleMute() {
    this.muted = !this.muted
    try {
      localStorage.setItem(MUTE_KEY, this.muted ? '1' : '0')
    } catch {
      /* ignorieren */
    }
    this.init()
    if (this.master) this.master.gain.value = this.muted ? 0 : 1
    if (this.muted) this.stopMusic()
    else this.ensureStarted()
    return this.muted
  }

  // --- Synthese-Bausteine ---

  private tone(
    freq: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    dest: GainNode,
    offset = 0,
  ) {
    if (!this.ctx) return
    const when = this.ctx.currentTime + offset
    const o = this.ctx.createOscillator()
    o.type = type
    o.frequency.value = freq
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(peak, when + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    o.connect(g)
    g.connect(dest)
    o.start(when)
    o.stop(when + dur + 0.03)
  }

  private sweep(
    f1: number,
    f2: number,
    dur: number,
    type: OscillatorType,
    peak: number,
    dest: GainNode,
  ) {
    if (!this.ctx) return
    const when = this.ctx.currentTime
    const o = this.ctx.createOscillator()
    o.type = type
    o.frequency.setValueAtTime(f1, when)
    o.frequency.exponentialRampToValueAtTime(Math.max(f2, 1), when + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(peak, when + 0.02)
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur)
    o.connect(g)
    g.connect(dest)
    o.start(when)
    o.stop(when + dur + 0.03)
  }

  // --- Effekte ---

  private stepFlip = false
  step() {
    if (this.muted || !this.ctx || !this.sfx) return
    this.stepFlip = !this.stepFlip
    this.tone(this.stepFlip ? 150 : 130, 0.07, 'sine', 0.09, this.sfx)
  }

  collect() {
    if (this.muted || !this.sfx) return
    this.tone(880, 0.12, 'triangle', 0.28, this.sfx)
    this.tone(1320, 0.18, 'triangle', 0.26, this.sfx, 0.08)
  }

  shoot() {
    if (this.muted || !this.sfx) return
    this.sweep(720, 200, 0.16, 'triangle', 0.2, this.sfx)
  }

  hit() {
    if (this.muted || !this.sfx) return
    this.tone(300, 0.08, 'square', 0.13, this.sfx)
    this.tone(200, 0.1, 'square', 0.1, this.sfx, 0.03)
  }

  build() {
    if (this.muted || !this.sfx) return
    ;[523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, 0.35, 'sine', 0.18, this.sfx!, i * 0.07),
    )
  }

  portalEnter() {
    if (this.muted || !this.sfx) return
    this.sweep(220, 880, 0.5, 'sine', 0.16, this.sfx)
  }

  victory() {
    if (this.muted || !this.sfx) return
    const notes = [523.25, 659.25, 783.99, 1046.5]
    notes.forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.26, this.sfx!, i * 0.12))
    this.tone(1567.98, 0.5, 'triangle', 0.22, this.sfx, notes.length * 0.12)
  }

  // --- Musik (leise, sanft, in Schleife) ---

  private startMusic() {
    this.init()
    if (this.musicPlaying || !this.ctx) return
    this.musicPlaying = true
    this.nextLoop = this.ctx.currentTime + 0.15
    this.scheduleMusic()
  }

  private stopMusic() {
    this.musicPlaying = false
    if (this.musicTimeout) clearTimeout(this.musicTimeout)
    this.musicTimeout = undefined
  }

  private pad(freq: number, dur: number, peak: number, offset: number) {
    if (!this.ctx || !this.music) return
    const when = this.nextLoop + offset
    const o = this.ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = freq
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, when)
    g.gain.linearRampToValueAtTime(peak, when + 0.4)
    g.gain.linearRampToValueAtTime(0.0001, when + dur)
    o.connect(g)
    g.connect(this.music)
    o.start(when)
    o.stop(when + dur + 0.05)
  }

  private scheduleMusic() {
    if (!this.musicPlaying || !this.ctx || !this.music) return
    const beat = 0.55
    const t0 = this.nextLoop

    // tiefer, weicher Pad-Teppich
    this.pad(110, beat * 4, 0.5, 0)
    this.pad(82.41, beat * 4, 0.5, beat * 4)

    // sanfte Pentatonik-Arpeggio (A-Moll)
    const seq = [440, 523.25, 659.25, 783.99, 659.25, 523.25, 587.33, 440]
    seq.forEach((f, i) => {
      const o = this.ctx!.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f
      const g = this.ctx!.createGain()
      const when = t0 + i * beat
      g.gain.setValueAtTime(0.0001, when)
      g.gain.linearRampToValueAtTime(0.09, when + 0.05)
      g.gain.exponentialRampToValueAtTime(0.0001, when + beat * 0.9)
      o.connect(g)
      g.connect(this.music!)
      o.start(when)
      o.stop(when + beat)
    })

    const loopLen = beat * 8
    this.nextLoop = t0 + loopLen
    this.musicTimeout = setTimeout(() => this.scheduleMusic(), (loopLen - 0.1) * 1000)
  }
}

export const GameAudio = new GameAudioManager()
