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

class Node {
  constructor(x, y) {
    this.adj = [];
    this.x = x;
    this.y = y;
    this.v = 0;
  }
  draw() {
    ctx.fillStyle("blue");
    ctx.arc(this.x,this.y,0,2,2*Math.PI);
  }
  update(v) {
    this.v+=v;
  }
}

class Signal {
  constructor(src,tar){
    this.src = src;
    this.tar = tar;
    this.pos = [src.x,src.y];
    this.dx = 
  }
  draw() {
    
  }
  update() {
    
  }
}
class Graph {
  constructor() {
    this.nodes = [];
    this.signals = [];
  }
  draw() {
    
  }
  update() {
    
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


let t = 0; //time counter
let paused = false; //will not update brain
let scene = "neurons"; //scene

let G = new Graph();

let active = null;
let down = false;

function draw() {
  //ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, c.width, c.height);

}

draw();

let mouse = { x: 0, y: 0 };


c.addEventListener("mousedown", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;

  if (x > 5 && x < 20 && y > 5 && y < 20) {
    paused = !paused;
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
      below.update(1.2)
    } else {
      if (active != null) {
        if (below != active) {
          active.out.push(below);
        }
        setActive(null);
      } else {
        down = true;
        setActive(below);
      }
    }
  } else {
    let n = new Neuron(x, y, false, e.shiftKey ? -1.2 : 1.2);
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
