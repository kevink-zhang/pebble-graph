// Was thinking about this a little bit more, and we really need a way for signals to propogate slowly...
// That is how the brain works, and this should be able to do the same thing
// Also, action potentials always happen at full strength

const c = document.querySelector("#c");
const ctx = c.getContext("2d");

const damp = 0.65; //new signal decay
const decay = 0.995; //neuron value decay rate
const sim_speed = 10; //simulation speed
const backdrop = "#000000";
const neuron_color = "#ffffff";
const neuro_ref = 100; // refractory period
const neuro_max = 50;
const neuro_init_color = 50;

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
  ctx.lineTo(tox - subx - headlen * Math.cos(angle - Math.PI / 6), toy - suby - headlen * Math.sin(angle - Math.PI / 6));
  ctx.moveTo(tox - subx, toy - suby);
  ctx.lineTo(tox - subx - headlen * Math.cos(angle + Math.PI / 6), toy - suby - headlen * Math.sin(angle + Math.PI / 6));
  ctx.stroke();
}

class Signal {
  constructor(src, end, val) {
    this.src = src; // source neuron
    this.end = end; // target neuron
    this.progress = 0;
    this.val = val;
    this.dead = false;

    let dx = this.end.x - this.src.x;
    let dy = this.end.y - this.src.y;
    this.mag = Math.sqrt(dx**2+dy**2);
  }
  draw() {
    if (this.dead) return;

    let dx = this.end.x - this.src.x;
    let dy = this.end.y - this.src.y;
    let posx = this.src.x + dx*this.progress;
    let posy = this.src.y + dy*this.progress;
    
    ctx.fillStyle = neuron_color;
    ctx.fillText(fround(this.val, 10), posx, posy - 10);

    ctx.strokeStyle = neuron_color;
    ctx.beginPath();
    ctx.arc(posx, posy, 5, 0, 2 * Math.PI);
    ctx.stroke();
  }
  update() {
    if (this.dead) {
      return false;
    }

    this.progress += 0.5/this.mag;
    if (this.progress >= 1) {
      this.dead = true;
      return true;
    }
    return false;
  }
  kill() {
    this.dead = true;
  }
}

class Neuron {
  constructor(a, b, i) {
    this.x = a;
    this.y = b;
    this.s = 15;
    this.id = i;
    this.out = []; // vertices which this goes into
    this.signals = []; // signals which currently are inside synapses (should replace .val)
    this.refractory = 0;
    this.weight = 1; // set to -1 for inhibitory neurons
    this.val = 0; // display value
    this.actpot = 1.5; // action potential barrier
  }
  draw() {
    for (let n of this.out) {
      ctx.strokeStyle = neuron_color;
      draw_arrow(this.x, this.y, n.x, n.y);
    }

    let a = (this.val / neuro_max) * (255-neuro_init_color) + neuro_init_color;
    ctx.fillStyle = "rgb(" + a + "," + a + "," + a + ")";
    ctx.fillRect(this.x - this.s / 2, this.y - this.s / 2, this.s, this.s);
    ctx.fillStyle = neuron_color;
    ctx.fillText(fround(this.val, 10), this.x + 12, this.y);
  }
  sum() {
    return this.signals.reduce((a,b)=>a.weight + b.weight, 0)
  }
  update(inVal) {
    if (this.dead) return [];

    this.val += inVal;

    // action potential not met, will not fire
    if (this.val < this.actpot || this.refractory > 0)
      return [];

    this.refractory = neuro_ref;

    let ret = this.out.map(n => new Signal(this, n, this.weight))

    return ret;
  }
  tick() {
    this.val *= decay;
    this.refractory = Math.max(this.refractory - 1, 0);
  }
}

class Graph {
  constructor() {
    this.nodes = [];
    this.signals = [];
  }
  draw() {
    this.nodes.forEach(x => x.draw());
    this.signals.forEach(x => x.draw());
    this.signals = this.signals.filter(x=>!x.dead)
  }
  update() {
    for (let s of this.signals) {
      if (s.update()) {
        this.addValue(s.end.id, s.val);
      }
    }
    for (let n of this.nodes) {
      n.tick();
    }
  }
  addValue(n, v) {
    let newSigs = this.nodes[n].update(v);
    for (let s of newSigs) {
      this.signals.push(s);
    }
  }
  addNode() {
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
    this.nodes.push(new Neuron(testPos[0], testPos[1], this.nodes.length));
  }
  addEdge(a, b) {
    this.nodes[a].out.push(this.nodes[b]);
  }
}

function dist(p1, p2) {
  return Math.sqrt((p1[0] - p2[0]) * (p1[0] - p2[0]) + (p1[1] - p2[1]) * (p1[1] - p2[1]));
}
function fround(x, f) {
  return Math.floor(x * f) / f;
}
function distToSegment(p, v, w) {
  let l2 = dist(v, w);
  if (l2 == 0) return dist(p, v);
  let t = ((p[0] - v[0]) * (w[0] - v[0]) + (p[1] - v[1]) * (w[1] - v[1])) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(dist(p, { x: v[0] + t * (w[0] - v[0]), y: v[1] + t * (w[1] - v[1]) }));
}

let t = 0; //time counter
let brain = new Graph();

for (let i = 0; i < 5; i++) {
  brain.addNode();
}

brain.addEdge(0, 1);
brain.addEdge(0, 2);
brain.addEdge(2, 4);
brain.addEdge(0, 4);
brain.addEdge(2, 3);
brain.addEdge(1, 2);
brain.addEdge(3, 0);
brain.addValue(0, 20);

let active = null;
let down = false;

function draw() {
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, c.width, c.height);

  brain.draw();

  if (active) {
    ctx.fillStyle = "yellow";
    ctx.fillRect(active.x - active.s / 2, active.y - active.s / 2, active.s, active.s);
  }
  for (let i = 0; i < sim_speed; i++) {
    brain.update();
  }

  if(!down && active) {
    draw_arrow(active.x, active.y, mouse.x, mouse.y)
  }

  ctx.fillStyle = neuron_color;
  ctx.fillText(t, 450, 450);
  t += sim_speed;
  window.requestAnimationFrame(draw);
}

draw();

let mouse = {x:0,y:0};

c.addEventListener("contextmenu", e => {
  e.preventDefault();
  return false;
});
c.addEventListener("mousedown", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;

  let below = brain.nodes.find(n => n.x < x + n.s && n.x > x - n.s && n.y < y + n.s && n.y > y - n.s);
  if (below) {
    if (e.button == 2) {
      brain.addValue(below.id, 10);
    } else {
      if (active != null) {
        if (below != active) {
          brain.addEdge(active.id, below.id);
        }
        active = null;
      } else {
        down = true;
        active = below;
      }
    }
  } else {
    let n = new Neuron(x, y, brain.nodes.length);
    brain.nodes.push(n);
  }
});
let movedx = 0;
let movedy = 0;
c.addEventListener("mousemove", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
  mouse.x = x;
  mouse.y = y;
  if (active && down) {
    movedx += active.x - x;
    movedy += active.y - y;
    active.x = x;
    active.y = y;
  }
});
c.addEventListener("mouseup", e => {
  console.log(movedx, movedy);
  down = false;
  if (Math.abs(movedx) > 20 || Math.abs(movedy) > 20) {
    active = null;
    movedx = 0;
    movedy = 0;    
  }
});
