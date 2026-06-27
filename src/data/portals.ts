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
  pos: Vec2
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
  creature: CreatureDef
  ability: AbilityDef
  companion: CompanionDef
}

export interface PortalDef {
  id: string
  name: string
  foundation: Vec2
  parts: PartDef[]
  reward: RewardWorldDef
}

export const PORTALS: PortalDef[] = [
  {
    id: 'portal-wald',
    name: 'Das Waldportal',
    foundation: { x: 800, y: 320 },
    parts: [
      { id: 'rahmen', name: 'Portal-Rahmen', pos: { x: 240, y: 1200 }, tex: TEX.partRahmen },
      { id: 'kristall', name: 'Leucht-Kristall', pos: { x: 1360, y: 1300 }, tex: TEX.partKristall },
      { id: 'schluessel', name: 'Portal-Schlüssel', pos: { x: 1320, y: 380 }, tex: TEX.partSchluessel },
    ],
    reward: {
      groundColor: 0x4527a0,
      creature: { energy: 5, speed: 72, color: 0xe53935 },
      ability: {
        id: 'spuersinn',
        name: 'Spürsinn',
        description: 'Dein Begleiter leuchtet, wenn ein Portal-Teil in der Nähe ist!',
      },
      companion: { id: 'glimmer', name: 'Glimmer', color: 0x66bb6a },
    },
  },
]

export const FIRST_PORTAL = PORTALS[0]
