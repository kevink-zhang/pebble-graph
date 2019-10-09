const c = document.querySelector("#c");
const ctx = c.getContext("2d");

const damp = 0.65; //new signal decay
const decay = 0.995; //neuron value decay rate
const sim_speed = 5; //simulation speed
const sig_speed = 500; //speed of signal

const backdrop = "#000000";
const neuron_color = "#ffffff";
const neuro_ref = 0.003; // refractory period decay
const neuro_max = 3;
const neuro_init_color = 100;

function draw_arrow(fromx, fromy, tox, toy) {
  const headlen = 10; // length of head in pixels
  const dx = tox - fromx;
  const dy = toy - fromy;
  const len = Math.sqrt(dx ** 2 + dy ** 2);
  const subx = (dx / len) * 15;
  const suby = (dy / len) * 15;
  const angle = Math.atan2(dy, dx);
  ctx.beginPath();
  ctx.moveTo(fromx + subx, fromy + suby);
  ctx.lineTo(tox - subx, toy - suby);
  ctx.lineTo(
    tox - subx - headlen * Math.cos(angle - Math.PI / 6),
    toy - suby - headlen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(tox - subx, toy - suby);
  ctx.lineTo(
    tox - subx - headlen * Math.cos(angle + Math.PI / 6),
    toy - suby - headlen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

class Signal {
  constructor(src, end, val) {
    this.src = src; // source neuron
    this.end = end; // target neuron
    this.progress = 0;
    this.val = val; // strength of the resulting neurotransmitter
    this.fired = false; // make sure we don't fire twice before cleanup

    const dx = this.end.x - this.src.x;
    const dy = this.end.y - this.src.y;
    this.mag = Math.sqrt(dx ** 2 + dy ** 2);
  }
  draw() {
    const dx = this.end.x - this.src.x;
    const dy = this.end.y - this.src.y;
    const posx = this.src.x + dx * this.progress;
    const posy = this.src.y + dy * this.progress;

    ctx.fillStyle = neuron_color;
    ctx.fillText(fround(this.val, 10), posx, posy - 10);

    ctx.strokeStyle = neuron_color;
    ctx.beginPath();
    ctx.arc(posx, posy, 5, 0, 2 * Math.PI);
    ctx.stroke();
  }
  update() {
    this.progress += 1 / this.mag; // 1/sig_speed;
    return !this.fired && (this.fired = this.progress >= 1);
  }
}
class Neurotransmitter {
  constructor(val, speed = 0.005) {
    this.time = 1;
    this.speed = speed;
    this.val = val;
  }
  tick() {
    this.time -= this.speed;
  }
}
class Sense {
  constructor(n, a, b) {
    this.name = n;
    this.x = a;
    this.y = b;
    this.o = 0;
    this.outs = []; //output (sensory) neurons
    this.ins = []; //input neurons
    this.timer = 0;
    this.patt = []; //pattern of output
    this.timepat = []; //delays between outputs
    this.patind = 0;
    this.cooldown = 0;
  }
  setAuto(a, t) {
    this.timepat = t;
    this.patt = a;
  }
  addOut() {
    let n = new Neuron(this.x, this.y + this.o * 20, true);
    n.setName(this.name + " Out "+ this.outs.length);
    this.outs.push(n);
    G.player.brain.nodes.push(n);
    this.o++;
  }
  addIn() {
    let n = new Neuron(this.x, this.y + this.o * 20, true);
    n.setName(this.name + " In "+ this.ins.length);
    this.ins.push(n);
    G.player.brain.nodes.push(n);
    this.o++;
  }
  sendSignal(s, d) {
    //if not on cooldown, sends signal s
    if (this.cooldown == 0) {
      this.cooldown = d;
      for (let i = 0; i < s.length; i++) {
        if (s[i]) {
          G.player.brain.addValue(this.outs[i], 1);
        }
      }
    }
  }
  getSignal() {
    //returns the array of firing neurons
    let ret = [];
    for (let n of this.ins) {
      if (n.sum() != 0) ret.push(1);
      else ret.push(0);
    }
    return ret;
  }
  draw() {
    this.outs.forEach(x => x.draw());
  }
  update() {
    if (this.cooldown > 0) {
      this.cooldown -= sim_speed;
    }
    if (this.patt.length == 0) return;
    this.timer++;
    if (this.timer >= this.timepat[this.patind]) {
      let i = 0;
      for (let x of this.patt[this.patind]) {
        if (x == 1) {
          G.player.brain.addValue(this.outs[i], 1);
        }
        i++;
      }
      this.patind = (this.patind + 1) % this.patt.length;
      this.timer = 0;
    }
  }
}
class Neuron {
  constructor(a, b, fixed = false, weight = 1) {
    this.x = a;
    this.y = b;
    this.s = 15;
    this.ID = G.player.brain.nodes.length;
    this.fixed = fixed;
    this.out = []; // vertices which this goes into
    this.signals = []; // neurotransmitters which are inside the membrane (effects membrane potential)
    this.weight = weight; // set to -1 for inhibitory neurons
    this.actpot = 1; // action potential barrier
    
    this.name = "";
  }
  draw() {
    for (const n of this.out) {
      ctx.strokeStyle = neuron_color;
      draw_arrow(this.x, this.y, n.x, n.y);
    }

    const sum = this.sum();
    const a = (sum / neuro_max) * (255 - neuro_init_color) + neuro_init_color;
    ctx.fillStyle =
      "rgb(" +
      (this.weight < 0 ? a : 0) +
      "," +
      (this.weight < 0 ? 0 : a) +
      ",0)";
    if (this.fixed)
      ctx.fillStyle =
        "rgb(" + 0 + "," + 0 + "," + (this.weight < 0 ? 0 : a) + ")";
    ctx.fillRect(this.x - this.s / 2, this.y - this.s / 2, this.s, this.s);
    ctx.fillStyle = neuron_color;
    ctx.fillText(fround(sum, 10), this.x + 12, this.y);
  }
  // compute membrane potential with .signals
  sum() {
    return this.signals.map(x => x.val * x.time).reduce((a, b) => a + b, 0);
  }
  update(inVal) {
    this.signals.push(new Neurotransmitter(inVal));

    const sum = this.sum();

    // action potential not met, will not fire
    if (sum < this.actpot) return [];

    // Repolarize neuron through an influx of inhibitors
    this.signals.push(new Neurotransmitter(-this.actpot - 0.1, neuro_ref));

    return this.out.map(n => new Signal(this, n, this.weight));
  }
  tick() {
    for (const s of this.signals) s.tick();
    this.signals = this.signals.filter(x => x.time > 0);
  }
  setName(x) {
    this.name = x;
  }
}
class Output extends Neuron {
  constructor(a, b) {
    super(a, b, true);
  }
  update(inVal) {
    this.signals.push(new Neurotransmitter(inVal));

    const sum = this.sum();

    // action potential not met, will not fire
    if (sum < this.actpot) return [];

    // alert("you dead");
    // paused = true;
    this.signals.push(new Neurotransmitter(-this.actpot - 0.1, neuro_ref));

    return this.out.map(n => new Signal(this, n, this.weight));
  }
}

class Graph {
  constructor() {
    this.nodes = [];
    this.senses = [];
    this.signals = [];
  }
  draw() {
    this.signals.forEach(x => x.draw());
    this.nodes.forEach(x => x.draw());
    this.senses.forEach(x => x.draw());
    this.signals = this.signals.filter(x => x.progress <= 1);
  }
  update() {
    this.senses.forEach(x => x.update());
    for (let s of this.signals) {
      if (s.update()) {
        this.addValue(s.end, s.val);
      }
    }
    for (let n of this.nodes) {
      n.tick();
    }
  }
  addValue(n, v) {
    //push an update to node n
    this.signals.push(...n.update(v));
  }
  addSense(s) {
    //adds a sense to the brain
    this.senses.push(s);
  }
  upSense(s, t, i) {
    //adds nodes to sense (if t = true, then they are output nodes, else input)
    let ii = 0;
    for (; ii < this.senses.length; ii++) if (this.senses[ii].name == s) break;
    console.log(ii);
    for (let x = 0; x < i; x++) {
      if (t) this.senses[ii].addOut();
      else this.senses[ii].addIn();
    }
  }
  signalSense(n, ss, d) {
    for (let s of this.senses) {
      if (s.name == n) {
        s.sendSignal(ss, d);
        return;
      }
    }
  }
  getSense(n) {
    for (let s of this.senses) {
      if (s.name == n) {
        return s.getSignal();
      }
    }
  }
  addNode() {
    //add a randomly positioned node
    let testPos = [];
    let tooClose = true;
    let minbound = 70;
    let minlined = 50;
    let tests = 0;
    while (tooClose) {
      tooClose = false;
      testPos = [20 + Math.random() * 380, 20 + Math.random() * 380];
      for (let n of this.nodes) {
        if (dist([n.x, n.y], testPos) < minbound) {
          tooClose = true;
          break;
        }
      }

      for (let n1 of this.nodes) {
        for (let n2 of this.nodes) {
          if (distToSegment(testPos, [n1.x, n1.y], [n2.x, n2.y]) < minlined) {
            tooClose = true;
            break;
          }
        }
      }

      tests++;
      if (tests > 5) {
        minbound -= 10;
        minlined -= 4;
        tests -= 5;
      }
    }
    this.nodes.push(new Neuron(testPos[0], testPos[1]));
  }
  addEdge(a, b) {
    //connect a to b
    a.out.push(b);
  }
}

class animal {
  constructor(name, p = [0, 0], w = 10, s = 1 / 500, control = "CPU1") {
    this.name = name;
    this.pos = p; //position

    this.health = 100;
    this.face = 0; //facing direction
    this.speed = s; //move speed
    this.wid = w; //draw width
    this.control = control; //player, cpu1, cpu2, etc

    this.brain = null;
    if (this.control == "Player") {
      this.brain = new Graph();
    }
    this.senseTree = null; //tree of senses and levels
    this.vis = Math.PI / 4;
    this.touch = false;
  }
  update(enemypos, s) {
    if (this.brain) this.brain.update();
    if (this.health < 0) this.health = 0;
    if (this.control == "Player") {
      let enemySeen = false;
      for (let i = 0; i < enemypos.length; i++) {
        let p = enemypos[i];
        let theta = Math.atan2(p[1] - this.pos[1], p[0] - this.pos[0]);

        let p2 = 2 * Math.PI;
        let ttheta = (theta + p2) % p2;
        let hh = (this.face + this.vis + p2) % p2;
        let ll = (this.face - this.vis + p2) % p2;

        //console.log(ttheta, ll, hh)
        if (ttheta < hh && ttheta > ll) {
          enemySeen = true;
          break;
        }
      }
      if (enemySeen) {
        this.brain.signalSense("Visual", [0, 0, 1], 2000);
      } else {
        this.brain.signalSense("Visual", [1, 0, 0], 2000);
      }

      //motor
      let x = this.brain.getSense("Motor");
      //WIP, cant tell difference between signal from exciter or inhibitor
      let nx = this.pos[0];
      let ny = this.pos[1];

      if (x[2]) {
        nx = this.pos[0] + Math.cos(this.face) * sim_speed * this.speed;
        ny = this.pos[1] + Math.sin(this.face) * sim_speed * this.speed;
      }
      if (x[0]) {
        this.face -= (sim_speed * this.speed) / 25;
      }
      if (x[1]) {
        this.face += (sim_speed * this.speed) / 25;
      }
      if (x[3]) {
        nx = this.pos[0] - Math.cos(this.face) * sim_speed * this.speed;
        ny = this.pos[1] - Math.sin(this.face) * sim_speed * this.speed;
      }
      
      if (nx > 0 && nx < s && ny > 0 && ny < s) {
        this.pos[0] = nx;
        this.pos[1] = ny;
      }
      else{
        //touching border
        this.touch = true;
      }
      
      //touch
      if(this.touch){
        this.brain.signalSense("Touch",[0,1],2000);
      }
      this.touch = false;
    } else {
      //enemypos -> player position
      if (this.control == "CPU1") {
        let dx = -1 * (enemypos[0][0] - this.pos[0]);
        let dy = -1 * (enemypos[0][1] - this.pos[1]);
        let d = dist(enemypos[0], this.pos);
        let nx = this.pos[0] - (dx / d) * sim_speed * this.speed;
        let ny = this.pos[1] - (dy / d) * sim_speed * this.speed;

        if (
          nx > 0 &&
          nx < s &&
          ny > 0 &&
          ny < s &&
          dist([nx, ny], enemypos[0]) > 20
        ) {
          this.pos[0] = nx;
          this.pos[1] = ny;
        } else if (dist([nx, ny], enemypos[0]) <= 20) {
          G.player.health -= 0.01 * sim_speed;
          //enemy is touching player to attack it
          G.player.touch = true;
        }
      }
    }
  }
  draw(x, y) {
    //draw on translated x and y
    ctx.fillStyle = "rgb(0,255,0)";
    ctx.fillRect(x + this.pos[0] - 7.5, y + this.pos[1] - 10, 15, 3);
    ctx.fillStyle = "rgb(255,0,0)";
    ctx.fillRect(
      x + this.pos[0] - 7.5,
      y + this.pos[1] - 10,
      (15 / 100) * (100 - this.health),
      3
    );
    if (this.control == "Player") {
      this.brain.draw();
      //vision
      ctx.fillStyle = "rgb(170,170,0,0.5)";
      ctx.beginPath();
      ctx.moveTo(this.pos[0] + x, this.pos[1] + y);
      ctx.arc(
        this.pos[0] + x,
        this.pos[1] + y,
        100,
        this.face - this.vis,
        this.face + this.vis,
        false
      );
      ctx.closePath();
      ctx.fill();

      ctx.save();
      ctx.fillStyle = "rgb(255,255,170,1)";
      ctx.translate(x + this.pos[0], y + this.pos[1]);
      ctx.rotate(this.face);
      ctx.fillRect(-this.wid / 2, -this.wid / 2, this.wid, this.wid);
      ctx.restore();
    } else {
      if (this.control == "CPU1") {
        ctx.fillStyle = "rgb(150,0,0)";
        ctx.fillRect(
          x + this.pos[0] - this.wid / 2,
          y + this.pos[1] - this.wid / 2,
          this.wid,
          this.wid
        );
      }
    }
  }
}
class game {
  constructor() {
    this.player = new animal("Jeff", [75, 75], 10, 1 / 200, "Player");
    this.enemies = [new animal("Bad child", [25, 25])];

    this.x = 350;
    this.y = 350;
    this.s = 150;
  }
  draw() {
    ctx.fillStyle = "rgb(170,170,170)";
    ctx.fillRect(this.x, this.y, this.s, this.s);
    this.player.draw(this.x, this.y);
    this.enemies.forEach(n => n.draw(this.x, this.y));
  }
  update() {
    let ePos = [];
    this.enemies.forEach(n => ePos.push(n.pos));
    this.player.update(ePos, this.s);
    this.enemies.forEach(n => n.update([this.player.pos], this.s));
  }
}

function dist(p1, p2) {
  return Math.sqrt(
    (p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1])
  );
}
function fround(x, f) {
  return Math.floor(x * f) / f;
}
function distToSegment(p, v, w) {
  let l2 = dist(v, w);
  if (l2 == 0) return dist(p, v);
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(
    dist(p, { x: v[0] + t * (w[0] - v[0]), y: v[1] + t * (w[1] - v[1]) })
  );
}

let t = 0; //time counter
let paused = true; //will not update brain
let scene = "neurons"; //scene

let G = new game();

function loadLevel() {
  G.player.brain.addSense(new Sense("Visual", 20, 50));
  G.player.brain.upSense("Visual", true, 3);
  G.player.brain.addSense(new Sense("Motor", 470, 50));
  G.player.brain.upSense("Motor", false, 4);
  G.player.brain.addSense(new Sense("Temporal", 100, 150));
  G.player.brain.upSense("Temporal", true, 1);
  G.player.brain.senses[2].setAuto([[1]], [500]);
  G.player.brain.addSense(new Sense("Touch", 20, 150));
  G.player.brain.upSense("Touch",true,2);
}

let active = null;
let down = false;

loadLevel();
function draw() {
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, c.width, c.height);

  G.draw();

  if (active) {
    ctx.fillStyle = "yellow";
    ctx.fillRect(
      active.x - active.s / 2,
      active.y - active.s / 2,
      active.s,
      active.s
    );
  }
  if (!paused) {
    for (let i = 0; i < sim_speed; i++) {
      G.update();
    }
    t += sim_speed;
  }

  if (!down && active) {
    ctx.strokeStyle = neuron_color;
    draw_arrow(active.x, active.y, mouse.x, mouse.y);
  }

  ctx.fillStyle = neuron_color;
  ctx.fillText(t, 470, 10);

  ctx.fillRect(5, 5, 15, 15);
  ctx.fillStyle = backdrop;
  if (paused) {
    ctx.beginPath();
    ctx.moveTo(10 - 2, 7);
    ctx.lineTo(10 - 2, 17);
    ctx.lineTo(20 - 2, 12);
    ctx.closePath();
    ctx.fill();
  } else {
    ctx.fillRect(8, 7, 3, 10);
    ctx.fillRect(14, 7, 3, 10);
  }
  window.requestAnimationFrame(draw);
}

draw();

let mouse = { x: 0, y: 0 };

c.addEventListener("contextmenu", e => {
  e.preventDefault();
  return false;
});
c.addEventListener("mousedown", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;

  if (x > 5 && x < 20 && y > 5 && y < 20) {
    if (!paused) {
      paused = true;
    } else {
      paused = false;
    }
    return;
  }
  let below = G.player.brain.nodes.find(
    n => n.x < x + n.s && n.x > x - n.s && n.y < y + n.s && n.y > y - n.s
  );

  if (below) {
    if (e.button == 2) {
      G.player.brain.addValue(below, 1);
    } else {
      if (active != null) {
        if (below != active) {
          G.player.brain.addEdge(active, below);
        }
        setActive(null);
      } else {
        down = true;
        setActive(below);
      }
    }
  } else {
    let n = new Neuron(x, y, false, e.shiftKey ? -1 : 1);
    G.player.brain.nodes.push(n);
  }
});
let movedx = 0;
let movedy = 0;
c.addEventListener("mousemove", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
  mouse.x = x;
  mouse.y = y;
  if (active && down && !active.fixed) {
    movedx += active.x - x;
    movedy += active.y - y;
    active.x = x;
    active.y = y;
  }
});
c.addEventListener("mouseup", e => {
  down = false;
  if (Math.abs(movedx) > 20 || Math.abs(movedy) > 20) {
    setActive(null);
    movedx = 0;
    movedy = 0;
  }
});

