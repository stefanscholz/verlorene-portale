import Phaser from 'phaser'
import { GameAudio } from '../systems/Audio'

export interface HudData {
  mode?: 'main' | 'portal' | 'menu'
  portalName?: string
  collected?: number
  total?: number
  built?: boolean
  energy?: number // Portal-Energie in % (Hauptwelt-Anzeige)
}

// Overlay-Scene für das HUD: oben der Teile-Zähler / Weltname, in der Mitte
// kurze Hinweis-Meldungen ("Toasts"). Läuft dauerhaft über den Weltszenen und
// kommuniziert mit ihnen über globale Events (this.game.events).
export class UIScene extends Phaser.Scene {
  private hudText!: Phaser.GameObjects.Text
  private toastText!: Phaser.GameObjects.Text
  private toastTimer?: Phaser.Time.TimerEvent
  private energyBar!: Phaser.GameObjects.Graphics
  private energyLabel!: Phaser.GameObjects.Text

  constructor() {
    super({ key: 'UIScene', active: false })
  }

  create() {
    const w = this.cameras.main.width
    this.scene.bringToTop()

    this.hudText = this.add
      .text(12, 12, '', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setScrollFactor(0)
      .setDepth(1000)

    this.toastText = this.add
      .text(w / 2, 96, '', {
        fontFamily: 'sans-serif',
        fontSize: '18px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: w - 48 },
        backgroundColor: '#000000cc',
        padding: { x: 14, y: 10 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setAlpha(0)

    // Ton an/aus
    const muteBtn = this.add
      .text(w - 12, 14, GameAudio.isMuted() ? '🔇' : '🔊', { fontSize: '26px' })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setInteractive({ useHandCursor: true })
    muteBtn.on('pointerdown', () => {
      GameAudio.ensureStarted()
      const muted = GameAudio.toggleMute()
      muteBtn.setText(muted ? '🔇' : '🔊')
    })

    // Portal-Energie-Balken (in der Portalwelt)
    this.energyBar = this.add.graphics().setScrollFactor(0).setDepth(1000).setVisible(false)
    this.energyLabel = this.add
      .text(w / 2, 44, '', {
        fontFamily: 'sans-serif',
        fontSize: '14px',
        color: '#eafffd',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(1000)
      .setVisible(false)

    const onHud = (d: HudData) => {
      if (d.mode === 'menu') {
        // Menü-Screens: kein Spiel-HUD
        this.hudText.setText('')
        this.energyBar.setVisible(false)
        this.energyLabel.setVisible(false)
        this.toastText.setAlpha(0)
        return
      }
      if (d.mode === 'portal') {
        this.hudText.setText(`🌀 ${d.portalName}`)
        return
      }
      const built = d.built ? '   ✅ Portal gebaut' : ''
      let txt = `${d.portalName}\nTeile: ${d.collected}/${d.total}${built}`
      if (d.built && d.energy !== undefined) txt += `\n🔋 Portal-Energie: ${Math.round(d.energy)}%`
      this.hudText.setText(txt)
      this.energyBar.setVisible(false)
      this.energyLabel.setVisible(false)
    }
    const onToast = (msg: string) => this.showToast(msg)
    const onEnergy = (d: { value: number } | null) => {
      if (!d) {
        this.energyBar.setVisible(false)
        this.energyLabel.setVisible(false)
        return
      }
      this.drawEnergy(d.value)
    }

    this.game.events.on('hud', onHud)
    this.game.events.on('toast', onToast)
    this.game.events.on('energy', onEnergy)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('hud', onHud)
      this.game.events.off('toast', onToast)
      this.game.events.off('energy', onEnergy)
    })
  }

  private drawEnergy(value: number) {
    const w = this.cameras.main.width
    const bw = 220
    const bh = 16
    const bx = w / 2 - bw / 2
    const by = 62
    const col = value < 25 ? 0xff5252 : value < 60 ? 0xffca28 : 0x39d4c8
    this.energyBar.clear()
    this.energyBar.fillStyle(0x000000, 0.5)
    this.energyBar.fillRoundedRect(bx - 2, by - 2, bw + 4, bh + 4, 6)
    this.energyBar.fillStyle(0x0a2a40, 1)
    this.energyBar.fillRoundedRect(bx, by, bw, bh, 5)
    this.energyBar.fillStyle(col, 1)
    this.energyBar.fillRoundedRect(bx, by, Math.max(4, (bw * value) / 100), bh, 5)
    this.energyBar.setVisible(true)
    this.energyLabel.setText(`🔋 Portal-Energie  ${Math.round(value)}%`).setVisible(true)
  }

  private showToast(msg: string) {
    this.toastText.setText(msg).setAlpha(1)
    this.toastTimer?.remove()
    this.toastTimer = this.time.delayedCall(4200, () => {
      this.tweens.add({ targets: this.toastText, alpha: 0, duration: 400 })
    })
  }
}
