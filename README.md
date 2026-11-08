<p align="center">
  <img src="Solus-Assets/banner/banner.png" alt="Oekos Matrix — Ecological Interaction Simulator" width="100%">
</p>

<h1 align="center">🌿 Oekos Matrix</h1>

<p align="center"><em>Ecological Interaction Simulator</em></p>

<p align="center"><a href="https://solus-en-orb.stark-kodex.workers.dev"><strong>Explore the Simulation →</strong></a></p>

---

An interactive 3D simulator for teaching how energy moves through an ecosystem. Real animated organisms show the energy pyramid, a food chain and a food web side by side, so students can see who eats whom, why only about 10% of energy passes up each level, and where the rest goes. Built for classroom smart panels, and it works on laptops and phones too.

---

## ✦ Three Views

Switch views with the three icons at the top.

### 🔺 Energy Pyramid
Four trophic levels, each with its own 3D organisms.
- **Tap the Sun** for a seven-step walkthrough: PAR → producers (GPP, respiration, NPP) → the 10% transfer up each level → heat loss → decomposers → nutrients returning to the producers.
- **Graph** energy, heat or biomass across the four levels.
- **Simulate mortality**: an organism dies, its remains fall to the soil, and the level's energy and biomass drop.
- **Hold a layer** to open its profile: a short description, an example picture and the energy available.

### 🔗 Food Chain
Grass → Snail → Frog → Snake → Eagle, each on its own chunk of land.
- Energy falls **100 → 10 → 1 → 0.1 → 0.01 rel. J**, with heat rising from every organism.
- **Tap an organism** to see its arrows: one from its food, one to what eats it.
- **Walk through it step by step**, one feeding link at a time, ending with why food chains are short.

### 🕸️ Food Web
13 organisms joined by 15 feeding links.
- Arrows stay hidden until you **tap an organism**; then only its links appear, with what it eats, what eats it and a short note.
- **Show the food chain inside the web** (grass → mouse → fox → eagle) to see that a chain is one path through the web, and that an animal's trophic level depends on what it eats.

---

## 🌍 The Ecosystem

| Level | Pyramid | Role |
|:--|:--|:--|
| TL4 | Eagle · Owl | Tertiary consumers: eat secondary consumers |
| TL3 | Scorpion · Snake · Frog | Secondary consumers: eat primary consumers |
| TL2 | Mouse · Grasshopper · Butterfly · Deer | Primary consumers: eat producers |
| TL1 | Grass · Lupine · Tree | Producers: make food by photosynthesis |

The food web adds a snail, a red fox, a white tiger and a Komodo dragon, with grass, a tree and lungwort as producers.

---

## 🌱 Concepts Covered

Trophic levels · Food chains and food webs · Lindeman's 10% law · PAR · GPP, NPP and respiration · Heat loss · Pyramids of energy and biomass · Decomposers · Nutrient cycling · Apex predators · Animals feeding at more than one trophic level

---

## 🧭 Controls

| Action | What it does |
|:--|:--|
| Drag · scroll or pinch | Rotate · zoom |
| Tap | Select a layer or organism |
| Hold a pyramid layer | Open its profile |
| Hold an organism | Show your own picture in place of the model (**Original** brings the model back) |
| ⌃ on a card | Fold the card away to free the screen |
| Save · Export · Import | Save an HTML snapshot, or export and re-import the simulator's state as JSON |

---

## ⚙️ Technology

HTML · CSS · JavaScript · Three.js · Cloudflare

Runs entirely in the browser with no build step. To run it locally, serve the folder with any static server (for example `npx serve`) rather than opening `index.html` directly, so the 3D models can load.

**Project Designer:** Sai Prasad  
**Code:** Perplexity Sonar 2 (architecture) · OpenAI GPT-5.6 (refinement) · Claude Opus 4.8 (implementation)

---

## 🧩 3D Models

