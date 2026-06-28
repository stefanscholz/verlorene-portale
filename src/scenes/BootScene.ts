import Phaser from 'phaser'
import { TEX, PLAYER_ANIM } from '../config'
import { GameState } from '../systems/GameState'

// Lädt den Spielstand und alle SVG-Grafiken (aus public/sprites/) als Texturen.
// SVGs werden beim Laden in der angegebenen Größe gerastert -> scharf auf jedem
// Display, ohne externe Asset-Downloads. Startet danach HUD + Hauptwelt.
export class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene')
  }

  preload() {
    this.showLoadingBar()

    this.load.setPath('sprites')
    const svg = (key: string, file: string, width: number, height: number) =>
      this.load.svg(key, file, { width, height })

    svg(TEX.ground, 'ground.svg', 64, 64)
    svg(TEX.groundAlt, 'ground_alt.svg', 64, 64)
    // Figur-Frames (je Richtung: idle + 2 Schrittbilder)
    for (const dir of ['down', 'up', 'side'] as const) {
      const a = PLAYER_ANIM[dir]
      svg(a.idle, `player_${dir}_idle.svg`, 40, 40)
      svg(a.walk[0], `player_${dir}_walk1.svg`, 40, 40)
      svg(a.walk[1], `player_${dir}_walk2.svg`, 40, 40)
    }
    svg(TEX.partRahmen, 'part_rahmen.svg', 40, 40)
    svg(TEX.partKristall, 'part_kristall.svg', 40, 40)
    svg(TEX.partSchluessel, 'part_schluessel.svg', 40, 40)
    svg(TEX.foundation, 'foundation.svg', 90, 90)
    svg(TEX.portal, 'portal.svg', 100, 100)
    svg(TEX.projectile, 'projectile.svg', 20, 20)
    svg(TEX.creature, 'creature.svg', 56, 56)
    svg(TEX.creatureFriend, 'creature_friend.svg', 56, 56)
    svg(TEX.companion, 'companion.svg', 28, 28)
    svg(TEX.floorSpace, 'floor_space.svg', 64, 64)
    svg(TEX.hazard, 'hazard_blackhole.svg', 64, 64)
    svg(TEX.energy, 'energy_star.svg', 32, 32)
    svg(TEX.compass, 'compass_arrow.svg', 32, 32)
    svg(TEX.camp, 'camp.svg', 80, 80)
    // Terrain-Kacheln (Wald-Thema)
    svg(TEX.tGras, 't_gras.svg', 64, 64)
    svg(TEX.tWeg, 't_weg.svg', 64, 64)
    svg(TEX.tWald, 't_wald.svg', 64, 64)
    svg(TEX.tFlach, 't_flach.svg', 64, 64)
    svg(TEX.tTief, 't_tief.svg', 64, 64)
    svg(TEX.tBerg, 't_berg.svg', 64, 64)
    svg(TEX.tStein, 't_stein.svg', 64, 64)
    // Terrain-Kacheln (Weltraum-Thema)
    svg(TEX.tNebel, 't_nebel.svg', 64, 64)
    svg(TEX.tPfad, 't_pfad.svg', 64, 64)
    svg(TEX.tFeld, 't_feld.svg', 64, 64)
    svg(TEX.tLeere, 't_leere.svg', 64, 64)
    svg(TEX.tBrocken, 't_brocken.svg', 64, 64)
    // Terrain-Kacheln (Wüsten-Thema)
    svg(TEX.tSand, 't_sand.svg', 64, 64)
    svg(TEX.tWuestenweg, 't_wuestenweg.svg', 64, 64)
    svg(TEX.tDuene, 't_duene.svg', 64, 64)
    svg(TEX.tTreibsand, 't_treibsand.svg', 64, 64)
    svg(TEX.tWuestenfels, 't_wuestenfels.svg', 64, 64)
    // Terrain-Kacheln (Höhlen-Thema)
    svg(TEX.tBoden, 't_boden.svg', 64, 64)
    svg(TEX.tPilz, 't_pilz.svg', 64, 64)
    svg(TEX.tEnge, 't_enge.svg', 64, 64)
    svg(TEX.tLava, 't_lava.svg', 64, 64)
    svg(TEX.tHoehleFels, 't_hoehlefels.svg', 64, 64)
  }

  create() {
    GameState.load()
    this.createPlayerAnims()
    this.scene.launch('UIScene')
    this.scene.start('TitleScene')
  }

  // Lauf- und Idle-Animationen je Richtung (global, einmalig).
  private createPlayerAnims() {
    for (const dir of ['down', 'up', 'side'] as const) {
      const a = PLAYER_ANIM[dir]
      this.anims.create({
        key: `walk-${dir}`,
        frames: a.walk.map((key) => ({ key })),
        frameRate: 7,
        repeat: -1,
      })
      this.anims.create({
        key: `idle-${dir}`,
        frames: [{ key: a.idle }],
        frameRate: 1,
        repeat: -1,
      })
    }
  }

  private showLoadingBar() {
    const { width, height } = this.scale
    this.add
      .text(width / 2, height / 2 - 30, 'Verlorene Portale', {
        fontFamily: 'sans-serif',
        fontSize: '22px',
        color: '#8be9fd',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
    this.add.rectangle(width / 2, height / 2 + 10, 220, 16, 0x000000, 0.4)
    const bar = this.add
      .rectangle(width / 2 - 104, height / 2 + 10, 4, 10, 0x39d4c8)
      .setOrigin(0, 0.5)
    this.load.on('progress', (p: number) => {
      bar.width = 4 + 200 * p
    })
  }
}
