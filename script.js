const c = document.querySelector("#c");
const c2 = document.querySelector("#c2");
const ctx = c.getContext("2d");
const ctx2 = c2.getContext("2d");

c.style.width = "500px";
c.style.height = "500px";
const scale = window.devicePixelRatio;
c.width = Math.ceil(500 * scale);
c.height = Math.ceil(500 * scale);
ctx.scale(scale, scale);

c2.style.width = "80px";
c2.style.height = "48px";
c2.width = Math.ceil(80 * scale);
c2.height = Math.ceil(48 * scale);
ctx2.scale(scale, scale);

const sig_speed = 0.03; //speed of signal
const backdrop = "#000000";
const neuron_color = "#ffffff";
const neuro_ref = 0.06; // refractory period decay
const decay = 0.03; //neuron value decay rate
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
    this.progress += sig_speed;
    return !this.fired && (this.fired = this.progress >= 1);
  }
}
class Neurotransmitter {
  constructor(val, speed = decay) {
    this.time = 1;
    this.speed = speed;
    this.val = val;
  }
  tick() {
    this.time -= this.speed;
  }
}

class Neuron {
  constructor(a, b, fixed = false, weight = 1) {
    this.x = a;
    this.y = b;
    this.s = 8;
    this.ID = G.nodes.length;
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
      ctx.lineWidth = 1;
      draw_arrow(this.x, this.y, n.x, n.y);
    }

    const sum = this.sum();
    const a = (sum / neuro_max) * (255 - neuro_init_color) + neuro_init_color;
    ctx.fillStyle =
      "rgb(" +
      (this.weight < 0 ? 255 : 0) +
      ",0," +
      (this.weight < 0 ? 0 : 255) +
      ")";
    if (this.fixed)
      ctx.fillStyle = "rgb(0," + (this.weight < 0 ? 0 : a) + ",0)";

    ctx.strokeStyle = "lightblue";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.s, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = neuron_color;
    ctx.fillText(
      (this.name ? this.name + ": " : "") + fround(sum, 10),
      this.x + 12,
      this.y
    );
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

    this.signals = [];
    // Repolarize neuron through an influx of inhibitors
    this.signals.push(new Neurotransmitter(-0.1, neuro_ref));

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

class Graph {
  constructor() {
    this.nodes = [];
    this.signals = [];
  }
  draw() {
    this.signals.forEach(x => x.draw());
    this.nodes.forEach(x => x.draw());
    this.signals = this.signals.filter(x => x.progress <= 1);
  }
  update() {
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
  addEdge(a, b) {
    //connect a to b
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
let scene = "neurons"; //scene

let G = new Graph();

let active = null;
let down = false;

function draw() {
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, c.width, c.height);

  G.draw();

  if (active) {
    ctx.fillStyle = "yellow";
    ctx.strokeRect(
      active.x - active.s * 1.5,
      active.y - active.s * 1.5,
      active.s * 3,
      active.s * 3
    );
  }
  if (!paused) {
    G.update();
    t++;
  }

  if (!down && active) {
    ctx.strokeStyle = neuron_color;
    ctx.lineWidth = 1;
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

  ctx2.scale(1 / scale, 1 / scale);
  ctx2.drawImage(c2, -1, 0);
  ctx2.scale(scale, scale);

  ctx2.fillStyle = "white";

  ctx2.fillRect(80 - 1, 0, 1, 48);

  ctx2.fillStyle = "blue";

  ctx2.fillRect(80 - 1, 48-(Math.random()) * 48, 1, 1);
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
  let below = G.nodes.find(
    n =>
      n.x < x + n.s * 1.5 &&
      n.x > x - n.s * 1.5 &&
      n.y < y + n.s * 1.5 &&
      n.y > y - n.s * 1.5
  );

  if (below) {
    if (e.button == 2) {
      G.addValue(below, 1);
    } else {
      if (active != null) {
        if (below != active) {
          G.addEdge(active, below);
        }
        setActive(null);
      } else {
        down = true;
        setActive(below);
      }
    }
  } else {
    let n = new Neuron(x, y, false, e.shiftKey ? -1 : 1);
    G.nodes.push(n);
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

    if (key == 73) G.addValue(G.nodes[0], 1);
    if (key == 27) setActive(null);
    if (key == 8) {
      if (!active.fixed) G.nodes = G.nodes.filter(n => n != active);
      else active.out = [];
      G.nodes.forEach(n => (n.out = n.out.filter(o => o != active)));
      G.signals = G.signals.filter(n => n.start != active && n.end != active);
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
  }
}
threshold.onchange = () => {
  active.actpot = +threshold.value;
};
weight.onchange = () => {
  active.weight = +weight.value;
};
name.onchange = () => {
  if (!active.fixed) active.name = name.value;
};
