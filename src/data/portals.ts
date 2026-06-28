// Datengetriebene Definition der Portale. Ein neues Portal (mit eigener
// Belohnungswelt, Gefahr, Kraft und Begleiter) entsteht allein durch einen
// weiteren Eintrag in PORTALS – die Spiel-Logik (Scenes) bleibt unverändert.

import { TEX } from '../config'

export interface Vec2 {
  x: number
  y: number
}

export interface PartDef {
  id: string
  name: string
  tex: string // Textur-Schlüssel (eigenes Aussehen je Teil)
}

/** Die "Gefahr" in der Belohnungswelt. */
export interface CreatureDef {
  energy: number // Anzahl Treffer bis zur Befreiung
  speed: number
  color: number
}

/** Die Kraft, die man nach dem Sieg erhält. */
export interface AbilityDef {
  id: string
  name: string
  description: string
}

/** Das befreundete Wesen, das danach in die Hauptwelt mitkommt. */
export interface CompanionDef {
  id: string
  name: string
  color: number
}

export interface RewardWorldDef {
  groundColor: number
  terrainTheme: string // Terrain-Thema der Portalwelt (siehe systems/terrain.ts)
  creature: CreatureDef
  ability: AbilityDef
  companion: CompanionDef
  terrainAbility: AbilityDef // wird freigeschaltet, wenn der Freund ins Lager kommt
  // Lade-/Hazard-Spiel (greift in der bereits befreiten Welt):
  floorTex: string // Boden-Kachel
  hazardTex: string // verfallene/gefährliche Kachel
  hazardName: string // z. B. "Schwarzes Loch"
  energyTex: string // Energiequelle
  energyName: string // z. B. "Sternenenergie"
  initialEnergySources: number
}

export interface PortalDef {
  id: string
  name: string
  parts: PartDef[]
  reward: RewardWorldDef
}

export const PORTALS: PortalDef[] = [
  {
    id: 'portal-wald',
    name: 'Das Waldportal',
    parts: [
      { id: 'rahmen', name: 'Portal-Rahmen', tex: TEX.partRahmen },
      { id: 'kristall', name: 'Leucht-Kristall', tex: TEX.partKristall },
      { id: 'schluessel', name: 'Portal-Schlüssel', tex: TEX.partSchluessel },
    ],
    reward: {
      groundColor: 0x4527a0,
      terrainTheme: 'weltraum',
      creature: { energy: 5, speed: 72, color: 0xe53935 },
      ability: {
        id: 'spuersinn',
        name: 'Spürsinn',
        description: 'Dein Begleiter leuchtet, wenn ein Portal-Teil in der Nähe ist!',
      },
      companion: { id: 'glimmer', name: 'Glimmer', color: 0x66bb6a },
      terrainAbility: {
        id: 'waldlaeufer',
        name: 'Waldläufer',
        description: 'Du bewegst dich wieder normal schnell durch Wälder!',
      },
      floorTex: TEX.floorSpace,
      hazardTex: TEX.hazard,
      hazardName: 'Schwarzes Loch',
      energyTex: TEX.energy,
      energyName: 'Sternenenergie',
      initialEnergySources: 6,
    },
  },
  {
    id: 'portal-stern',
    name: 'Das Sternenportal',
    parts: [
      { id: 'rahmen', name: 'Stern-Rahmen', tex: TEX.partRahmen },
      { id: 'kristall', name: 'Stern-Kristall', tex: TEX.partKristall },
      { id: 'schluessel', name: 'Stern-Schlüssel', tex: TEX.partSchluessel },
    ],
    reward: {
      groundColor: 0x16314f,
      terrainTheme: 'weltraum',
      creature: { energy: 6, speed: 80, color: 0x42a5f5 },
      ability: {
        id: 'sternensicht',
        name: 'Sternensicht',
        description: 'Dein Begleiter leuchtet, wenn ein Portal-Teil in der Nähe ist!',
      },
      companion: { id: 'funki', name: 'Funki', color: 0x42a5f5 },
      terrainAbility: {
        id: 'wassergeist',
        name: 'Wassergeist',
        description: 'Tiefes Wasser zieht dir keine Energie mehr ab!',
      },
      floorTex: TEX.floorSpace,
      hazardTex: TEX.hazard,
      hazardName: 'Schwarzes Loch',
      energyTex: TEX.energy,
      energyName: 'Sternenenergie',
      initialEnergySources: 6,
    },
  },
]

export const FIRST_PORTAL = PORTALS[0]
