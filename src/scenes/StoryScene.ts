import Phaser from 'phaser'
import { TEX } from '../config'
import { addAtmosphere } from '../objects/atmosphere'

// Erzähl-Intro: die Geschichte der großen Katastrophe in kurzen, kindgerechten
// Seiten. Antippen blättert weiter; „Überspringen" springt direkt ins Spiel.
const PAGES = [
  'Vor langer Zeit leuchteten überall geheimnisvolle Portale. Sie verbanden unsere Welt mit vielen anderen.',
  'Doch dann geschah die große Katastrophe. Ein gewaltiges Beben zerriss die Portale – alle auf einmal.',
  'Die leuchtenden Tore zerbrachen in viele Teile. Zurück blieben nur stille, kalte Fundamente.',
  'Aus den fernen Welten kamen seltsame Wesen. Verängstigt und wild streiften sie umher.',
  'Doch es gibt Hoffnung: Du bist ein junger Portal-Wächter und kannst die Teile wiederfinden!',
  'Baue die Portale neu auf, beruhige die Wesen und gewinne ihre Kräfte – und neue Freunde.\n\nBist du bereit? Dein Abenteuer beginnt!',
]

export class StoryScene extends Phaser.Scene {
  private next = 'MainWorldScene'
  private page = 0
  private bodyText!: Phaser.GameObjects.Text
  private hint!: Phaser.GameObjects.Text
  private done = false

  constructor() {
    super('StoryScene')
  }

  init(data: { next?: string }) {
    this.next = data?.next ?? 'MainWorldScene'
    this.page = 0
    this.done = false
  }

  create() {
    const w = this.scale.width
    const h = this.scale.height
    this.cameras.main.setBackgroundColor('#120f28')
    addAtmosphere(this, w, h, 22)

    this.add.image(w / 2, h * 0.26, TEX.portal).setScale(1.1).setAlpha(0.9)

    this.add
      .text(w / 2, h * 0.46, 'Die Geschichte', {
        fontFamily: 'sans-serif',
        fontSize: '24px',
        color: '#8be9fd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)

    this.bodyText = this.add
      .text(w / 2, h * 0.62, '', {
        fontFamily: 'sans-serif',
        fontSize: '20px',
        color: '#ffffff',
        align: 'center',
        wordWrap: { width: w - 64 },
        lineSpacing: 6,
      })
      .setOrigin(0.5)

    this.hint = this.add
      .text(w / 2, h * 0.88, 'Tippen zum Weiterlesen ▶', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#9a93c0',
      })
      .setOrigin(0.5)
    this.tweens.add({ targets: this.hint, alpha: 0.3, duration: 800, yoyo: true, repeat: -1 })

    // Überspringen
    this.add
      .text(w - 16, 28, 'Überspringen ✕', {
        fontFamily: 'sans-serif',
        fontSize: '15px',
        color: '#c9c2ee',
        backgroundColor: '#00000066',
        padding: { x: 8, y: 5 },
      })
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.finish())

    this.showPage()
    this.input.on('pointerdown', (_p: Phaser.Input.Pointer, objects: unknown[]) => {
      // Taps auf den „Überspringen"-Button nicht als Weiterblättern werten
      if (objects && objects.length > 0) return
      this.advance()
    })
  }

  private showPage() {
    this.bodyText.setText(PAGES[this.page]).setAlpha(0)
    this.tweens.add({ targets: this.bodyText, alpha: 1, duration: 350 })
    if (this.page === PAGES.length - 1) this.hint.setText('Tippen, um zu starten ▶')
  }

  private advance() {
    if (this.done) return
    if (this.page < PAGES.length - 1) {
      this.page++
      this.showPage()
    } else {
      this.finish()
    }
  }

  private finish() {
    if (this.done) return
    this.done = true
    this.cameras.main.fadeOut(300, 0, 0, 0)
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start(this.next))
  }
}
