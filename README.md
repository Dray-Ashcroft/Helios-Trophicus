<p align="center">
  <img src="Solus-Assets/banner/banner.png" alt="Oekos Matrix — Ecological Interaction Simulator" width="100%">
</p>

<h1 align="center">🌿 Oekos Matrix</h1>

<p align="center"><em>Ecological Interaction Simulator</em></p>

<p align="center"><a href="https://oekos-matrix.stark-kodex.workers.dev/"><strong>Explore the Matrix</strong></a></p>

<p align="center">
  <a href="#-three-tab-architecture">Tabs</a> ·
  <a href="#-the-ecosystem">Ecosystem</a> ·
  <a href="#-concepts-covered">Concepts</a> ·
  <a href="#-controls">Controls</a> ·
  <a href="#%EF%B8%8F-technology">Technology</a> ·
  <a href="#-credits">Credits</a> ·
  <a href="#-3d-models">3D Models</a> ·
  <a href="#%EF%B8%8F-changelog">Changelog</a>
</p>

---

## 📖 About

An interactive 3D simulator for teaching how energy moves through an ecosystem. Real animated organisms show the energy pyramid, a food chain and a food web side by side, so students can see:

- **who eats whom**
- **why only about 10% of energy** passes up each level
- **where the rest goes**

Built for classroom smart panels; it works on laptops and phones too.

---

## ✦ Three Tab Architecture

Switch tabs with the three icons at the top.

| Tab | What it shows |
|:--|:--|
| 🔺 **Energy Pyramid** | Four trophic levels, each with its own 3D organisms |
| 🔗 **Food Chain** | Grass → Snail → Frog → Snake → Eagle, each on its own chunk of land |
| 🕸️ **Food Web** | 13 organisms joined by 15 feeding links |

### 🔺 Energy Pyramid

- **Tap the Sun** for a seven-step walkthrough:
  PAR → producers (GPP, respiration, NPP) → the 10% transfer up each level → heat loss → decomposers → nutrients flowing through the soil into the producers' roots
- **Graph** energy, heat or biomass across the four levels.
- **Simulate mortality:** an organism dies, its remains fall to the soil, and the level's energy and biomass drop.
- **Hold a layer** to open its profile: a short description, an example picture and the energy available.

### 🔗 Food Chain

- Energy falls **50 → 5 → 0.5 → 0.05 → 0.005 rel. J** (the grass keeps NPP 50 of the 100 it fixes; each link passes on about 10%), with heat rising from every organism.
- **Tap an organism** to see its arrows: one from its food, one to what eats it.
- **Walk through it step by step**, one feeding link at a time, ending with why food chains are short.

### 🕸️ Food Web

- Arrows stay hidden until you **tap an organism**; then only its links appear, with what it eats, what eats it and a short note.
- **Show the food chain inside the web** (grass → mouse → fox → eagle) to see that:
  - a chain is one path through the web
  - an animal's trophic level depends on what it eats

---

## 🌍 The Ecosystem

| Level | Pyramid organisms | Role |
|:--|:--|:--|
| TL4 | Eagle · Owl | Tertiary consumers: eat secondary consumers |
| TL3 | Scorpion · Snake · Frog | Secondary consumers: eat primary consumers |
| TL2 | Rat · Black ox beetle · Pigeon · Rabbit | Primary consumers: eat producers |
| TL1 | Grass · Tree · Lungwort | Producers: make food by photosynthesis |

The food web adds a snail, a butterfly, a deer, a red fox, a white tiger and a Komodo dragon, with grass, a tree and lungwort as producers.

---

## 🌱 Concepts Covered

| Area | Concepts |
|:--|:--|
| Structure | Trophic levels · Food chains and food webs · Apex predators · Animals feeding at more than one trophic level |
| Energy | PAR · GPP, NPP and respiration · Lindeman's 10% law · Heat loss |
| Pyramids | Pyramids of energy and biomass |
| Cycling | Decomposers · Nutrient cycling |

---

## 🧭 Controls

| Action | What it does |
|:--|:--|
| Drag · scroll or pinch | Rotate · zoom |
| Tap | Select a layer or organism |
| Hold a pyramid layer or organism | Open that level's profile |
| ⌃ on a card | Fold the card away to free the screen |
| Save · Export · Import | Save an HTML snapshot, or export and re-import the simulator's state as JSON |

---

## ⚙️ Technology

| Layer | Tools |
|:--|:--|
| Structure and style | HTML · CSS |
| Logic | JavaScript |
| 3D rendering | Three.js |
| Hosting | Cloudflare Pages |

---

## 👥 Credits

| Role | Credit |
|:--|:--|
| **Project Designer** | Sai Prasad · Biology Lecturer · M.Sc. Agricultural Entomology · ASRB NET |
| Scientific reasoning | Perplexity Sonar 2 |
| Realistic images | OpenAI GPT-5.6 |
| Architecture and implementation | Claude Opus 5.5 |

---

## 🧩 3D Models

