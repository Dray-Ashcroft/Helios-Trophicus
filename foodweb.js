/* =========================================================================
   Helios Trophicus — Food web view
   The pyramid's organisms linked by who eats whom. Arrows point from the
   food to the feeder (the direction energy flows). Tap an organism to see
   only its links; "Show the food chain" lights the chain inside the web.
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

  // rows climb by trophic level; facing = the model's own forward axis, turned to face the viewer
  var NODES = [
    { id:"grass",       name:"Grass",       tl:1, x:-4.6, file:"Pyramid/grass.glb",        size:1.5, facing:"z" },
    { id:"tree",        name:"Tree",        tl:1, x: 0.0, file:"Pyramid/tree.glb",         size:2.1, facing:"z", sink:0.07 },
    { id:"lupine",      name:"Lupine",      tl:1, x: 4.6, file:"Pyramid/lupine.glb",       size:1.4, facing:"z",
      note:"A legume: bacteria in its root nodules fix nitrogen, enriching the soil." },
    { id:"grasshopper", name:"Grasshopper", tl:2, x:-6.3, file:"FoodChain/grasshopper.glb", size:1.2, facing:"-x", turn:30 },
    { id:"caterpillar", name:"Caterpillar", tl:2, x:-2.1, file:"Pyramid/caterpillar.glb",  size:1.3, facing:"z", turn:-20,
      note:"The larva of a butterfly or moth; it feeds almost nonstop on leaves." },
    { id:"squirrel",    name:"Squirrel",    tl:2, x: 2.1, file:"Pyramid/squirrel.glb",     size:1.2, facing:"z", turn:-20 },
    { id:"deer",        name:"Deer",        tl:2, x: 6.3, file:"Pyramid/deer.glb",         size:1.8, facing:"x", turn:25,
      note:"In Indian forests deer such as chital and sambar are a main prey of leopards and tigers." },
    { id:"frog",        name:"Frog",        tl:3, x:-6.3, file:"FoodChain/frog.glb",       size:1.1, facing:"z", turn:15 },
    { id:"lizard",      name:"Lizard",      tl:3, x:-2.1, file:"Pyramid/lizard.glb",       size:1.4, facing:"z", turn:-30, clipName:"idle", posedBox:true },
    { id:"snake",       name:"Snake",       tl:3, x: 2.1, file:"Pyramid/snake.glb",        size:1.6, facing:"z", turn:-20, clip:[3, 9],
      note:"It eats squirrels (TL2) and frogs (TL3), so it feeds at two trophic levels: TL3 when it eats a squirrel, TL4 when it eats a frog." },
    { id:"leopard",     name:"Leopard",     tl:3, x: 6.3, file:"Pyramid/leopard.glb",      size:1.8, facing:"z", turn:-30,
      note:"A big cat of forests across India. Deer are among its main prey; nothing hunts an adult leopard here." },
    { id:"hawk",        name:"Hawk",        tl:4, x:-2.4, file:"Pyramid/hawk.glb",         size:1.7, facing:"z", turn:20, fly:0.95 },
    { id:"eagle",       name:"Eagle",       tl:4, x: 2.4, file:"FoodChain/eagle.glb",      size:1.9, facing:"x", turn:-20, fly:0.95 }
  ];
  // food -> feeder (energy flows this way)
  var LINKS = [
    ["grass","grasshopper"], ["lupine","grasshopper"], ["grass","deer"], ["tree","deer"], ["tree","squirrel"], ["lupine","caterpillar"],
    ["grasshopper","frog"], ["grasshopper","lizard"], ["caterpillar","frog"], ["caterpillar","lizard"], ["squirrel","snake"],
    ["frog","snake"], ["lizard","hawk"], ["snake","eagle"], ["deer","leopard"]
  ];
  var CHAIN = ["grass","grasshopper","frog","snake","eagle"];   // the food chain view's chain, found inside this web
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
  function buildDom(){
    view = document.getElementById("foodWebView");
    labelsHost = view.querySelector(".fc-labels"); infoEl = document.getElementById("fwInfo"); statusEl = view.querySelector(".fc-status");
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
      '<p>Many food chains linked together. Most animals eat more than one kind of food, and many are eaten by more than one predator. Arrows point from the food to the feeder.</p>' +
      '<p class="fc-dim">Tap an organism to see only its links.</p>' +
      '<button type="button" class="fc-back fc-start" id="fwChainBtn">' + (showChain ? 'Show the whole web' : 'Show the food chain inside the web') + '</button>';
    document.getElementById("fwChainBtn").addEventListener("click", function(){ showChain = !showChain; selected = null; showIntro(); });
    if (showChain) infoEl.insertAdjacentHTML("beforeend", '<p class="fc-pass">Grass → grasshopper → frog → snake → eagle: the chain from the Food chain view is one path through this web.</p>');
    NODES.forEach(function(x){ x.tag.classList.remove("on"); });
  }
  function select(n){
    selected = n; showChain = false;
    NODES.forEach(function(x){ x.tag.classList.toggle("on", x === n); });
    var food = eats(n.id), pred = eatenBy(n.id);
    infoEl.innerHTML = '<div class="fc-info-title"><span class="fc-chip" style="--tl:' + hex(TL_COLOR[n.tl]) + '">TL' + n.tl + '</span>' + n.name + '</div>' +
      '<div class="fc-info-role">' + TL_ROLE[n.tl] + '</div>' +
      '<dl><dt>Eats</dt><dd>' + (food.length ? list(food) : 'Nothing: makes its own food by photosynthesis') + '</dd>' +
      '<dt>Eaten by</dt><dd>' + (pred.length ? list(pred) : (n.tl === 4 ? 'Nothing here: a top carnivore' : 'None shown')) + '</dd></dl>' +
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

    // a plinth per organism, rimmed in its trophic-level colour (the pyramid's colours)
    NODES.forEach(function(n){
      var g = new THREE.Group(); world.add(g); n.group = g;
      var soil = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 1.05, 0.28, 40), new THREE.MeshLambertMaterial({ color:0x2a2119 })); soil.position.y = -0.14; g.add(soil);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.035, 8, 56), new THREE.MeshBasicMaterial({ color:TL_COLOR[n.tl], transparent:true })); ring.rotation.x = Math.PI / 2; g.add(ring); n.ring = ring;
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
    // Links run on a plane behind the plinths: each leaves the top of its food's plinth going up and bends
    // smoothly into the feeder's plinth from below, so no arrow crosses an animal or a label.
    LINKS.forEach(function(l){
      var a = byId[l[0]], b = byId[l[1]], lift = a.tl === b.tl ? 1.05 : 0;   // same-row link (frog -> snake) runs just above the plinths
      var p0 = new THREE.Vector3(a.x, a.y + 0.3 + lift, Z_BACK), p1 = new THREE.Vector3(b.x, b.y + (lift ? 0.3 + lift : 0.05), Z_BACK);
      var d = p1.clone().sub(p0).normalize(); p0.addScaledVector(d, 0.35); p1.addScaledVector(d, -0.35);
      addArrow(new THREE.LineCurve3(p0, p1), { from:a, to:b }, glow, 0.016);
    });
  }
  var Z_BACK = -1.25;
  function ORGS_SUN_LINKS(glow){
    NODES.filter(function(n){ return n.tl === 1; }).forEach(function(n){   // thin sunbeams, also behind the plinths
      var p1 = new THREE.Vector3(n.x - 0.35, n.y + 0.4, Z_BACK), p0 = sunPos.clone(); p0.addScaledVector(p1.clone().sub(p0).normalize(), 0.85);
      addArrow(new THREE.LineCurve3(p0, p1), { from:null, to:n, sun:true }, glow, 0.011);
    });
  }
  function addArrow(curve, meta, glow, r){
    var nPulse = meta.sun ? 1 : 2;
    var mat = new THREE.MeshBasicMaterial({ color:meta.sun ? 0xffd479 : ENERGY, transparent:true, opacity:0.3, depthWrite:false });
    var tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 2, r, 6, false), mat); flow.add(tube);
    // a small chevron halfway along shows the direction (food -> feeder) without crowding either end
    var tan = curve.getTangent(0.5), head = new THREE.Mesh(new THREE.ConeGeometry(r * 3.6, r * 9, 10), mat);
    head.position.copy(curve.getPoint(0.5)); head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan); flow.add(head);
    var rec = { meta:meta, mat:mat, glow:0.3 };
    for (var k = 0; k < nPulse; k++){
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map:glow, color:mat.color, transparent:true, depthWrite:false, blending:THREE.AdditiveBlending }));
      sp.scale.set(r * 11, r * 11, 1); flow.add(sp); pulses.push({ sprite:sp, curve:curve, t:k / nPulse, rec:rec });
    }
    links.push(rec);
  }

  function placeModel(n, gltf){
    var obj = gltf.scene; obj.updateMatrixWorld(true);
    var box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
    var bones = new THREE.Box3(), bp = new THREE.Vector3();
    obj.traverse(function(o){ if (o.isBone){ o.getWorldPosition(bp); bones.expandByPoint(bp); } });
    if (n.posedBox){   // measure as the skeleton draws it (the lizard stores mesh and skeleton at different scales)
      box.makeEmpty();
      obj.traverse(function(o){
        if (!o.isSkinnedMesh) return; o.skeleton.update();
        var pos = o.geometry.getAttribute("position"), step = Math.max(1, Math.floor(pos.count / 1500));
        for (var i = 0; i < pos.count; i += step){ o.boneTransform(i, bp); bp.applyMatrix4(o.matrixWorld); box.expandByPoint(bp); }
      });
      box.getSize(size); box.getCenter(c); obj.position.set(-c.x, -box.min.y, -c.z);
    } else if (!bones.isEmpty()){ var bc = bones.getCenter(new THREE.Vector3()); obj.position.set(-bc.x, n.fly ? -bc.y : -bones.min.y, -bc.z); }
    else obj.position.set(-c.x, n.fly ? -c.y : -box.min.y - (n.sink || 0) * size.y, -c.z);
    obj.traverse(function(o){ if (o.isMesh){ o.frustumCulled = false; if (!o.geometry.getAttribute("normal")) o.geometry.computeVertexNormals(); } });
    var pivot = new THREE.Group(); pivot.add(obj); pivot.scale.setScalar(n.size / Math.max(size.x, size.y, size.z));
    pivot.rotation.y = (({ "z":0, "x":-90, "-x":90 })[n.facing] + (n.turn || 0)) * D2R;
    if (n.fly) pivot.position.y = n.fly;
    n.holder.add(pivot); n.pivot = pivot;
    if (gltf.animations && gltf.animations.length){
      var clip = gltf.animations[0];
      if (n.clipName) gltf.animations.forEach(function(a){ if (a.name.toLowerCase().indexOf(n.clipName) !== -1) clip = a; });
      if (n.clip && THREE.AnimationUtils.subclip) clip = THREE.AnimationUtils.subclip(clip, "calm", Math.round(n.clip[0] * 30), Math.round(n.clip[1] * 30), 30);
      var mixer = new THREE.AnimationMixer(obj); mixer.clipAction(clip).play(); mixers.push(mixer);
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
    if (layoutName === "tall"){ var pr = infoEl.getBoundingClientRect(); if (pr.height && pr.top > h * 0.4) bottom = h - pr.top; }   // the info panel docks at the bottom on phones
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
    // at rest every link is a faint line; tapping an organism (or "Show the food chain") brightens its links and sends energy along them
    var focus = !!selected || showChain;
    links.forEach(function(L){ var on = linkLit(L.meta), target = !focus ? 0.3 : on ? 0.95 : 0.05; L.glow += (target - L.glow) * 0.12; L.mat.opacity = L.glow; L.flowing = focus && on; });
    pulses.forEach(function(p){ p.t = (p.t + dt * 0.3) % 1; p.sprite.position.copy(p.curve.getPoint(p.t)); p.sprite.material.opacity = p.rec.flowing ? Math.sin(p.t * Math.PI) * p.rec.glow : 0; });
    NODES.forEach(function(n){
      var on = nodeLit(n); n.lit += ((on ? 1 : 0.25) - n.lit) * 0.12; n.ring.material.opacity = n.lit; n.tag.classList.toggle("dim", !on);
      if (n.pivot && n.fly) n.pivot.position.y = n.fly + Math.sin(t * 1.3 + n.x) * 0.08;
      n.ring.scale.setScalar(n === selected ? 1.07 + Math.sin(t * 4) * 0.02 : 1);
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
    buildDom(); statusEl.textContent = "Loading 3D organisms…"; statusEl.hidden = false;
    return Promise.all([ THREE.GLTFLoader ? null : addScript(JS + "loaders/GLTFLoader.js"), window.MeshoptDecoder ? null : addScript(JS + "libs/meshopt_decoder.js") ]).then(function(){
      buildScene(); resize(); bindInput();
      loadGLB("FoodChain/sun.glb").then(function(g){
        var obj = g.scene; obj.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(obj), size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
        var pv = new THREE.Group(); obj.position.set(-c.x, -c.y, -c.z); pv.add(obj); pv.scale.setScalar(1.4 / Math.max(size.x, size.y, size.z));
        obj.traverse(function(o){ if (o.isMesh) o.frustumCulled = false; });
        while (sunMesh.children.length) sunMesh.remove(sunMesh.children[0]); sunMesh.add(pv);
        if (g.animations && g.animations.length){ var mx = new THREE.AnimationMixer(obj); mx.clipAction(g.animations[0]).play(); mixers.push(mx); }
      }).catch(function(e){ console.warn("Sun model unavailable, keeping the sphere:", e); });
      return Promise.all(NODES.map(function(n){ return loadGLB(n.file).then(function(g){ placeModel(n, g); }).catch(function(e){ console.warn("Food web model unavailable:", n.file, e); n.missing = true; }); }));
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
    if (on) build().then(function(){ if (!active || !renderer) return; resize(); clock.getDelta(); frame(); });
  }
  function init(){
    if (inited) return; inited = true;
    document.querySelectorAll("[data-view]").forEach(function(b){ b.addEventListener("click", function(){ setView(b.getAttribute("data-view")); }); });
  }
  window.addEventListener("resize", function(){ if (active) resize(); });
  document.addEventListener("DOMContentLoaded", init); if (document.readyState !== "loading") init();
  window.HeliosFoodWeb = { show:function(){ setView("web"); }, nodes:NODES, links:LINKS };
})();