| Organism | Model | Creator | Licence |
|:--|:--|:--|:--|
| 🪨 Platforms (food chain, food web) | [Chunk Of Land 1](https://skfb.ly/6uCLu) | Glen Johnson | CC BY 4.0 |
| ☀️ Sun | [Sun](https://sketchfab.com/3d-models/sun-9ef1c68fbb944147bcfcc891d3912645) | SebastianSosnowski | CC BY 4.0 |
| 🌾 Grass (pyramid, food chain) | [Grass](https://sketchfab.com/3d-models/grass-f2f2bddb2728483a9105c5f5114eb15e) | Cosmic_dust | CC BY 4.0 |
| 🪻 Lupine (pyramid) | [Lupine Plant](https://sketchfab.com/3d-models/lupine-plant-bf30f1110c174d4baedda0ed63778439) | rufusrockwell | CC BY 4.0 |
| 🌾 Grass (food web) | [Realistics grass 06](https://skfb.ly/oQLNJ) | POLYSCAN | CC BY 4.0 |
| 🌳 Tree (food web) | [Realistic Europan Tree](https://skfb.ly/oxyBJ) | BB ARTS | CC BY 4.0 |
| 🌸 Lungwort (food web) | [Spring Lungwort flowering plants](https://skfb.ly/oQDEK) | hkhalif | CC BY 4.0 |
| 🌳 Tree (pyramid) | [Tree2](https://skfb.ly/oA7RW) | sale7zrn | CC BY 4.0 |
| 🦗 Grasshopper (pyramid) | [Tsumaguro Grasshopper](https://sketchfab.com/3d-models/cc0-tsumaguro-grasshopper-7e14b593732340d49bd8164c08d09a8d) | ffish.asia / floraZia.com | CC0 1.0 |
| 🐌 Snail (food chain, food web) | [Snail (Non-Commercial)](https://sketchfab.com/3d-models/snail-non-commercial-6d3d307258924e07a7f02a8427f5f018) | Nyilonelycompany | CC BY-NC 4.0 ¹ |
| 🦋 Butterfly | [BUTTERFLY](https://skfb.ly/oGZZW) | Rukh3D | CC BY 4.0 |
| 🐁 Mouse | [Sand Mouse](https://skfb.ly/pKTC6) | soniarocha29702 | CC BY 4.0 |
| 🦌 Deer | [Animated Deer](https://skfb.ly/oGXBO) | igor-lir | CC BY 4.0 |
| 🐸 Frog (food chain) | [Frog](https://skfb.ly/oSSIz) | kenchoo | CC BY-NC-ND 4.0 ¹ ² |
| 🐸 Common frog (pyramid) | Common Frog | kenchoo | CC BY-NC-SA 4.0 ¹ |
| 🦊 Red fox (food web) | Fox | *credit to be added* | |
| 🦎 Komodo dragon (food web) | [Komodo Dragon Lizard](https://sketchfab.com/3d-models/komodo-dragon-lizard-f4c8b2accf50495db3d64ca583f2a148) | Nyilonelycompany | Sketchfab Standard |
| 🐍 Snake (pyramid, food web) | [Snake attack Animations](https://sketchfab.com/3d-models/snake-attack-animations-multiple-83c4290cd4b648fd942d4bbc2280a3f6) | Imagigoo | CC BY 4.0 |
| 🐍 Snake (food chain) | [Snake Titanoboa by Dino Raul](https://skfb.ly/pvE97) | kenchoo | CC BY-NC 4.0 ¹ |
| 🦂 Scorpion (pyramid) | [Scorpion](https://skfb.ly/6WLZY) | anthonyvanoo | CC BY 4.0 |
| 🦉 Owl (pyramid, food web) | [Owl](https://skfb.ly/pwnos) | kenchoo | CC BY-NC 4.0 ¹ |
| 🐅 Tiger (food web) | [White Tiger (RIGGED ANIMATED)](https://skfb.ly/oIUBX) | MotionStreamStudios | CC BY 4.0 |
| 🦅 Eagle | [White Eagle Animation Fast Fly](https://sketchfab.com/3d-models/white-eagle-animation-fast-fly-30203bf39e5145f19c79e83c550139d3) | GremorySaiyan | CC BY 4.0 |

<sub>¹ Non-commercial use only. ² No derivatives: the frog is shared unaltered, apart from the file-format compression that CC 4.0 licences allow as a technical modification. Models keep their full original geometry; textures are packed to 2048 px WebP for faster loading. Creators retain ownership.</sub>

---

## 📜 License

Source code: **GNU GPL-3.0**. 3D models keep their own licences (above).

---

<p align="center">
  <b>Repository</b>: GitHub · Codeberg &nbsp;&nbsp;|&nbsp;&nbsp; <b>Hosting</b>: Cloudflare
</p>
