/* =========================================================================
   Oekos Matrix — Food chain view
   Grass → Snail → Frog → Snake → Eagle, as 3D models on chunks of land.
   Arrows point from the food to the feeder: the direction energy flows.
   They stay hidden until an organism is tapped or the walkthrough shows them.
   About 10% of the energy at one level reaches the next; the rest is used in
   respiration (lost as heat) or passes to decomposers in waste and remains.

   Self-contained: its own scene, renderer and loop. It runs only while the
   "Food chain" view is shown; the pyramid (script.js) pauses meanwhile.
   Models and the GLTF loader are fetched the first time the view is opened.
   ========================================================================= */
(function(){
  "use strict";

  var MODEL_DIR = "Solus-Assets/FoodChain/";
  var MODEL_DIR_FALLBACK = "https://raw.githubusercontent.com/Dray-Ashcroft/Helios-Trophicus/main/Solus-Assets/FoodChain/";
  var LOADER_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js";
  var MESHOPT_URL = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/libs/meshopt_decoder.js";   // models are meshopt-compressed
  var ENERGY_COLOR = 0xc6ea5a, HEAT_COLOR = 0xff9b54, BG = 0x05070d;

  // size = largest dimension in scene units (not to scale: a snail would vanish next to an eagle)
  // yaw  = turn applied after loading so each animal faces its food (towards the left) and a little towards the viewer
  var ORGS = [
    { id:"grass", tl:1, name:"Grass", role:"Producer", color:0x4ade80, energy:100, file:"../Pyramid/grass.glb", size:1.9, yaw:0, tufts:[[-0.5, -0.25, 1, 0], [0.45, -0.4, 0.9, 1.9], [0.05, 0.45, 0.85, 4.1], [-0.7, 0.55, 0.7, 2.7], [0.8, 0.35, 0.75, 5.3]],
      food:"None: makes its own food by photosynthesis, using sunlight, water and carbon dioxide.",
      eatenBy:"Snail" },
    { id:"snail", tl:2, name:"Snail", role:"Primary consumer · herbivore", color:0xfacc15, energy:10, file:"snail.glb", size:1.5, yaw:-1.0, posedBox:true,
      food:"Grass and other leaves (a producer), rasped off with its radula, a tongue covered in tiny teeth.", eatenBy:"Frog" },
    { id:"frog", tl:3, name:"Frog", role:"Secondary consumer · carnivore", color:0xfb923c, energy:1, file:"frog.glb", size:1.45, yaw:-1.0,
      food:"Snails, insects and other small animals.", eatenBy:"Snake" },
    { id:"snake", tl:4, name:"Snake", role:"Tertiary consumer · carnivore", color:0xf87171, energy:0.1, file:"snake.glb", size:4.6, yaw:0.5, lift:0.14, dx:0.35,   // lift: coils clear the rocky rim; dx: the long body stays on the rock
      food:"Frogs.", eatenBy:"Eagle" },
    { id:"eagle", tl:5, name:"Eagle", role:"Quaternary consumer · top carnivore", color:0xc084fc, energy:0.01, file:"eagle.glb", size:2.3, yaw:Math.PI-0.5, fly:1.35,
      food:"Snakes (snake eagles specialise in them).", eatenBy:"Nothing: it is at the top of this chain." }
  ];
  // Landscape (smart panel, laptop): a row climbing one low step per level, left to right.
  // Portrait (phone): a zig-zag stacked upwards, producer at the bottom, top carnivore at the top.
  var LAYOUTS = {
    wide:{ pos:function(i){ return [(i - 2) * 4.3, i * 0.55]; }, sun:[-12.9, 3.7, -1.2], lift:[0, 1.15, 0.6], halfW:13.8, halfH:5.6, cy:1.9 },
    tall:{ pos:function(i){ return [(i % 2 ? 1.55 : -1.55), i * 2.3]; }, sun:[-2.9, 2.3, -1.2], lift:[0, 0.35, 1.3], halfW:3.9, halfH:6.9, cy:5.0 }
  };
  var layout = LAYOUTS.wide, layoutName = "";
  ORGS.forEach(function(o, i){ var p = layout.pos(i); o.x = p[0]; o.y = p[1]; });

  var ready = false, building = false, active = false, raf = 0;
  var root, view, canvasHost, labelsHost, infoEl, statusEl;
  var scene, camera, renderer, world, clock, mixers = [], pulses = [], heat = [], arrows = [], arcs = [];
  var yaw = 0, pitch = 0.32, zoom = 1, fitDist = 20, selected = null, glowTex, sunHolder, sunHalo, flow, arrowMat;

  // ---------------------------------------------------------------- helpers
  function glowTexture(){
    var c = document.createElement("canvas"); c.width = c.height = 64; var g = c.getContext("2d");
    var r = g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,"rgba(255,255,255,1)"); r.addColorStop(0.35,"rgba(255,255,255,0.55)"); r.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c);
  }
  function fmt(n){ return n.toLocaleString("en-IN", { maximumFractionDigits:2 }); }
  var UNIT = " rel.&nbsp;J";   // same relative scale as the pyramid's energy panel (TL1 = 100)
  function hex(c){ return "#" + ("000000" + c.toString(16)).slice(-6); }
  function loadScript(url){
    return new Promise(function(res, rej){ var s = document.createElement("script"); s.src = url; s.onload = res; s.onerror = function(){ rej(new Error("Could not load " + url)); }; document.head.appendChild(s); });
  }
  function loadGLB(file){
    var loader = new THREE.GLTFLoader();
    if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
    function from(base){ return new Promise(function(res, rej){ loader.load(base + file, res, undefined, rej); }); }
    return from(MODEL_DIR).catch(function(){ return from(MODEL_DIR_FALLBACK); });
  }

  // ---------------------------------------------------------------- DOM
  // the description card folds to its title line (remembered on this device); the camera then re-fits
  function bindFold(card, key){
    var b = card && card.querySelector(".fc-fold"); if (!b) return;
    function set(f){ card.classList.toggle("folded", f); b.setAttribute("aria-expanded", f ? "false" : "true");
      b.setAttribute("aria-label", f ? "Expand card" : "Collapse card"); b.title = f ? "Expand" : "Collapse"; }
    try { set(localStorage.getItem(key) === "1"); } catch (e) {}
    b.addEventListener("click", function(){ var f = !card.classList.contains("folded"); set(f);
      try { localStorage.setItem(key, f ? "1" : "0"); } catch (e) {} resize(); });
  }
  function buildDom(){
    view = document.getElementById("foodChainView");
    canvasHost = view.querySelector(".fc-canvas");
    labelsHost = view.querySelector(".fc-labels");
    infoEl = document.getElementById("fcInfo"); bindFold(infoEl.parentNode, "oekos-fold-chain");
    statusEl = view.querySelector(".fc-status");
    ORGS.forEach(function(o){
      var el = document.createElement("button");
      el.type = "button"; el.className = "fc-tag"; el.style.setProperty("--tl", hex(o.color));
      el.innerHTML = '<span class="fc-tl">TL' + o.tl + '</span><span class="fc-name">' + o.name + '</span>' +
                     '<span class="fc-role">' + o.role.split(" · ")[0] + '</span><span class="fc-energy">' + fmt(o.energy) + UNIT + '</span>';
      el.addEventListener("click", function(){ select(o); });
      labelsHost.appendChild(el); o.tag = el;
    });
    for (var i = 0; i < ORGS.length - 1; i++){
      var p = document.createElement("div"); p.className = "fc-pct"; p.textContent = "10%"; labelsHost.appendChild(p); arrows.push({ label:p });
    }
    var sunTag = document.createElement("div"); sunTag.className = "fc-sun-tag"; sunTag.textContent = "Sunlight"; labelsHost.appendChild(sunTag); ORGS.sunTag = sunTag;
    document.getElementById("fcResetBtn").addEventListener("click", resetView);
    showIntro();
  }
  // ---------------------------------------------------------------- step-by-step walkthrough
  // step 0 = overview (everything flows); 1 = sunlight -> grass; 2..5 = one feeding link each; 6 = summary.
  // On a link step only that arrow and its two organisms stay lit; heat rises most from the one passing energy on.
  var step = 0;
  var STEPS = [null,
    { arc:-1, to:0, title:"Sunlight → Grass", pass:"Fixed 100 · respired ~50 · stored ~50",
      text:"Grass, a producer, captures sunlight in photosynthesis and fixes <b>100 rel. J</b> (GPP). It uses about half in its own respiration, lost as <span class='fc-heat'>heat</span>. The rest, about 50 (NPP), is stored as plant biomass: the food for every level above." },
    { arc:0, from:0, to:1, title:"Grass → Snail", pass:"Passed on 10 · lost 90",
      text:"About <b>10 rel. J</b> reaches the snail: 10% of the 100 fixed by the grass. The other 90 never reaches it: the grass's own respiration (<span class='fc-heat'>heat</span>), parts that are not eaten, and leaves that die and fall as litter for decomposers." },
    { arc:1, from:1, to:2, title:"Snail → Frog", pass:"Passed on 1 · lost 9",
      text:"The frog gets about <b>1 rel. J</b>. The snail spent most of its 10 staying alive (moving, breathing, keeping its cells working), and respiration released that energy as <span class='fc-heat'>heat</span>. Its slime trail and the food it could not digest (droppings) carried more energy away to decomposers. Only what it built into its own body can pass to the frog." },
    { arc:2, from:2, to:3, title:"Frog → Snake", pass:"Passed on 0.1 · lost 0.9",
      text:"Only <b>0.1 rel. J</b> reaches the snake. The same pattern repeats at every link: about 90% is lost, mostly as <span class='fc-heat'>heat</span> from respiration." },
    { arc:3, from:3, to:4, title:"Snake → Eagle", pass:"Passed on 0.01 · lost 0.09",
      text:"The eagle at the top receives about <b>0.01 rel. J</b>, one ten-thousandth of what the grass fixed. Nothing eats the eagle in this chain; when it dies, decomposers use what remains." },
    { title:"Why food chains are short", pass:"100 → 10 → 1 → 0.1 → 0.01",
      text:"Each link keeps only about 10%, so after four or five links too little energy is left to support another level. This is also why there are many snails and very few eagles: the energy pyramid." }
  ];
  var LAST_STEP = STEPS.length - 1;
  function stepNav(){
    return '<div class="fc-steps"><button type="button" class="fc-step-btn" data-go="-1" aria-label="Previous step"' + (step <= 0 ? ' disabled' : '') + '>‹</button>' +
      '<span class="fc-step-n">' + (step ? step + ' / ' + LAST_STEP : 'Overview') + '</span>' +
      '<button type="button" class="fc-step-btn" data-go="1" aria-label="Next step"' + (step >= LAST_STEP ? ' disabled' : '') + '>›</button></div>';
  }
  function bindStepNav(){
    infoEl.querySelectorAll("[data-go]").forEach(function(b){ b.addEventListener("click", function(){ goStep(step + (+b.getAttribute("data-go"))); }); });
    var start = document.getElementById("fcStartBtn"); if (start) start.addEventListener("click", function(){ goStep(1); });
    var back = document.getElementById("fcOverviewBtn"); if (back) back.addEventListener("click", function(){ goStep(0); });
  }
  function goStep(n){ step = Math.max(0, Math.min(LAST_STEP, n)); selected = null; ORGS.forEach(function(x){ x.tag.classList.remove("on"); }); showIntro(); }
  function focusOf(){ var S = STEPS[step]; return (S && S.arc !== undefined) ? S : null; }   // null: everything lit
  // Arrows stay hidden until asked for: a tapped organism shows the arrow into it and the arrow out of it;
  // a walkthrough step shows its own arrow; the summary step shows the whole chain.
  function arcShown(idx){
    if (selected){ var i = ORGS.indexOf(selected); return idx === i - 1 || idx === i; }
    if (step === LAST_STEP) return true;
    var F = focusOf(); return !!F && F.arc === idx;
  }

  function showIntro(){
    if (step > 0){
      var S = STEPS[step];
      infoEl.innerHTML = '<div class="fc-info-title"><span class="fc-chip fc-step-chip">Step ' + step + '</span>' + S.title + '</div>' +
        '<p>' + S.text + '</p><div class="fc-pass">' + S.pass + '</div>' + stepNav() +
        (step === LAST_STEP ? '<button type="button" class="fc-back" id="fcOverviewBtn">Back to overview</button>' : '');
      bindStepNav(); return;
    }
    infoEl.innerHTML = '<div class="fc-info-title">Energy flows one way</div>' +
      '<p>Energy passes from the food to the animal that eats it. Only about <b>10%</b> of the energy at one level reaches the next (Lindeman’s 10% law).</p>' +
      '<p>The other ~90% is used in respiration and lost as <span class="fc-heat">heat</span>, or passes to decomposers in waste and remains. That is why food chains rarely have more than four or five links.</p>' +
      '<p class="fc-dim">Tap an organism to see its arrows: one from its food, one to what eats it.</p>' +
      '<button type="button" class="fc-back fc-start" id="fcStartBtn">Walk through it step by step ›</button>';
    bindStepNav();
  }
  function select(o){
    selected = o;
    ORGS.forEach(function(x){ x.tag.classList.toggle("on", x === o); });
    var prev = ORGS[o.tl - 2];
    infoEl.innerHTML = '<div class="fc-info-title"><span class="fc-chip" style="--tl:' + hex(o.color) + '">TL' + o.tl + '</span>' + o.name + '</div>' +
      '<div class="fc-info-role">' + o.role + '</div>' +
      '<dl><dt>Food</dt><dd>' + o.food + '</dd><dt>Eaten by</dt><dd>' + o.eatenBy + '</dd>' +
      '<dt>Energy</dt><dd>' + (prev ? fmt(o.energy) + UNIT + ': about 10% of the ' + fmt(prev.energy) + UNIT + ' in the ' + prev.name.toLowerCase() + ' level below.'
                                     : fmt(o.energy) + UNIT + ' fixed by photosynthesis (GPP). About half is used in the grass’s own respiration; the rest (NPP) is stored as plant biomass, of which about 10 reaches herbivores.') + '</dd></dl>' +
      '<button type="button" class="fc-back" id="fcBackBtn">' + (step ? 'Back to step ' + step : 'Back to overview') + '</button>';
    document.getElementById("fcBackBtn").addEventListener("click", function(){ selected = null; ORGS.forEach(function(x){ x.tag.classList.remove("on"); }); showIntro(); });
  }

  // ---------------------------------------------------------------- scene
  function buildScene(){
    scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(BG, 0.012);
    camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    renderer = new THREE.WebGLRenderer({ antialias:true, alpha:false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(BG, 1);
    renderer.outputEncoding = THREE.sRGBEncoding;
    canvasHost.appendChild(renderer.domElement);
    clock = new THREE.Clock();
    world = new THREE.Group(); scene.add(world);

    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2018, 0.9));
    var key = new THREE.DirectionalLight(0xfff1dc, 1.25); key.position.set(-10, 14, 9); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9fc4ff, 0.55); rim.position.set(8, 6, -10); scene.add(rim);

    var glow = glowTex = glowTexture();
    // Sun beside the producer, clear of the info panel (placed by applyLayout)
    sunHolder = new THREE.Group(); world.add(sunHolder);   // a plain sphere until the Sun model arrives
    sunHolder.add(new THREE.Mesh(new THREE.SphereGeometry(0.75, 32, 16), new THREE.MeshBasicMaterial({ color:0xffd479 })));
    sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map:glow, color:0xffb84d, transparent:true, opacity:0.55, depthWrite:false, blending:THREE.AdditiveBlending }));
    sunHalo.scale.set(4.2, 4.2, 1); world.add(sunHalo);
    flow = new THREE.Group(); world.add(flow);   // arrows and energy pulses, rebuilt when the layout changes

    // Platforms: a chunk of land per organism (placeholder disc until the model arrives), with a soft glow
    // beneath in the trophic level's colour
    ORGS.forEach(function(o, i){
      var g = new THREE.Group(); g.position.set(o.x, o.y, 0); world.add(g); o.group = g;
      o.land = new THREE.Group(); o.land.rotation.y = i * 1.3; g.add(o.land);   // each chunk turned differently so they don't look stamped
      var soil = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.6, 0.4, 48), new THREE.MeshLambertMaterial({ color:0x3a2a20 }));
      soil.position.y = -0.2; o.land.add(soil);
      var floor = new THREE.Sprite(new THREE.SpriteMaterial({ map:glow, color:o.color, transparent:true, opacity:0.3, depthWrite:false, blending:THREE.AdditiveBlending }));
      floor.scale.set(4.4, 1.5, 1); floor.position.y = -0.55; g.add(floor); o.glow = floor;
      o.holder = new THREE.Group(); g.add(o.holder);
      o.anchor = new THREE.Vector3(o.x, o.y + (o.fly ? o.fly + 0.4 : 0.6), 0);   // where arrows attach
    });

    buildHeat(glow);
  }

  function applyLayout(name){   // move the plinths, the Sun and rebuild the arrows for this screen shape
    layout = LAYOUTS[name]; layoutName = name;
    ORGS.forEach(function(o, i){ var p = layout.pos(i); o.x = p[0]; o.y = p[1]; o.group.position.set(o.x, o.y, 0);
      o.anchor = new THREE.Vector3(o.x, o.y + (o.fly ? o.fly + 0.4 : 0.6), 0); });
    ORGS.sun = new THREE.Vector3().fromArray(layout.sun); sunHolder.position.copy(ORGS.sun); sunHalo.position.copy(ORGS.sun);
    while (flow.children.length){ var c = flow.children.pop(); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }
    pulses.length = 0; buildArrows(glowTex);
  }

  function buildArrows(glow){
    var L = layout.lift, world = flow; arcs.length = 0;
    function arc(a, b, lift, radius, nPulse, label, idx){
      var mat = new THREE.MeshBasicMaterial({ color:ENERGY_COLOR, transparent:true, opacity:0 }), rec = { idx:idx, mat:mat, label:label, glow:0, meshes:[] };
      var mid = a.clone().add(b).multiplyScalar(0.5); mid.x += L[0] * lift; mid.y += L[1] * lift; mid.z += L[2];
      var curve = new THREE.QuadraticBezierCurve3(a, mid, b);
      var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 48, radius, 10, false), mat); world.add(tube);
      var end = curve.getPoint(1), tan = curve.getTangent(1);
      var head = new THREE.Mesh(new THREE.ConeGeometry(radius * 3.2, radius * 8, 16), mat);
      head.position.copy(end).addScaledVector(tan, -radius * 4); head.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0), tan); world.add(head);
      rec.meshes.push(tube, head); tube.visible = head.visible = false;
      for (var k = 0; k < nPulse; k++){
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:glow, color:ENERGY_COLOR, transparent:true, opacity:0.95, depthWrite:false, blending:THREE.AdditiveBlending }));
        var s = radius * 9; sp.scale.set(s, s, 1); world.add(sp); pulses.push({ sprite:sp, curve:curve, t:k / nPulse, speed:0.32, arc:rec });
      }
      arcs.push(rec);
      if (label) label.pos = curve.getPoint(0.5).add(new THREE.Vector3(0, radius * 6 + 0.25, 0));
      return curve;
    }
    // sunlight into the producer (no 10% label: plants capture only a small share of sunlight)
    var sd = Math.sign(ORGS[0].x - ORGS.sun.x) || 1;
    var sunEnd = ORGS[0].anchor.clone().add(new THREE.Vector3(-0.35 * sd, 0.65, 0));
    var sunStart = ORGS.sun.clone().add(new THREE.Vector3(0.75 * sd, -0.35, 0.4));
    arc(sunStart, sunEnd, 0.45, 0.06, 4, null, -1);
    ORGS.sunTagPos = ORGS.sun.clone().add(new THREE.Vector3(0, -1.35, 0.6));
    // one arrow per link; thinner and fainter as less energy is passed on
    for (var i = 0; i < ORGS.length - 1; i++){
      var dir = Math.sign(ORGS[i+1].x - ORGS[i].x) || 1;
      var a = ORGS[i].anchor.clone().add(new THREE.Vector3(0.75 * dir, 0.15, 0.2));
      var b = ORGS[i+1].anchor.clone().add(new THREE.Vector3(-0.85 * dir, 0.15, 0.2));
      var r = 0.085 - i * 0.017;
      arc(a, b, 1, r, 5 - i, arrows[i].label, i);
    }
  }

  function buildHeat(glow){   // respiration: warm wisps rising from every organism and drifting away
    ORGS.forEach(function(o, i){
      for (var k = 0; k < 5; k++){
        var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:glow, color:HEAT_COLOR, transparent:true, opacity:0, depthWrite:false, blending:THREE.AdditiveBlending }));
        sp.scale.set(0.32, 0.32, 1); world.add(sp);
        heat.push({ sprite:sp, o:o, t:Math.random(), speed:0.28 + Math.random() * 0.12, dx:(Math.random() - 0.5) * 0.7, dz:(Math.random() - 0.5) * 0.5, ph:Math.random() * 6.28 });
      }
    });
  }

  function placeModel(o, gltf){
    var obj = gltf.scene;
    obj.traverse(function(n){
      if (!n.isMesh) return;
      n.frustumCulled = false;
      if (!n.geometry.getAttribute("normal")) n.geometry.computeVertexNormals();   // models with baked vertex colours carry no normals
      var mats = Array.isArray(n.material) ? n.material : [n.material];
      mats.forEach(function(m){ if (m.map) m.map.anisotropy = 4; });
    });
    obj.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    var k = o.size / Math.max(size.x, size.y, size.z);
    var pivot = new THREE.Group(); pivot.add(obj);
    var bones = new THREE.Box3(), bp = new THREE.Vector3();
    obj.traverse(function(n){ if (n.isBone){ n.getWorldPosition(bp); bones.expandByPoint(bp); } });
    if (o.posedBox){   // measure the skinned mesh as drawn (the snail)
      box.makeEmpty(); obj.traverse(function(m){ if (!m.isSkinnedMesh) return; m.skeleton.update(); var P = m.geometry.getAttribute("position");
        for (var i = 0; i < P.count; i += 3){ m.boneTransform(i, bp); bp.applyMatrix4(m.matrixWorld); box.expandByPoint(bp); } });
      box.getSize(size); box.getCenter(c); k = o.size / Math.max(size.x, size.y, size.z); pivot.scale.setScalar(k);
      obj.position.set(-c.x, -box.min.y, -c.z);
    } else if (!bones.isEmpty()){   // rigged (eagle, snake): the skeleton, not the raw mesh box, says where the animal is drawn
      var bc = bones.getCenter(new THREE.Vector3()); obj.position.set(-bc.x, o.fly ? -bc.y : -bones.min.y, -bc.z);
    } else obj.position.set(-c.x, -box.min.y - (o.sink || 0) * size.y, -c.z);   // centred, standing on the plinth (the grass mat sits a little into it, hiding its cut edge)
    pivot.scale.setScalar(k); pivot.rotation.y = o.yaw; o.k = k;
    if (o.fly) pivot.position.y = o.fly + 0.3;
    if (o.lift) o.holder.position.y = o.lift; if (o.dx) o.holder.position.x = o.dx;
    o.holder.add(pivot); o.pivot = pivot;
    if (o.tufts){   // the grass: a few tufts spread over the plinth instead of one clump
      o.tufts.forEach(function(t, i){
        var p = i ? pivot.clone() : pivot;
        p.position.set(t[0], 0, t[1]); p.scale.setScalar(k * t[2]); p.rotation.y = t[3];
        if (i) o.holder.add(p);
      });
      o.k = k; pivot.userData.tuft = true;
    }
    if (gltf.animations && gltf.animations.length){
      var clip = gltf.animations[0];   // the snake loops only its calm rear-and-sway stretch (same as the pyramid)
      if (o.clip && THREE.AnimationUtils.subclip) clip = THREE.AnimationUtils.subclip(clip, "calm", Math.round(o.clip[0] * 30), Math.round(o.clip[1] * 30), 30);
      var mixer = new THREE.AnimationMixer(obj); var act = mixer.clipAction(clip); act.timeScale = o.clip ? 1 : 0.75; act.play(); mixers.push(mixer);
    }
  }

  // "Chunk Of Land 1": baked so the middle of its flat top is at the origin and its width is 1
  var LAND_W = 3.2;
  function placeLand(gltf){
    gltf.scene.traverse(function(n){ if (n.isMesh){ n.frustumCulled = false; var m = n.material; if (m.map) m.map.anisotropy = 4; } });
    ORGS.forEach(function(o){
      while (o.land.children.length){ var c = o.land.children.pop(); if (c.geometry) c.geometry.dispose(); }
      var chunk = gltf.scene.clone(); chunk.scale.setScalar(LAND_W); o.land.add(chunk);   // clones share the geometry and textures
    });
  }

  function placeSun(gltf){   // "Sun" model: a glowing core inside a translucent shell, turning slowly
    var obj = gltf.scene; obj.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    var pivot = new THREE.Group(); pivot.add(obj); obj.position.set(-c.x, -c.y, -c.z); pivot.scale.setScalar(1.7 / Math.max(size.x, size.y, size.z));
    obj.traverse(function(n){ if (n.isMesh){ n.frustumCulled = false; n.renderOrder = 2; } });
    while (sunHolder.children.length) sunHolder.remove(sunHolder.children[0]);
    sunHolder.add(pivot);
    if (gltf.animations && gltf.animations.length){ var mixer = new THREE.AnimationMixer(obj); mixer.clipAction(gltf.animations[0]).play(); mixers.push(mixer); }
  }

  // ---------------------------------------------------------------- camera & input
  function resize(){
    if (!renderer) return;
    var w = view.clientWidth || window.innerWidth, h = view.clientHeight || window.innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h;
    var want = (w / h < 0.9) ? "tall" : "wide"; if (want !== layoutName) applyLayout(want);
    var halfW = layout.halfW, halfH = layout.halfH;                   // the whole chain plus the Sun and the labels
    // in the tall layout, fit the chain between the header and the info panel docked at the bottom
    var top = 0, bottom = 0;
    if (layoutName === "tall"){
      var hdr = document.querySelector("#ui .header"); if (hdr) top = Math.max(0, hdr.getBoundingClientRect().bottom);
      var pr = infoEl.parentNode.getBoundingClientRect(); if (pr.height && pr.top > h * 0.4) bottom = h - pr.top;
    }
    var avail = Math.max(h * 0.4, h - top - bottom - 12);
    var vf = camera.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    fitDist = Math.max(halfW / Math.tan(hf / 2), halfH / Math.tan(vf / 2) * h / avail) * 1.05;
    if (top || bottom) camera.setViewOffset(w, h, 0, (bottom - top) / 2, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function resetView(){ yaw = 0; pitch = 0.32; zoom = 1; }
  function bindInput(){
    var el = renderer.domElement, ptrs = new Map(), lastDist = 0, moved = 0, downAt = null;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", function(e){ el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY }); moved = 0; downAt = { x:e.clientX, y:e.clientY };
      if (ptrs.size === 2){ var p = Array.from(ptrs.values()); lastDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); } });
    el.addEventListener("pointermove", function(e){
      if (!ptrs.has(e.pointerId)) return; var prev = ptrs.get(e.pointerId), dx = e.clientX - prev.x, dy = e.clientY - prev.y; ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if (ptrs.size === 1){ yaw = Math.max(-0.75, Math.min(0.75, yaw - dx * 0.005)); pitch = Math.max(0.02, Math.min(0.9, pitch + dy * 0.004)); moved += Math.abs(dx) + Math.abs(dy); }
      else if (ptrs.size === 2){ var p = Array.from(ptrs.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); if (lastDist) zoom = Math.max(0.55, Math.min(1.6, zoom * lastDist / d)); lastDist = d; moved += 10; }
    });
    function up(e){ if (ptrs.has(e.pointerId)){ ptrs.delete(e.pointerId); if (ptrs.size < 2) lastDist = 0; if (moved < 8 && downAt) pick(e.clientX, e.clientY); } }
    el.addEventListener("pointerup", up); el.addEventListener("pointercancel", function(e){ ptrs.delete(e.pointerId); });
    el.addEventListener("wheel", function(e){ e.preventDefault(); zoom = Math.max(0.55, Math.min(1.6, zoom * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive:false });
  }
  function pick(cx, cy){   // nearest organism on screen to the tap
    var rect = renderer.domElement.getBoundingClientRect(), best = null, bestD = 1e9, v = new THREE.Vector3();
    ORGS.forEach(function(o){ v.set(o.x, o.y + (o.fly ? o.fly + 0.5 : 0.6), 0); world.localToWorld(v); v.project(camera);
      var sx = rect.left + (v.x + 1) / 2 * rect.width, sy = rect.top + (1 - v.y) / 2 * rect.height, d = Math.hypot(sx - cx, sy - cy);
      if (d < bestD){ bestD = d; best = o; } });
    if (best && bestD < rect.width * 0.09) select(best);
    else if (selected){ selected = null; ORGS.forEach(function(x){ x.tag.classList.remove("on"); }); showIntro(); }   // tap empty space: arrows go away
  }

  // ---------------------------------------------------------------- loop
  var tmp = new THREE.Vector3();
  function project(p, el, dy){
    tmp.copy(p); world.localToWorld(tmp); tmp.project(camera);
    var w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    var hidden = tmp.z > 1;
    el.style.transform = "translate(" + ((tmp.x + 1) / 2 * w).toFixed(1) + "px," + ((1 - tmp.y) / 2 * h + (dy || 0)).toFixed(1) + "px) translate(-50%,0)";
    el.style.visibility = hidden ? "hidden" : "visible";
  }
  function frame(){
    if (!active) return; raf = requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    world.rotation.y += (yaw - world.rotation.y) * 0.12;
    var d = fitDist * zoom, ph = pitch;
    var cy = layout.cy; camera.position.set(0, cy + Math.sin(ph) * d, Math.cos(ph) * d); camera.lookAt(0, cy, 0);

    mixers.forEach(function(m){ m.update(dt); });
    ORGS.forEach(function(o){
      var on = selected === o, s = on ? 1.08 : 1;
      if (o.pivot){
        var cur = o.pivot.scale.x; if (!o.tufts){ cur += (o.k * s - cur) * 0.15; o.pivot.scale.setScalar(cur); }   // selected one grows a little
        if (o.id === "frog") o.pivot.scale.y = cur * (1 + Math.sin(t * 3.1) * 0.015);                       // breathing
        if (o.fly) o.pivot.position.y = o.fly + 0.3 + Math.sin(t * 1.4) * 0.12;
      }
      o.glow.material.opacity = on ? 0.5 + Math.sin(t * 4) * 0.1 : 0.3;   // the selected one's glow pulses
    });
    var F = focusOf();
    arcs.forEach(function(a){
      var lit = arcShown(a.idx); a.glow += ((lit ? 1 : 0) - a.glow) * 0.12;
      a.mat.opacity = 0.85 * a.glow; a.meshes.forEach(function(m){ m.visible = a.glow > 0.01; });
      if (a.label) a.label.classList.toggle("off", !lit);
    });
    if (ORGS.sunTag) ORGS.sunTag.classList.toggle("dim", !!F && F.arc !== -1);
    ORGS.forEach(function(o, i){ o.tag.classList.toggle("dim", !!F && i !== F.from && i !== F.to); });
    pulses.forEach(function(p){ p.t = (p.t + dt * p.speed) % 1; p.sprite.position.copy(p.curve.getPoint(p.t)); p.sprite.material.opacity = Math.sin(p.t * Math.PI) * 0.95 * (p.arc.glow > 0.5 ? p.arc.glow : 0); });
    heat.forEach(function(h){
      h.t += dt * h.speed; if (h.t > 1){ h.t = 0; h.dx = (Math.random() - 0.5) * 0.7; h.dz = (Math.random() - 0.5) * 0.5; }
      var o = h.o, base = o.y + (o.fly ? o.fly + 0.2 : 0.5);   // a thin warm column rising off each organism
      h.sprite.position.set(o.x + h.dx + Math.sin(t * 2 + h.ph) * 0.12 * h.t, base + h.t * 1.7, h.dz);
      var idx = ORGS.indexOf(o), hf = !F ? 1 : idx === F.from ? 1.7 : idx === F.to ? 0.9 : 0.15;   // the organism passing energy on shows its heat loss most
      h.sprite.material.opacity = Math.min(0.9, Math.sin(h.t * Math.PI) * 0.55 * hf); var s = 0.14 + h.t * 0.22; h.sprite.scale.set(s, s, 1);
    });

    renderer.render(scene, camera);
    ORGS.forEach(function(o){ project(new THREE.Vector3(o.x, o.y - 0.45, 1.5), o.tag, 6); });
    arrows.forEach(function(a){ if (a.label.pos) project(a.label.pos, a.label, -12); });
    if (ORGS.sunTagPos) project(ORGS.sunTagPos, ORGS.sunTag, -10);
  }

  // ---------------------------------------------------------------- build & toggle
  function build(){
    if (ready || building) return Promise.resolve(); building = true;
    buildDom(); statusEl.textContent = "Loading 3D organisms…"; statusEl.hidden = false;
    var loaderReady = Promise.all([ THREE.GLTFLoader ? null : loadScript(LOADER_URL), window.MeshoptDecoder ? null : loadScript(MESHOPT_URL) ]);
    return loaderReady.then(function(){
      buildScene(); resize(); bindInput();
      var jobs = ORGS.filter(function(o){ return o.file; }).map(function(o){
        return loadGLB(o.file).then(function(g){ placeModel(o, g); })
          .catch(function(e){ console.warn("Food chain model unavailable:", o.file, e); o.missing = true; });
      });
      jobs.push(loadGLB("sun.glb").then(placeSun).catch(function(e){ console.warn("Sun model unavailable, keeping the plain sphere:", e); }));
      jobs.push(loadGLB("../Platform/land.glb").then(placeLand).catch(function(e){ console.warn("Land platform unavailable, keeping the plain discs:", e); }));
      return Promise.all(jobs);
    }).then(function(){
      var miss = ORGS.filter(function(o){ return o.missing; }).map(function(o){ return o.name; });
      statusEl.hidden = !miss.length; if (miss.length) statusEl.textContent = "Could not load: " + miss.join(", ");
      ready = true; building = false;
    }).catch(function(e){
      building = false; statusEl.hidden = false; statusEl.textContent = "The 3D view could not start (" + e.message + ").";
      console.warn(e);
    });
  }

  function setView(mode){
    var chain = mode === "chain";
    document.body.classList.toggle("view-chain", chain);
    document.querySelectorAll("[data-view]").forEach(function(b){ var on = b.getAttribute("data-view") === mode; b.classList.toggle("active", on); b.setAttribute("aria-pressed", on ? "true" : "false"); });
    var sub = document.querySelector(".header .subtitle");
    if (sub){ if (!sub.dataset.pyramid) sub.dataset.pyramid = sub.textContent; sub.textContent = chain ? "Food chain · energy flow between trophic levels" : sub.dataset.pyramid; }
    var v = document.getElementById("foodChainView"); v.hidden = !chain;
    active = chain; cancelAnimationFrame(raf);
    if (chain){
      build().then(function(){ if (!active || !renderer) return; resize(); clock.getDelta(); frame(); });
    }
  }

  window.addEventListener("resize", function(){ if (active) resize(); });
  document.addEventListener("DOMContentLoaded", init); if (document.readyState !== "loading") init();
  var inited = false;
  function init(){
    if (inited) return; inited = true;
    document.querySelectorAll("[data-view]").forEach(function(b){ b.addEventListener("click", function(){ setView(b.getAttribute("data-view")); }); });
  }
  window.HeliosFoodChain = { show:function(){ setView("chain"); }, hide:function(){ setView("pyramid"); }, orgs:ORGS };
})();
