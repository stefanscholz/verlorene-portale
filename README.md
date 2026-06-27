# Verlorene Portale

Ein kleines Abenteuerspiel für Kinder (ab ~10 Jahren), das im Smartphone-Browser
läuft. Eine Katastrophe hat alle Portale zerstört. Deine Aufgabe: Finde die
einzelnen **Portal-Teile** in der Hauptwelt, baue das Portal am **Fundament**
wieder auf, betritt die Welt dahinter, **befreie** die dort lauernde Gefahr und
gewinne so eine neue **Kraft** und einen tierischen **Freund**, der dir bei der
weiteren Suche hilft.

## Spielablauf (erster Meilenstein)

1. **Erkunden** – Tippe auf den Boden, deine Figur läuft dorthin.
2. **Sammeln** – Finde die **3 Teile** des Waldportals (oben rechts, unten links,
   unten rechts auf der Karte).
3. **Bauen** – Gehe zum Fundament; mit allen Teilen erscheint der Knopf
   **„Portal bauen"**.
4. **Betreten** – Lauf in das leuchtende Portal.
5. **Gefahr besiegen** – Tippe den gelben **„Werfen"**-Knopf und triff das Wesen
   mit Lichtkugeln, bis sein Energie-Balken leer ist. Es wird **befreit**, nicht
   zerstört.
6. **Belohnung** – Du erhältst die Kraft **„Spürsinn"** und den Begleiter
   **Glimmer**. Geh durchs Rück-Portal zurück – Glimmer folgt dir und **leuchtet
   auf, wenn ein Portal-Teil in der Nähe ist**.

Der Fortschritt wird im Browser gespeichert (localStorage) und übersteht einen
Neustart.

## Technik

- **Phaser 3** + **TypeScript**, gebaut mit **Vite**
- **PWA** (per `vite-plugin-pwa`) – lässt sich auf dem Handy „Zum Startbildschirm
  hinzufügen"
- **Top-Down**, Steuerung per **Tippen zum Bewegen**
- Grafik sind aktuell **Platzhalter** (farbige Formen), die zur Laufzeit erzeugt
  werden – echte Sprites sind ein späterer Schritt
- Portale sind **datengetrieben** (`src/data/portals.ts`): weitere Welten inkl.
  eigener Gefahr, Kraft und Begleiter entstehen durch zusätzliche Einträge

## Entwicklung

```bash
npm install
npm run dev      # Dev-Server; Netzwerk-URL fürs Handy beachten (gleiches WLAN)
npm run build    # Typprüfung + Produktions-Build nach dist/
npm run preview  # Produktions-Build lokal ansehen (PWA testen)
```

## Projektstruktur

```
src/
  main.ts                 Phaser-Konfiguration, registriert die Scenes
  config.ts               Konstanten, Farben, Texturschlüssel
  data/portals.ts         Datengetriebene Portal-Definitionen
  systems/GameState.ts    Fortschritt + Speichern/Laden (localStorage)
  scenes/
    BootScene.ts          erzeugt Platzhalter-Texturen, startet das Spiel
    MainWorldScene.ts     Hauptwelt: sammeln, bauen, betreten
    PortalWorldScene.ts   Belohnungswelt: Kampf, Kraft, Begleiter, Rückweg
    UIScene.ts            HUD-Overlay (Teile-Zähler, Hinweise)
  objects/
    Player.ts             Spielfigur (Tippen zum Bewegen)
    Collectible.ts        einsammelbares Portal-Teil
    PortalFoundation.ts   Fundament -> aktives Portal
    Projectile.ts         geworfene Lichtkugel
    Creature.ts           die Gefahr (wird zum Freund)
    Companion.ts          Begleiter in der Hauptwelt
```