| Organism | Model | Creator | Licence |
|:--|:--|:--|:--|
| **Scene** | | | |
| ☀️ Sun | [Sun](https://sketchfab.com/3d-models/sun-9ef1c68fbb944147bcfcc891d3912645) | SebastianSosnowski | CC BY 4.0 |
| 🏝️ Pyramid base | Landpiece | nitesharma12457868 | CC BY 4.0 |
| 🪨 Platforms (food chain, food web) | [Chunk Of Land 1](https://skfb.ly/6uCLu) | Glen Johnson | CC BY 4.0 |
| **Producers (TL1)** | | | |
| 🌾 Grass (food chain) | [Grass](https://sketchfab.com/3d-models/grass-f2f2bddb2728483a9105c5f5114eb15e) | Cosmic_dust | CC BY 4.0 |
| 🌾 Grass (pyramid, food web) | [Realistics grass 06](https://skfb.ly/oQLNJ) | POLYSCAN | CC BY 4.0 |
| 🌳 Tree (pyramid, food web) | [Realistic Europan Tree](https://skfb.ly/oxyBJ) | BB ARTS | CC BY 4.0 |
| 🌸 Lungwort (pyramid, food web) | [Spring Lungwort flowering plants](https://skfb.ly/oQDEK) | hkhalif | CC BY 4.0 |
| **Plant eaters** | | | |
| 🪲 Black ox beetle (pyramid) | [Black Ox Beetle](https://skfb.ly/oOYyZ) | ThatMelGuy | CC BY 4.0 |
| 🐌 Snail (food chain, food web) | [Snail (Non-Commercial)](https://sketchfab.com/3d-models/snail-non-commercial-6d3d307258924e07a7f02a8427f5f018) | Nyilonelycompany | CC BY-NC 4.0 ¹ |
| 🦋 Butterfly (food web) | [BUTTERFLY](https://skfb.ly/oGZZW) | Rukh3D | CC BY 4.0 |
| 🕊️ Pigeon (pyramid) | Pigeon | kenchoo | CC BY 4.0 |
| 🐁 Mouse (food web) | [Sand Mouse](https://skfb.ly/pKTC6) | soniarocha29702 | CC BY 4.0 |
| 🐀 Black rat (pyramid) | [Black Rat (Free download)](https://skfb.ly/p9TYP) | Nestaeric | CC BY 4.0 |
| 🐇 Rabbit (pyramid) | [RABBIT - Realistic 3D Model (DEMO FREE)](https://skfb.ly/pM9sw) | WildMesh 3D | CC BY-NC 4.0 ¹ |
| 🦌 Deer (food web) | [Animated Deer](https://skfb.ly/oGXBO) | igor-lir | CC BY 4.0 |
| **Predators** | | | |
| 🐸 Frog (food chain) | [Frog](https://skfb.ly/oSSIz) | kenchoo | CC BY-NC-ND 4.0 ¹ ² |
| 🐸 Frog (pyramid) | CC0 シュレーゲルアオガエル ♀ Schlegel's Green Tree Frog | — | CC0 1.0 |
| 🦊 Red fox (food web) | [Fox](https://skfb.ly/6TnPL) | Alexei Ostapenko | CC BY 4.0 |
| 🦎 Komodo dragon (food web) | [Komodo Dragon Lizard](https://sketchfab.com/3d-models/komodo-dragon-lizard-f4c8b2accf50495db3d64ca583f2a148) | Nyilonelycompany | Sketchfab Standard |
| 🐍 Spectacled cobra | [Snake attack Animations](https://sketchfab.com/3d-models/snake-attack-animations-multiple-83c4290cd4b648fd942d4bbc2280a3f6) | Imagigoo | CC BY 4.0 |
| 🦂 Scorpion (pyramid) | [Scorpion](https://skfb.ly/6WLZY) | anthonyvanoo | CC BY 4.0 |
| 🐅 Tiger (food web) | [White Tiger (RIGGED ANIMATED)](https://skfb.ly/oIUBX) | MotionStreamStudios | CC BY 4.0 |
| 🦉 Owl (pyramid, food web) | [Owl](https://skfb.ly/pwnos) | kenchoo | CC BY-NC 4.0 ¹ |
| 🦅 Eagle | [White Eagle Animation Fast Fly](https://sketchfab.com/3d-models/white-eagle-animation-fast-fly-30203bf39e5145f19c79e83c550139d3) | GremorySaiyan | CC BY 4.0 |
| **Decomposers** | | | |
| 🍄 Decomposer fungi (pyramid) | [Neon mushrooms - Day 1](https://skfb.ly/orwRY) | patrakeevasveta | CC BY 4.0 |

<sub>¹ Non-commercial use only. ² No derivatives: the frog is shared unaltered, apart from the file-format compression that CC 4.0 licences allow as a technical modification. Models keep their full original geometry; textures are packed to 2048 px WebP for faster loading. Creators retain ownership.</sub>

---

## 🗒️ Changelog

Version history, RC I to RC XVII: [CHANGELOG.md](CHANGELOG.md)

---

## 📜 License

Source code: **GNU GPL-3.0**. 3D models keep their own licences (see [3D Models](#-3d-models)).

---

<p align="center">
  <b>Repository</b>: GitHub · Codeberg &nbsp;&nbsp;|&nbsp;&nbsp; <b>Hosting</b>: Cloudflare
</p>
