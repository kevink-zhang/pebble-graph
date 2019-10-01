const c = document.querySelector("#c");
const ctx = c.getContext("2d");

const damp = 0.65; //new signal decay
const decay = 0.995; //neuron value decay rate
const sim_speed = 10; //simulation speed
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
    this.progress += 0.5 / this.mag; // 1/sig_speed;
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
//sense is WIP
// https://ai.googleblog.com/2019/09/project-ihmehimmeli-temporal-coding-in.html
class Sense {
  constructor(a, b) {
    this.x = a;
    this.y = b;
    this.o = 0;
    this.outs = []; //output (sensory) neurons
    this.ins = []; //input neurons
    this.timer = 0;
    this.patt = []; //pattern of output
    this.timepat = []; //delays between outputs
    this.patind = 0;
  }
  setAuto(a, t) {
    this.timepat = t;
    this.patt = a;
  }
  addOut() {
    let n = new Neuron(this.x, this.y + this.o * 20, true);
    //n.fixed = true;
    this.outs.push(n);
    brain.nodes.push(n);
    this.o++;
  }
  removeOut() {
    //wip, although this shouldn't be used
    //will not remove sense neuron from brain
    this.out.pop();
    this.o--;
  }
  draw() {
    this.outs.forEach(x => x.draw());
  }
  update() {
    if (this.patt.length == 0) return;
    this.timer++;
    if (this.timer >= this.timepat[this.patind]) {
      let i = 0;
      for (let x of this.patt[this.patind]) {
        if (x == 1) {
          brain.addValue(this.outs[i], 1);
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
    this.ID = brain.nodes.length;
    this.fixed = fixed;
    this.out = []; // vertices which this goes into
    this.signals = []; // neurotransmitters which are inside the membrane (effects membrane potential)
    this.weight = weight; // set to -1 for inhibitory neurons
    this.actpot = 1; // action potential barrier
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
  // thinking about switching this to just n
  addValue(n, v) {
    this.signals.push(...n.update(v));
  }
  addSense(s) {
    this.senses.push(s);
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
    this.nodes.push(new Neuron(testPos[0], testPos[1]));
  }
  addEdge(a, b) {
    a.out.push(b);
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

let brain = new Graph();

brain.nodes.push(new Neuron(250, 15, true));
brain.addSense(new Sense(20, 50));
brain.senses[0].addOut();
brain.senses[0].addOut();
brain.senses[0].addOut();
brain.senses[0].setAuto([[0, 1, 0], [1, 0, 1], [1, 1, 1]], [500, 1000, 500]);
/*
brain.nodes.push(new Neuron(250,200, true));
brain.nodes.push(new Neuron(300,300, true));
brain.nodes.push(new Neuron(200,300, true));

brain.nodes.push(new Output(70, 100));

brain.addEdge(brain.nodes[1], brain.nodes[0]);
brain.addEdge(brain.nodes[1], brain.nodes[2]);
brain.addEdge(brain.nodes[2], brain.nodes[3]);
brain.addEdge(brain.nodes[3], brain.nodes[1]);
brain.addEdge(brain.nodes[0], brain.nodes[4]);

brain.addValue(brain.nodes[2], 1);
*/

let active = null;
let down = false;

function draw() {
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, c.width, c.height);

  brain.draw();

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
      brain.update();
    }
    t += sim_speed;
  }

  if (!down && active) {
    ctx.strokeStyle = neuron_color;
    draw_arrow(active.x, active.y, mouse.x, mouse.y);
  }

  ctx.fillStyle = neuron_color;
  ctx.fillText(t, 450, 450);

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
  let below = brain.nodes.find(
    n => n.x < x + n.s && n.x > x - n.s && n.y < y + n.s && n.y > y - n.s
  );

  if (below) {
    if (e.button == 2) {
      brain.addValue(below, 1);
    } else {
      if (active != null) {
        if (below != active) {
          brain.addEdge(active, below);
        }
        setActive(null);
      } else {
        down = true;
        setActive(below);
      }
    }
  } else {
    let n = new Neuron(x, y, false, e.shiftKey ? -1 : 1);
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
  e.preventDefault();
  if (!(key in keysdown)) {
    keysdown[key] = true;

    if (key == 73) brain.addValue(brain.nodes[0], 1);
    if (key == 27) setActive(null);
    if (key == 8 && !active.fixed) {
      brain.nodes = brain.nodes.filter(n => n != active);
      brain.nodes.forEach(n => (n.out = n.out.filter(o => o != active)));
      brain.signals = brain.signals.filter(
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
function setActive(a) {
  active = a;
  if(a){
    sidebar.classList.remove("hidden")
    weight.innerHTML = a.weight;
    threshold.innerHTML = a.threshold;
  } else sidebar.classList.add("hidden")
}