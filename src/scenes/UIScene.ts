import Phaser from 'phaser'

export interface HudData {
  mode?: 'main' | 'portal'
  portalName: string
  collected?: number
  total?: number
  built?: boolean
}

// Overlay-Scene für das HUD: oben der Teile-Zähler / Weltname, in der Mitte
// kurze Hinweis-Meldungen ("Toasts"). Läuft dauerhaft über den Weltszenen und
// kommuniziert mit ihnen über globale Events (this.game.events).
export class UIScene extends Phaser.Scene {
  private hudText!: Phaser.GameObjects.Text
  private toastText!: Phaser.GameObjects.Text
  private toastTimer?: Phaser.Time.TimerEvent

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

    const onHud = (d: HudData) => {
      if (d.mode === 'portal') {
        this.hudText.setText(`🌀 ${d.portalName}`)
        return
      }
      const built = d.built ? '   ✅ Portal gebaut' : ''
      this.hudText.setText(`${d.portalName}\nTeile: ${d.collected}/${d.total}${built}`)
    }
    const onToast = (msg: string) => this.showToast(msg)

    this.game.events.on('hud', onHud)
    this.game.events.on('toast', onToast)
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off('hud', onHud)
      this.game.events.off('toast', onToast)
    })
  }

  private showToast(msg: string) {
    this.toastText.setText(msg).setAlpha(1)
    this.toastTimer?.remove()
    this.toastTimer = this.time.delayedCall(4200, () => {
      this.tweens.add({ targets: this.toastText, alpha: 0, duration: 400 })
    })
  }
}
