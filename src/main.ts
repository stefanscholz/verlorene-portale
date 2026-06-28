import Phaser from 'phaser'
import { GAME_WIDTH, GAME_HEIGHT } from './config'
import { GameState } from './systems/GameState'
import { BootScene } from './scenes/BootScene'
import { TitleScene } from './scenes/TitleScene'
import { StoryScene } from './scenes/StoryScene'
import { DifficultyScene } from './scenes/DifficultyScene'
import { MainWorldScene } from './scenes/MainWorldScene'
import { PortalWorldScene } from './scenes/PortalWorldScene'
import { UIScene } from './scenes/UIScene'

// Einstiegspunkt: Phaser-Spiel konfigurieren und starten. Scale.FIT skaliert
// die feste Spielfläche auf jede Handygröße (mit Letterboxing).
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [
    BootScene,
    TitleScene,
    StoryScene,
    DifficultyScene,
    MainWorldScene,
    PortalWorldScene,
    UIScene,
  ],
}

const game = new Phaser.Game(config)

// Für Debugging/Tests im Browser erreichbar machen.
;(window as unknown as { game: Phaser.Game }).game = game
;(window as unknown as { GameState: typeof GameState }).GameState = GameState
