/* =========================================================================
   Oekos Matrix — Food web view
   The pyramid's organisms linked by who eats whom. Arrows point from the
   food to the feeder (the direction energy flows). They stay hidden until an
   organism is tapped (its links only) or "Show the food chain" is pressed.
   Each organism stands on a chunk of land.
   Same approach as foodchain.js: its own scene, renderer and loop, which
   run only while this view is shown. Models are shared with the other views.
   ========================================================================= */
(function(){
  "use strict";

  var BASE = "Solus-Assets/", FALLBACK = "https://raw.githubusercontent.com/Dray-Ashcroft/Helios-Trophicus/main/Solus-Assets/";
  var JS = "https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/";
  var ENERGY = 0xc6ea5a, BG = 0x05070d, D2R = Math.PI / 180;
  var TL_COLOR = { 1:0x4ade80, 2:0xfacc15, 3:0xfb923c, 4:0xf87171 };
  var TL_ROLE = { 1:"Producer", 2:"Primary consumer", 3:"Secondary consumer", 4:"Tertiary consumer" };

  // rows climb by trophic level; producers ordered lungwort, grass, tree so each sits nearest the animals that eat it
  // (lungwort under the snail and butterfly, grass in the middle for the snail, mouse and deer, tree beside the deer)
  // facing = the model's own forward axis, turned to face the viewer
  var NODES = [
    { id:"grass",       name:"Grass",       tl:1, x: 0.0, file:"FoodWeb/grass.glb",        size:1.8, facing:"z", ys:1.8 },   // a wide, low patch of thin blades: drawn taller so it reads at this scale
    { id:"tree",        name:"Tree",        tl:1, x: 4.6, file:"FoodWeb/tree.glb",         size:2.3, facing:"z" },
    { id:"lupine",      name:"Lungwort",    tl:1, x:-4.6, file:"FoodWeb/lungwort.glb",     size:1.5, facing:"z",
      note:"A spring wildflower: its flowers open pink and turn blue as they age, and their nectar feeds early bees and butterflies." },
    { id:"grasshopper", name:"Snail",       tl:2, x:-6.3, file:"FoodChain/snail.glb",       size:1.2, facing:"z", turn:40, posedBox:true, back:0.3,
      note:"A grazer: it rasps leaves with its radula, a tongue covered in tiny teeth, and glides on a film of mucus." },
    { id:"caterpillar", name:"Butterfly", tl:2, x: 2.1, file:"Pyramid/butterfly.glb",  size:1.35, facing:"z", turn:30, posedBox:true, fly:0.45,
      note:"Adults sip nectar from flowers such as the lungwort; as caterpillars they ate leaves. Its orange-and-black wings are like those of the monarch and India's tiger butterflies (genus Danaus). Nothing in this web eats it, but in nature birds, lizards, frogs and spiders do; its bright colours warn that it tastes bad." },
    { id:"squirrel",    name:"Mouse",       tl:2, x:-2.1, file:"Pyramid/mouse.glb",        size:1.95, facing:"z", turn:-20, posedBox:true,
      note:"A sand mouse: a small rodent that eats seeds and grain and digs burrows. Its gnawing incisors never stop growing." },
    { id:"deer",        name:"Deer",        tl:2, x: 6.3, file:"FoodWeb/deer.glb",         size:1.8, facing:"x", turn:25,
      note:"In Indian forests deer such as chital and sambar are a main prey of leopards and tigers." },
    { id:"fox",         name:"Fox",         tl:3, x:-6.3, file:"FoodWeb/fox.glb",          size:2.8, facing:"z", turn:20, posedBox:true, once:true,   // wakes up once, then stands
      note:"A red fox: an omnivore that hunts mice and also eats snails, insects and fruit. Eagles such as the golden eagle take foxes, especially young ones." },
    { id:"snake",       name:"Snake",       tl:3, x:-2.1, file:"Pyramid/snake.glb",        size:1.6, facing:"z", turn:-20, clip:[3, 9],
      note:"Here it eats mice (TL2), so it is a secondary consumer (TL3). Snakes that also eat frogs or lizards feed at TL4 too." },
    { id:"leopard",     name:"Tiger",       tl:3, x: 2.1, file:"Pyramid/tiger.glb",        size:1.9, facing:"z", turn:-70, posedBox:true,
      apex:true, note:"A big cat of India's forests; deer such as chital and sambar are its main prey, and nothing hunts an adult tiger. This one is a white tiger, a rare colour form of the Bengal tiger." },
    { id:"komodo",      name:"Komodo dragon", tl:3, x: 6.3, file:"FoodWeb/komodo.glb",     size:3.2, facing:"z", turn:-60,
      apex:true, note:"The largest living lizard and an apex predator: it hunts deer, and nothing preys on an adult. It lives wild only on a few Indonesian islands." },
    { id:"owl",         name:"Owl",         tl:4, x: 4.2, file:"Pyramid/owl.glb",          size:2.2, facing:"z", turn:20, fly:0.95, posedBox:true,
      note:"A great horned owl. It hunts mice (TL2) at night and also takes snakes (TL3), so it feeds at two trophic levels: TL3 when it eats a mouse, TL4 when it eats a snake. Owls this size even kill hawks, and little hunts an adult. India's eagle-owl looks much like it." },
    { id:"eagle",       name:"Eagle",       tl:4, x:-2.1, file:"FoodChain/eagle.glb",      size:1.9, facing:"x", turn:-20, fly:1.35,
      note:"It takes snakes and foxes, both secondary consumers (TL3), so here the eagle is a tertiary consumer (TL4)." }   // high enough that the lowered wings clear the rock
  ];
  // food -> feeder (energy flows this way)
  var LINKS = [
    ["grass","grasshopper"], ["lupine","grasshopper"], ["grass","deer"], ["tree","deer"], ["grass","squirrel"], ["lupine","caterpillar"],
    ["grasshopper","fox"], ["squirrel","fox"], ["squirrel","snake"], ["squirrel","owl"],
    ["snake","eagle"], ["fox","eagle"], ["snake","owl"], ["deer","leopard"], ["deer","komodo"]
  ];
  var CHAIN = ["grass","squirrel","fox","eagle"];   // one food chain inside this web: grass -> mouse -> fox -> eagle
  // wide screens: rows 3.0 apart at full width; tall (phone) screens: rows pulled in and spread taller
  var LAYOUTS = { wide:{ sx:1, row:3.0, halfW:10.8, halfH:6.1, cy:4.7, sun:[-8.6, 0.55, -0.4] },
                  tall:{ sx:0.6, row:3.6, halfW:6.4, halfH:7.4, cy:5.6, sun:[-5.2, -1.0, 0.6] } };
  var layout = LAYOUTS.wide, layoutName = "", flow, glowTex, sunMesh, sunHalo, rowTags = [];
  var byId = {}; NODES.forEach(function(n){ byId[n.id] = n; n.bx = n.x; });

  var ready = false, building = false, active = false, raf = 0, inited = false;
  var view, labelsHost, infoEl, statusEl, scene, camera, renderer, world, clock, sunPos;
  var mixers = [], pulses = [], links = [], yaw = 0, pitch = 0.14, zoom = 1, fitDist = 20, selected = null, showChain = false;

  // ---------------------------------------------------------------- helpers
  function glowTexture(){
    var c = document.createElement("canvas"); c.width = c.height = 64; var g = c.getContext("2d");
    var r = g.createRadialGradient(32,32,0,32,32,32); r.addColorStop(0,"rgba(255,255,255,1)"); r.addColorStop(0.35,"rgba(255,255,255,0.55)"); r.addColorStop(1,"rgba(255,255,255,0)");
    g.fillStyle = r; g.fillRect(0,0,64,64); return new THREE.CanvasTexture(c);
  }
  function hex(c){ return "#" + ("000000" + c.toString(16)).slice(-6); }
  function addScript(src){ return new Promise(function(res, rej){ var s = document.createElement("script"); s.src = src; s.onload = res; s.onerror = function(){ rej(new Error("Could not load " + src)); }; document.head.appendChild(s); }); }
  function loadGLB(file){
    var loader = new THREE.GLTFLoader(); if (window.MeshoptDecoder) loader.setMeshoptDecoder(window.MeshoptDecoder);
    function get(u){ return new Promise(function(res, rej){ loader.load(u, res, undefined, rej); }); }
    return get(BASE + file).catch(function(){ return get(FALLBACK + file); });
  }
  function eats(id){ return LINKS.filter(function(l){ return l[1] === id; }).map(function(l){ return byId[l[0]].name.toLowerCase(); }); }
  function eatenBy(id){ return LINKS.filter(function(l){ return l[0] === id; }).map(function(l){ return byId[l[1]].name.toLowerCase(); }); }
  function list(a){ return a.length > 1 ? a.slice(0, -1).join(", ") + " and " + a[a.length - 1] : (a[0] || ""); }

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
    view = document.getElementById("foodWebView");
    labelsHost = view.querySelector(".fc-labels"); infoEl = document.getElementById("fwInfo"); bindFold(infoEl.parentNode, "oekos-fold-web"); statusEl = view.querySelector(".fc-status");
    NODES.forEach(function(n){
      var el = document.createElement("button"); el.type = "button"; el.className = "fc-tag fw-tag"; el.style.setProperty("--tl", hex(TL_COLOR[n.tl]));
      el.innerHTML = '<span class="fc-tl">TL' + n.tl + '</span><span class="fc-name">' + n.name + '</span>';
      el.addEventListener("click", function(){ select(n); }); labelsHost.appendChild(el); n.tag = el;
    });
    rowTags = [1, 2, 3, 4].map(function(tl){   // on phones each row shows its level once, at the side
      var r = document.createElement("div"); r.className = "fw-row"; r.style.color = hex(TL_COLOR[tl]); r.textContent = "TL" + tl; labelsHost.appendChild(r); return r;
    });
    document.getElementById("fwResetBtn").addEventListener("click", function(){ yaw = 0; pitch = 0.14; zoom = 1; });
    showIntro();
  }
  function showIntro(){
    infoEl.innerHTML = '<div class="fc-info-title">A food web</div>' +
      '<p>Many food chains linked together. Most animals eat more than one kind of food, and many are eaten by more than one predator.</p>' +
      '<p class="fc-dim">Tap an organism to see its arrows: from what it eats, to what eats it.</p>' +
      '<button type="button" class="fc-back fc-start" id="fwChainBtn">' + (showChain ? 'Show the whole web' : 'Show the food chain inside the web') + '</button>';
    document.getElementById("fwChainBtn").addEventListener("click", function(){ showChain = !showChain; selected = null; showIntro(); });
    if (showChain) infoEl.insertAdjacentHTML("beforeend", '<p class="fc-pass">Grass → mouse → fox → eagle: one food chain inside this web. Every path from a producer to a top predator is a food chain; the Food chain view follows another one, with a snail and a frog. Most animals belong to several chains at once.</p>');
    NODES.forEach(function(x){ x.tag.classList.remove("on"); });
  }
  function select(n){
    selected = n; showChain = false;
    NODES.forEach(function(x){ x.tag.classList.toggle("on", x === n); });
    var food = eats(n.id), pred = eatenBy(n.id);
    infoEl.innerHTML = '<div class="fc-info-title"><span class="fc-chip" style="--tl:' + hex(TL_COLOR[n.tl]) + '">TL' + n.tl + '</span>' + n.name + '</div>' +
      '<div class="fc-info-role">' + TL_ROLE[n.tl] + '</div>' +
      '<dl><dt>Eats</dt><dd>' + (food.length ? list(food) : 'Nothing: makes its own food by photosynthesis') + '</dd>' +
      '<dt>Eaten by</dt><dd>' + (pred.length ? list(pred) : (n.tl === 4 || n.apex ? 'Nothing: it is an apex (top) predator' : 'None shown')) + '</dd></dl>' +
      (n.note ? '<p>' + n.note + '</p>' : '') +
      '<button type="button" class="fc-back" id="fwBackBtn">Back to the whole web</button>';
    document.getElementById("fwBackBtn").addEventListener("click", function(){ selected = null; showIntro(); });
  }

  // ---------------------------------------------------------------- scene
  function buildScene(){
    scene = new THREE.Scene(); scene.fog = new THREE.FogExp2(BG, 0.01);
    camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
    renderer = new THREE.WebGLRenderer({ antialias:true }); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(BG, 1); renderer.outputEncoding = THREE.sRGBEncoding;
    view.querySelector(".fc-canvas").appendChild(renderer.domElement);
    clock = new THREE.Clock(); world = new THREE.Group(); scene.add(world);
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x2a2018, 0.95));
    var key = new THREE.DirectionalLight(0xfff1dc, 1.2); key.position.set(-10, 14, 9); scene.add(key);
    var rim = new THREE.DirectionalLight(0x9fc4ff, 0.5); rim.position.set(8, 6, -10); scene.add(rim);
    var glow = glowTexture();

    // a chunk of land per organism (plain disc until the model arrives), glowing beneath in its trophic-level colour
    NODES.forEach(function(n, i){
      var g = new THREE.Group(); world.add(g); n.group = g;
      n.land = new THREE.Group(); n.land.rotation.y = i * 1.3; g.add(n.land);   // each chunk turned differently so they don't look stamped
      var soil = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.28, 40), new THREE.MeshLambertMaterial({ color:0x3a2a20 })); soil.position.y = -0.14; n.land.add(soil);
      n.glow = new THREE.Sprite(new THREE.SpriteMaterial({ map:glow, color:TL_COLOR[n.tl], transparent:true, opacity:0.3, depthWrite:false, blending:THREE.AdditiveBlending }));
      n.glow.scale.set(3.0, 1.0, 1); n.glow.position.y = -0.38; g.add(n.glow);
      n.holder = new THREE.Group(); g.add(n.holder);
      n.lit = 1;
    });
    // the Sun feeds every producer; it sits level with the producer row so its arrows stay below the TL2 labels
    glowTex = glow;
    sunMesh = new THREE.Group(); world.add(sunMesh);   // the food chain's Sun model goes in here once loaded
    sunMesh.add(new THREE.Mesh(new THREE.SphereGeometry(0.6, 28, 16), new THREE.MeshBasicMaterial({ color:0xffd479 })));
    sunHalo = new THREE.Sprite(new THREE.SpriteMaterial({ map:glow, color:0xffb84d, transparent:true, opacity:0.5, depthWrite:false, blending:THREE.AdditiveBlending })); sunHalo.scale.set(3.2, 3.2, 1); world.add(sunHalo);
    flow = new THREE.Group(); world.add(flow);
  }
  function applyLayout(name){   // place the rows for this screen shape and rebuild every arrow
    layout = LAYOUTS[name]; layoutName = name; view.classList.toggle("fw-tall", name === "tall");
    NODES.forEach(function(n){ n.x = n.bx * layout.sx; n.y = (n.tl - 1) * layout.row; n.group.position.set(n.x, n.y, 0);
      n.anchor = new THREE.Vector3(n.x, n.y + (n.fly ? n.fly + 0.2 : 0.5), 0); });
    sunPos = new THREE.Vector3().fromArray(layout.sun); sunMesh.position.copy(sunPos); sunHalo.position.copy(sunPos);
    while (flow.children.length){ var c = flow.children.pop(); if (c.geometry) c.geometry.dispose(); if (c.material) c.material.dispose(); }
    pulses.length = 0; links.length = 0;
    var glow = glowTex;
    ORGS_SUN_LINKS(glow);
    // Every link runs rock to rock: it leaves the side of the food's rock that faces the feeder and its head points
    // into the side of the feeder's rock. Both ends sit just outside the rocks, beside the name labels (which hang
    // below each rock), so no line passes through an animal or a label. A same-row link (if any) is a low arc
    // over the gap between the two rocks.
    var EDGE = 1.12, PORT_GAP = 0.3;
    // 1) route: which side of each rock a link uses, and where it heads beyond the rock
    var routes = LINKS.map(function(l){
      var a = byId[l[0]], b = byId[l[1]], side = Math.sign(b.x - a.x) || 1, r = { a:a, b:b };
      if (b.tl - a.tl >= 2){   // skips a row (mouse -> owl): curve through the nearest gap in the row between
        var mids = NODES.filter(function(n){ return n.tl === a.tl + 1; }).map(function(n){ return n.x; }).sort(function(u, v){ return u - v; });
        var gapX = 0, best = 1e9;   // nearest gap to the food that is not directly under the feeder (its label hangs there)
        for (var g = 0; g < mids.length - 1; g++){ var gx = (mids[g] + mids[g + 1]) / 2; var sc = Math.abs(gx - a.x) + 0.01 * Math.abs(gx - b.x); if (Math.abs(gx - b.x) > EDGE && sc < best){ best = sc; gapX = gx; } }   // ties go to the gap nearer the feeder
        r.gapX = gapX; r.sa = Math.sign(gapX - a.x) || 1; r.sb = Math.sign(gapX - b.x) || 1;
        r.aimA = { x:gapX, y:a.y + layout.row }; r.aimB = { x:gapX, y:b.y - layout.row };
      } else {   // next row up: each end on the side facing the other rock (same column: both on the same side)
        r.sa = side; r.sb = (a.x === b.x) ? side : -side; r.aimA = b; r.aimB = a;
      }
      return r;
    });
    // 2) ports: links sharing one side of a rock each get their own point, stacked in the order their partners lie
    // (highest partner on top), so they fan out around the rock instead of meeting at one spot and never cross
    var ports = {};
    routes.forEach(function(r){
      [["p0", r.a, r.sa, r.aimA], ["p2", r.b, r.sb, r.aimB]].forEach(function(e){
        var k = e[1].id + (e[2] > 0 ? ">" : "<");
        (ports[k] = ports[k] || []).push({ r:r, key:e[0], n:e[1], s:e[2], ang:Math.atan2(e[3].y - e[1].y, Math.abs(e[3].x - e[1].x) + 1e-3) });
      });
    });
    Object.keys(ports).forEach(function(k){
      var P = ports[k]; P.sort(function(u, v){ return v.ang - u.ang; });
      P.forEach(function(p, i){
        var off = ((P.length - 1) / 2 - i) * PORT_GAP;   // round the rim of the rock, as on an ellipse
        p.r[p.key] = new THREE.Vector3(p.n.x + p.s * EDGE * Math.sqrt(Math.max(0.6, 1 - off * off / 0.8)), p.n.y + 0.1 + off, 0.35);
      });
    });
    // 3) draw
    routes.forEach(function(r){
      var a = r.a, b = r.b, p0 = r.p0, p2 = r.p2;
      if (r.gapX !== undefined){
        var q1 = new THREE.Vector3((r.gapX - 0.36 * p0.x - 0.16 * p2.x) / 0.48, b.y - 1.5, 0.35);   // puts the curve through the gap
        addArrow(new THREE.QuadraticBezierCurve3(p0, q1, p2), { from:a, to:b }, glow, 0.022);
      } else if (Math.abs(p2.x - p0.x) < 1.4){   // nearly vertical: bow gently outward, away from the labels hanging below the rocks
        var c = p0.clone().add(p2).multiplyScalar(0.5); c.x += (Math.sign(p2.x - b.x) || 1) * 0.7;
        addArrow(new THREE.QuadraticBezierCurve3(p0, c, p2), { from:a, to:b }, glow, 0.022);
      } else addArrow(new THREE.LineCurve3(p0, p2), { from:a, to:b }, glow, 0.022);
    });
  }
  function ORGS_SUN_LINKS(glow){
    NODES.filter(function(n){ return n.tl === 1; }).forEach(function(n){   // thin sunbeams onto each producer's rock
      var p1 = new THREE.Vector3(n.x - EDGE_SUN, n.y + 0.15, 0.35), p0 = sunPos.clone(); p0.addScaledVector(p1.clone().sub(p0).normalize(), 0.85);
      addArrow(new THREE.LineCurve3(p0, p1), { from:null, to:n, sun:true }, glow, 0.016);
    });
  }
  var EDGE_SUN = 1.1;
  // One clean arrow: a thin shaft that ends exactly where a sharp head begins (no overlap, so the head never looks
  // hollow), with small energy dots running along it while the link is shown.
  function addArrow(curve, meta, glow, r){
    var nPulse = meta.sun ? 1 : 2;
    var mat = new THREE.MeshBasicMaterial({ color:meta.sun ? 0xffd479 : ENERGY, transparent:true, opacity:0, depthWrite:false });
    var len = curve.getLength(), headLen = Math.max(r * 8, 0.2), headR = Math.max(r * 3.2, 0.07), uBase = 1 - headLen / len;
    var shaft = new THREE.Curve(); shaft.getPoint = function(t, out){ var p = curve.getPointAt(t * uBase); return out ? out.copy(p) : p; };
    var tube = new THREE.Mesh(new THREE.TubeGeometry(shaft, curve.isLineCurve3 ? 2 : 32, r, 8, false), mat);
    var base = curve.getPointAt(uBase), tip = curve.getPointAt(1), dir = tip.clone().sub(base).normalize();
    var head = new THREE.Mesh(new THREE.ConeGeometry(headR, headLen, 20), mat);
    head.position.copy(base).addScaledVector(dir, headLen / 2); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    var rec = { meta:meta, mat:mat, glow:0, meshes:[tube, head] };
    [tube, head].forEach(function(m){ m.visible = false; flow.add(m); });
    for (var k = 0; k < nPulse; k++){
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:glow, color:meta.sun ? 0xfff0c0 : 0xf4ffd0, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
      sp.scale.set(0.15, 0.15, 1); flow.add(sp); pulses.push({ sprite:sp, curve:shaft, t:k / nPulse, rec:rec });
    }
    links.push(rec);
  }

  function placeModel(n, gltf){
    var obj = gltf.scene; obj.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    var bones = new THREE.Box3(), bp = new THREE.Vector3();
    obj.traverse(function(o){ if (o.isBone){ o.getWorldPosition(bp); bones.expandByPoint(bp); } });
    var morphBox = new THREE.Box3();   // morph-animated models (the food web deer): measure the shapes the animation shows, not the base mesh
    obj.traverse(function(o){
      if (!o.isMesh || !o.geometry.morphAttributes.position) return;
      var base = o.geometry.getAttribute("position"), M = o.geometry.morphAttributes.position, rel = o.geometry.morphTargetsRelative, v = new THREE.Vector3();
      function k(a){ if (!a.normalized) return 1; var A = a.array; return A instanceof Int16Array ? 1 / 32767 : A instanceof Int8Array ? 1 / 127 : A instanceof Uint16Array ? 1 / 65535 : A instanceof Uint8Array ? 1 / 255 : 1; }   // r128 does not unpack compressed values
      var kb = k(base);
      for (var t = 0; t < M.length; t += 3){ var km = k(M[t]); for (var i = 0; i < base.count; i += 7){
        v.set(M[t].getX(i) * km, M[t].getY(i) * km, M[t].getZ(i) * km); if (rel) v.add(new THREE.Vector3(base.getX(i) * kb, base.getY(i) * kb, base.getZ(i) * kb));
        v.applyMatrix4(o.matrixWorld); morphBox.expandByPoint(v);
      } }
    });
    if (!morphBox.isEmpty()){ box.copy(morphBox); box.getSize(size); box.getCenter(c); }
    if (n.posedBox){   // measure as the skeleton draws it, across the whole animation (lizard, running beetle)
      box.makeEmpty();
      var clip0 = gltf.animations && gltf.animations[0];
      if (clip0 && n.clipName) gltf.animations.forEach(function(a){ if (a.name.toLowerCase().indexOf(n.clipName) !== -1) clip0 = a; });
      var tm = clip0 ? new THREE.AnimationMixer(obj) : null; if (tm) tm.clipAction(clip0).play();
      for (var f = 0; f < (tm ? 8 : 1); f++){
        if (tm){ tm.setTime(clip0.duration * f / 8); obj.updateMatrixWorld(true); }
        obj.traverse(function(o){
          if (!o.isSkinnedMesh) return; o.skeleton.update();
          var pos = o.geometry.getAttribute("position"), step = Math.max(1, Math.floor(pos.count / 1500));
          for (var i = 0; i < pos.count; i += step){ o.boneTransform(i, bp); bp.applyMatrix4(o.matrixWorld); box.expandByPoint(bp); }
        });
      }
      if (tm){ tm.stopAllAction(); tm.uncacheRoot(obj); }
      box.getSize(size); box.getCenter(c); obj.position.set(-c.x, -box.min.y, -c.z);
    } else if (!bones.isEmpty()){ var bc = bones.getCenter(new THREE.Vector3()); obj.position.set(-bc.x, n.fly ? -bc.y : -bones.min.y, -bc.z); }
    else obj.position.set(-c.x, n.fly ? -c.y : -box.min.y - (n.sink || 0) * size.y, -c.z);
    obj.traverse(function(o){ if (o.isMesh){ o.frustumCulled = false; if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals(); } });
    var pivot = new THREE.Group(); pivot.add(obj); pivot.scale.setScalar(n.size / Math.max(size.x, size.y, size.z)); if (n.ys) pivot.scale.y *= n.ys;
    pivot.rotation.y = (({ "z":0, "x":-90, "-x":90 })[n.facing] + (n.turn || 0)) * D2R;
    if (n.fly) pivot.position.y = n.fly;
    if (n.back) pivot.position.z = -n.back;   // sprawling legs stay inside the plinth's ring
    n.holder.add(pivot); n.pivot = pivot;
    if (gltf.animations && gltf.animations.length){
      var clip = gltf.animations[0];
      if (n.clipName) gltf.animations.forEach(function(a){ if (a.name.toLowerCase().indexOf(n.clipName) !== -1) clip = a; });
      if (n.clip && THREE.AnimationUtils.subclip) clip = THREE.AnimationUtils.subclip(clip, "calm", Math.round(n.clip[0] * 30), Math.round(n.clip[1] * 30), 30);
      var mixer = new THREE.AnimationMixer(obj), act = mixer.clipAction(clip);
      if (n.once){ act.setLoop(THREE.LoopOnce, 1); act.clampWhenFinished = true; }   // e.g. the fox wakes up once and stays standing
      act.play(); mixers.push(mixer);
    }
  }

  // ---------------------------------------------------------------- camera, input, loop
  function resize(){
    if (!renderer) return;
    var w = view.clientWidth || window.innerWidth, h = view.clientHeight || window.innerHeight;
    renderer.setSize(w, h); camera.aspect = w / h;
    // fit all four rows between the header and the bottom of the screen
    var want = (w / h < 0.9) ? "tall" : "wide"; if (want !== layoutName) applyLayout(want);
    var hdr = document.querySelector("#ui .header"), top = hdr ? Math.max(0, hdr.getBoundingClientRect().bottom) : 0, bottom = 0;
    var vsw = document.querySelector("#ui .header .view-switch");   // wide screens: the switch moved to the corner, keep the same breathing room under the title
    if (vsw && getComputedStyle(vsw).position === "fixed") top += vsw.offsetHeight + 8;
    if (layoutName === "tall"){ var pr = infoEl.parentNode.getBoundingClientRect(); if (pr.height && pr.top > h * 0.4) bottom = h - pr.top; }   // the info panel docks at the bottom on phones
    var avail = Math.max(h * 0.4, h - top - bottom - 8);
    var halfW = layout.halfW, halfH = layout.halfH, vf = camera.fov * D2R, hf = 2 * Math.atan(Math.tan(vf / 2) * camera.aspect);
    fitDist = Math.max(halfW / Math.tan(hf / 2), halfH / Math.tan(vf / 2) * h / avail) * 1.04;
    if (top || bottom) camera.setViewOffset(w, h, 0, (bottom - top) / 2, w, h); else camera.clearViewOffset();
    camera.updateProjectionMatrix();
  }
  function bindInput(){
    var el = renderer.domElement, ptrs = new Map(), lastDist = 0, moved = 0;
    el.style.touchAction = "none";
    el.addEventListener("pointerdown", function(e){ el.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY }); moved = 0; if (ptrs.size === 2){ var p = Array.from(ptrs.values()); lastDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); } });
    el.addEventListener("pointermove", function(e){
      if (!ptrs.has(e.pointerId)) return; var pr = ptrs.get(e.pointerId), dx = e.clientX - pr.x, dy = e.clientY - pr.y; ptrs.set(e.pointerId, { x:e.clientX, y:e.clientY });
      if (ptrs.size === 1){ yaw = Math.max(-0.7, Math.min(0.7, yaw - dx * 0.005)); pitch = Math.max(0.02, Math.min(0.8, pitch + dy * 0.004)); moved += Math.abs(dx) + Math.abs(dy); }
      else if (ptrs.size === 2){ var p = Array.from(ptrs.values()), d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); if (lastDist) zoom = Math.max(0.5, Math.min(1.6, zoom * lastDist / d)); lastDist = d; moved += 10; }
    });
    el.addEventListener("pointerup", function(e){ if (!ptrs.has(e.pointerId)) return; ptrs.delete(e.pointerId); if (ptrs.size < 2) lastDist = 0; if (moved < 8) pick(e.clientX, e.clientY); });
    el.addEventListener("pointercancel", function(e){ ptrs.delete(e.pointerId); });
    el.addEventListener("wheel", function(e){ e.preventDefault(); zoom = Math.max(0.5, Math.min(1.6, zoom * (1 + Math.sign(e.deltaY) * 0.08))); }, { passive:false });
  }
  function pick(cx, cy){
    var rect = renderer.domElement.getBoundingClientRect(), best = null, bestD = 1e9, v = new THREE.Vector3();
    NODES.forEach(function(n){ v.copy(n.anchor); world.localToWorld(v); v.project(camera);
      var d = Math.hypot(rect.left + (v.x + 1) / 2 * rect.width - cx, rect.top + (1 - v.y) / 2 * rect.height - cy); if (d < bestD){ bestD = d; best = n; } });
    if (best && bestD < rect.width * 0.06) select(best); else if (selected){ selected = null; showIntro(); }
  }
  function linkLit(meta){
    if (selected) return meta.from === selected || meta.to === selected;
    if (showChain){ if (meta.sun) return meta.to.id === "grass"; var i = CHAIN.indexOf(meta.from && meta.from.id); return i !== -1 && CHAIN[i + 1] === meta.to.id; }
    return true;
  }
  function nodeLit(n){
    if (selected) return n === selected || LINKS.some(function(l){ return (l[0] === selected.id && l[1] === n.id) || (l[1] === selected.id && l[0] === n.id); });
    if (showChain) return CHAIN.indexOf(n.id) !== -1;
    return true;
  }
  var tmp = new THREE.Vector3();
  function frame(){
    if (!active) return; raf = requestAnimationFrame(frame);
    var dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    world.rotation.y += (yaw - world.rotation.y) * 0.12;
    var d = fitDist * zoom, cy = layout.cy; camera.position.set(0, cy + Math.sin(pitch) * d, Math.cos(pitch) * d); camera.lookAt(0, cy, 0);
    mixers.forEach(function(m){ m.update(dt); });
    sunMesh.rotation.y += dt * 0.19;
    // at rest no arrows show; tapping an organism (or "Show the food chain") brings up only its links and sends energy along them
    var focus = !!selected || showChain;
    links.forEach(function(L){ var on = focus && linkLit(L.meta), target = on ? 0.9 : 0; L.glow += (target - L.glow) * 0.12; L.mat.opacity = L.glow;
      L.meshes.forEach(function(m){ m.visible = L.glow > 0.01; }); L.flowing = on; });
    pulses.forEach(function(p){ p.t = (p.t + dt * 0.3) % 1; p.sprite.position.copy(p.curve.getPoint(p.t)); p.sprite.material.opacity = p.rec.flowing ? Math.sin(p.t * Math.PI) * p.rec.glow : 0; });
    NODES.forEach(function(n){
      var on = nodeLit(n); n.lit += ((on ? 1 : 0.25) - n.lit) * 0.12;
      n.tag.classList.toggle("off", (!!selected || showChain) && !on);   // tapped (or chain shown): only the connected labels stay
      n.glow.material.opacity = n === selected ? 0.55 + Math.sin(t * 4) * 0.1 : 0.3 * n.lit;   // the tapped one's glow pulses
      if (n.pivot && n.fly) n.pivot.position.y = n.fly + Math.sin(t * 1.3 + n.x) * 0.08;
    });
    renderer.render(scene, camera);
    var w = renderer.domElement.clientWidth, h = renderer.domElement.clientHeight;
    NODES.forEach(function(n){
      tmp.set(n.x, n.y - 0.3, 1.05); world.localToWorld(tmp); tmp.project(camera);
      if (n === NODES[0]) rowTags.forEach(function(r, i){   // row markers sit right of each row (phones only; hidden by CSS otherwise)
        var v = new THREE.Vector3(6.3 * layout.sx + 1.55, i * layout.row + 0.35, 0); world.localToWorld(v); v.project(camera);
        r.style.transform = "translate(" + ((v.x + 1) / 2 * w).toFixed(1) + "px," + ((1 - v.y) / 2 * h).toFixed(1) + "px) translate(-50%,-50%)";
      });
      n.tag.style.transform = "translate(" + ((tmp.x + 1) / 2 * w).toFixed(1) + "px," + ((1 - tmp.y) / 2 * h + 4).toFixed(1) + "px) translate(-50%,0)";
    });
  }

  function build(){
    if (ready || building) return Promise.resolve(); building = true;
    buildDom();
    return Promise.all([ THREE.GLTFLoader ? null : addScript(JS + "loaders/GLTFLoader.js"), window.MeshoptDecoder ? null : addScript(JS + "libs/meshopt_decoder.js") ]).then(function(){
      buildScene(); resize(); bindInput();
      if (active){ clock.getDelta(); cancelAnimationFrame(raf); frame(); }   // draw at once: rocks and Sun first, each organism appears as it loads
      loadGLB("FoodChain/sun.glb").then(function(g){
        var obj = g.scene; obj.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        var pv = new THREE.Group(); obj.position.set(-c.x, -c.y, -c.z); pv.add(obj); pv.scale.setScalar(1.4 / Math.max(size.x, size.y, size.z));
        obj.traverse(function(o){ if (o.isMesh) o.frustumCulled = false; });
        while (sunMesh.children.length) sunMesh.remove(sunMesh.children[0]); sunMesh.add(pv);
        if (g.animations && g.animations.length){ var mx = new THREE.AnimationMixer(obj); mx.clipAction(g.animations[0]).play(); mixers.push(mx); }
      }).catch(function(e){ console.warn("Sun model unavailable, keeping the sphere:", e); }).then(function(){ webTick(); });
      loadGLB("Platform/land.glb").then(function(g){   // "Chunk Of Land 1", baked with the middle of its flat top at the origin and width 1
        g.scene.traverse(function(o){ if (o.isMesh){ o.frustumCulled = false; if (o.material.map) o.material.map.anisotropy = 4; } });
        NODES.forEach(function(n){
          while (n.land.children.length){ var c = n.land.children.pop(); if (c.geometry) c.geometry.dispose(); }
          var chunk = g.scene.clone(); chunk.scale.setScalar(2.15); n.land.add(chunk);   // clones share geometry and textures
        });
      }).catch(function(e){ console.warn("Land platform unavailable, keeping the plain discs:", e); }).then(function(){ webTick(); });
      var webDone = 0, webTotal = NODES.length + 2;   // the organisms, the Sun and the land (top progress bar)
      function webTick(){ webDone++; if (window.oekosLoad) window.oekosLoad("web", webDone, webTotal); }
      if (window.oekosLoad) window.oekosLoad("web", 0, webTotal);
      return Promise.all(NODES.map(function(n){ return loadGLB(n.file).then(function(g){ placeModel(n, g); }).catch(function(e){ console.warn("Food web model unavailable:", n.file, e); n.missing = true; }).then(webTick); }));
    }).then(function(){
      var miss = NODES.filter(function(n){ return n.missing; }).map(function(n){ return n.name; });
      statusEl.hidden = !miss.length; if (miss.length) statusEl.textContent = "Could not load: " + miss.join(", ");
      ready = true; building = false;
    }).catch(function(e){ building = false; statusEl.hidden = false; statusEl.textContent = "The 3D view could not start (" + e.message + ")."; console.warn(e); });
  }

  function setView(mode){
    var on = mode === "web";
    document.body.classList.toggle("view-web", on);
    document.getElementById("foodWebView").hidden = !on;
    if (on){ var sub = document.querySelector(".header .subtitle"); if (sub){ if (!sub.dataset.pyramid) sub.dataset.pyramid = sub.textContent; sub.textContent = "Food web · who eats whom"; } }
    active = on; cancelAnimationFrame(raf);
    if (on) build().then(function(){ if (!active || !renderer) return; resize(); clock.getDelta(); cancelAnimationFrame(raf); frame(); });
  }
  function init(){
    if (inited) return; inited = true;
    document.querySelectorAll("[data-view]").forEach(function(b){ b.addEventListener("click", function(){ setView(b.getAttribute("data-view")); }); });
  }
  window.addEventListener("resize", function(){ if (active) resize(); });
  document.addEventListener("DOMContentLoaded", init); if (document.readyState !== "loading") init();
  window.HeliosFoodWeb = { show:function(){ setView("web"); }, nodes:NODES, links:LINKS };
})();