let keysdown = {};
window.addEventListener("keydown", e => {
  const key = e.keyCode ? e.keyCode : e.which;
  if (!(key in keysdown)) {
    keysdown[key] = true;

    if (key == 73) G.player.brain.addValue(G.player.brain.nodes[0], 1);
    if (key == 27) setActive(null);
    if (key == 8) {
      if(!active.fixed) G.player.brain.nodes = G.player.brain.nodes.filter(n => n != active);
      else active.out = [];
      G.player.brain.nodes.forEach(
        n => (n.out = n.out.filter(o => o != active))
      );
      G.player.brain.signals = G.player.brain.signals.filter(
        n => n.start != active && n.end != active
      );
      setActive(null);
    }
  }
});

window.addEventListener("keyup", e => {
  const key = e.keyCode ? e.keyCode : e.which;
  delete keysdown[key];
});

const sidebar = document.getElementById("sidebar");
const threshold = document.getElementById("threshold");
const weight = document.getElementById("weight");
const name = document.getElementById("name");
function setActive(a) {
  active = a;
  if (a) {
    sidebar.classList.remove("hidden");
    weight.value = a.weight;
    threshold.value = a.actpot;
    name.value = a.name;
    console.log(a);
  } //else sidebar.classList.add("hidden");
}
threshold.onchange = () => {
  active.actpot = threshold.value;
};
weight.onchange = () => {
  active.weight = weight.value;
};
name.onchange = () => {
  if(!active.fixed)
    active.name = name.value;
}

