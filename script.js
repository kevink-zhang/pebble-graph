const c = document.querySelector("#c");
const ctx = c.getContext("2d");

function deepClone(obj, hash = new WeakMap()) {
  // Do not try to clone primitives or functions
  if (Object(obj) !== obj || obj instanceof Function) return obj;
  if (hash.has(obj)) return hash.get(obj); // Cyclic reference
  try {
    // Try to run constructor (without arguments, as we don't know them)
    var result = new obj.constructor();
  } catch (e) {
    // Constructor failed, create object without running the constructor
    result = Object.create(Object.getPrototypeOf(obj));
  }
  // Optional: support for some standard constructors (extend as desired)
  if (obj instanceof Map)
    Array.from(obj, ([key, val]) =>
      result.set(deepClone(key, hash), deepClone(val, hash))
    );
  else if (obj instanceof Set)
    Array.from(obj, key => result.add(deepClone(key, hash)));
  // Register in hash
  hash.set(obj, result);
  // Clone and assign enumerable own properties recursively
  return Object.assign(
    result,
    ...Object.keys(obj).map(key => ({ [key]: deepClone(obj[key], hash) }))
  );
}

c.style.width = "800px";
c.style.height = "800px";

const scale = window.devicePixelRatio;
c.width = Math.ceil(800 * scale);
c.height = Math.ceil(800 * scale);
ctx.scale(scale, scale);

let sim_speed = 0.5;
let rand_val_gen = 1.5;

let CAM = {x:0, y:0};
const refractory = 25;
const presimfrate = 0.25;
const select_color = "yellow";
const unstable_color = "red";
const neutral_color = "white";
const back_color = "black";
const edge_color = "gray";
const edge_width = 2;

class Node {
  constructor(x, y) {
    this.adj = [];
    this.x = x;
    this.y = y;
    this.v = 0; //number of pebbles
    this.r = 10;
    this.tcount = 0; //topple count
    this.id = G.nodes.length;
    this.sink = false;
  }
  drawNode() {
    ctx.strokeStyle = neutral_color;
    ctx.fillStyle = neutral_color;
    if (this.sink) {
      ctx.fillStyle = back_color;
    }
    if (this.v >= this.adj.length)
      ctx.strokeStyle = ctx.fillStyle = unstable_color;

    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x+CAM.x, this.y+CAM.y, this.r, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.closePath();

    if (this.sink) ctx.fillStyle = ctx.strokeStyle = back_color;
    ctx.beginPath();
    ctx.arc(this.x+CAM.x, this.y+CAM.y, this.r - 4, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();

    ctx.fillStyle = neutral_color;
    if (this.v >= this.adj.length) ctx.fillStyle = unstable_color;
    ctx.fillText(this.v, this.x + this.r + 2 +CAM.x, this.y - 3 +CAM.y);
    ctx.fillStyle = neutral_color;
    ctx.fillText(this.adj.length, this.x + this.r + 2 +CAM.x, this.y + 10 +CAM.y);
    ctx.fillText(this.tcount, this.x - this.r - 7 +CAM.x, this.y + 10 +CAM.y);
  }
  drawEdge() {
    for (let e of this.adj) {
      ctx.strokeStyle = edge_color;
      if (select != null && (select.id == this.id || select.id == e.id))
        ctx.strokeStyle = select_color;
      ctx.lineWidth = edge_width;
      ctx.beginPath();
      ctx.moveTo(this.x +CAM.x, this.y +CAM.y);
      ctx.lineTo(e.x +CAM.x, e.y +CAM.y);
      ctx.stroke();
      ctx.closePath();
    }
  }
  addVal(v) {
    this.v += v;
  }
  addEdge(e) {
    this.adj.push(e);
  }
  update() {
    if (this.sink) return false;
    if (this.adj.length == 0) return false;

    if (this.v >= this.adj.length) {
      this.v -= this.adj.length;
      this.tcount++;
      return true;
    }
    return false;
  }
}

class Signal {
  constructor(src, tar) {
    this.src = src;
    this.tar = tar;
    this.pos = [src.x, src.y];
    this.count = 25;
    this.dx = (tar.x - src.x) / this.count;
    this.dy = (tar.y - src.y) / this.count;
  }
  draw() {
    ctx.strokeStyle = unstable_color;
    //ctx.fillStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.pos[0] +CAM.x, this.pos[1] +CAM.y, 2, 0, 2 * Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
  update() {
    this.pos[0] += this.dx * sim_speed;
    this.pos[1] += this.dy * sim_speed;
    this.count -= sim_speed;
    if (this.count <= 0) {
      this.tar.addVal(1);
      G.signals.splice(G.signals.indexOf(this), 1);
      G.move = refractory;
    }
  }
}
class Graph {
  constructor() {
    this.nodes = [];
    this.mem = new Map();
    this.signals = [];
    this.move = 0; //0 if no signals are active, -1 otherwise to preserve sanity
    this.src = null;
    this.cnt = 0;
    this.unstable = false;
    this.finsim = false;
    this.firing = false; //is true for one frame if topling a node
  }
  reset() {
    this.nodes = [];
    this.mem = new Map();
    this.signals = [];
    this.move = 0; //0 if no signals are active, -1 otherwise to preserve sanity
    this.src = null;
    this.cnt = 0;
    this.unstable = false;
    this.finsim = false;
    select = null;
  }
  draw() {
    this.nodes.forEach(x => x.drawEdge());
    this.signals.forEach(x => x.draw());
    this.nodes.forEach(x => x.drawNode());
    if (this.src) {
      //checks if positive radius
      ctx.strokeStyle = unstable_color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(this.src.x +CAM.x, this.src.y +CAM.y, this.cnt / 4, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.closePath();
    }
  }
  addMemory() {
    let mm = [];
    this.nodes.forEach(x => mm.push(x.v));

    //console.log(mm);
    if (this.mem[mm]) {
      //deja vu! i've been in this place before...
      this.finsim = true;
      if (!this.unstable) scene = "add";

      for (let n of this.nodes) {
        if (n.v >= n.adj.length && n.adj.length > 0) {
          this.unstable = true;
          console.log("unstable");
          break;
        }
      }
    }
    this.mem[mm] = true; //mm.size+1;
  }
  update() {
    this.firing = false;
    this.signals.forEach(x => x.update());

    if (this.move <= 0) {
      this.src = null;
      this.cnt = 0;

      this.addMemory();
      if (scene == "add") return;

      for (let n of this.nodes) {
        if (n.update()) {
          this.firing = true;
          this.move = "???";
          this.src = n;
          this.cnt = 40;
          n.adj.forEach(x => this.signals.push(new Signal(n, x)));
          break;
        }
      }
    } else this.cnt += sim_speed;
    if (this.move > 0) this.move -= sim_speed;
  }
  addNode(x, y) {
    this.nodes.push(new Node(x, y));
  }
  simple(){
    let ret = [];
    this.nodes.forEach(x=>ret.push(parseInt(x.v)));
    return ret;
  }
  print() {
    let s = "";
    this.nodes.forEach(x => (s += String(x.v) + ","));
    s += "|";
    for (let n of this.nodes) {
      for (let y of n.adj) {
        s += y.id + ",";
      }
      s += "/";
    }
    console.log(s);
    return s;
  }
  init() {}
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
let st = 0; //simulation time
let paused = false; //will not update graph
let scene = "add"; //scene
let select = null; //selected node
let inSize = 0; //input graph generation size

let G = new Graph();
let H = [];
let Hcomp = [];

function draw() {
  //background
  ctx.fillStyle = back_color;
  ctx.fillRect(0, 0, c.width, c.height);

  //update graph

  if (scene == "play") {
    G.update();
    st = Math.floor(st);
    if (st >= 0 && st < H.length) {
      H.push(deepClone(G));
      st += sim_speed;
    } else {
      if (st >= H.length && st <= H.length + sim_speed)
        st = ((st % H.length) + H.length) % H.length;
    }
    document.getElementById("slider").value = st;
  } else if (scene == "addplay") {
    G.update();
    let asd = false;
    G.nodes.forEach(x=>asd=!x.sink||asd);
    while(asd){
      let ii = Math.floor(Math.random()*G.nodes.length);
      if(!G.nodes[ii].sink){
        if(G.firing)
          G.nodes[ii].addVal(1);
        asd=false;
      }
    }
    
    st = Math.floor(st);
    if (st >= 0 && st < H.length) {
      H.push(deepClone(G));
      st += sim_speed;
    } else {
      if (st >= H.length && st <= H.length + sim_speed)
        st = ((st % H.length) + H.length) % H.length;
    }
    document.getElementById("slider").value = st;
  }else if (scene == "replay") {
    st = Math.floor(st);
    if (st >= 0 && st < H.length) {
      G = H[st];
      st += sim_speed / presimfrate;
    } else {
      if (st >= H.length && st <= H.length + sim_speed / presimfrate) {
        for(let i =0; i < Hcomp.length; i++){
          if(JSON.stringify(Hcomp[i])==JSON.stringify(G.simple())){
            st = i;
            break;
          }
        }
      }
      st = ((st % H.length) + H.length) % H.length;
    }
    document.getElementById("slider").value = st;
  }
  //draw graph
  G.draw();
  //draw select animations
  if (select != null) {
    ctx.strokeStyle = select_color;
    ctx.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(
        select.x +CAM.x,
        select.y +CAM.y,
        select.r + 4,
        (i * 2 * Math.PI) / 3 + t / 10,
        (i * 2 * Math.PI) / 3 + (2 * Math.PI) / 3 - 0.65 + t / 10
      );
      ctx.stroke();
      ctx.closePath();
    }
  }
  
  ctx.fillStyle= neutral_color;
  ctx.fillText("Nodes: "+G.nodes.length,5,10);
  let ooo = 0; G.nodes.forEach(x=>ooo+=x.adj.length); ooo/=2;
  ctx.fillText("Edges: "+ooo,5,20);
  ooo = 0; G.nodes.forEach(x=>ooo+=x.v); ooo+=G.signals.length;
  ctx.fillText("Pebbles: "+ooo,5,30);
  
  t++;
  window.requestAnimationFrame(draw);
}

function presim() {
  let tt = 0;
  scene = "play";
  sim_speed = presimfrate; //adjust for higher "frame rate"

  H = [deepClone(G)];
  Hcomp = [G.simple()];
  let milestone = [];

  while (G.finsim == false) {
    G.update();
    H.push(deepClone(G));
    Hcomp.push(G.simple());

    if (G.firing) {
      milestone.push(tt);
    }
    if(!tt%1000)
      console.log(tt++);
  }

  document.getElementById("slider").max = H.length - 1;
  st = document.getElementById("slider").value = H.length - 1;
  document.getElementById("maxtime").value = "/ " + H.length - 1;
  scene = "readd";
  G.draw();
}

draw();

let mPos = null;
let mDrag = false;

c.addEventListener("mousedown", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
  mPos = [x,y];
  if(select!=null)
    if(dist(mPos,[select.x,select.y])<select.r*2) mDrag = true;
});

let movedx = 0;
let movedy = 0;

c.addEventListener("mousemove", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
  
  if (mPos!=null) {
    if(select!=null && mDrag){ //dragging node
      select.x = x-CAM.x;
      select.y = y-CAM.y;
    }
    else{ //dragging camera
      console
      CAM.x+=x-mPos[0];
      CAM.y+=y-mPos[1];
    }
    //if(x!=mPos[0]||y!=mPos[1]) mDrag = true;
    mPos = [x, y];
  }
});

c.addEventListener("mouseup", e => {

  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;

  let p = [x-CAM.x, y-CAM.y];
  let newN = true;
  for (let n of G.nodes) {
    let pp = [n.x, n.y];
    if (dist(p, pp) <= n.r + 1) {
      newN = false;
      if (keysdown[16]) {
        if (select != null) {
          select.adj.splice(select.adj.indexOf(n), 1);
          n.adj.splice(n.adj.indexOf(select), 1);
        }
      } else {
        if (select == n) {
          select = null;
        } else if (select == null) select = n;
        else {
          n.addEdge(select);
          select.addEdge(n);
          select = null;
        }
      }
    }
    if (dist(p, pp) <= n.r * 2) newN = false;
  }
  if (newN && !mDrag) {
    G.addNode(p[0], p[1]);
    console.log("new node at: " + p[0] + " , " + p[1]);
  }
  
  mDrag = false;
  mPos = null;
});

let keysdown = {};
window.addEventListener("keydown", e => {
  const key = e.keyCode;
  if (key == 16) {
    //shift key: yeeting edges
    keysdown[16] = true;
  }
});

window.addEventListener("keyup", e => {
  const key = e.keyCode;
  console.log(key);
  if (key == 80) {
    //p key: presimulation
    presim();
    console.log("Finished");
  }
  if (key == 32) {
    //space bar: toggles simulation
    if (scene == "add") scene = "play";
    else if (scene == "play") scene = "add";
    else if (scene == "readd") scene = "replay";
    else if (scene == "replay") scene = "readd";
  }
  if(key == 187) {
    if (scene == "addplay") scene = "add";
    else if (scene == "add") scene = "addplay";
  }
  if (key == 16) {
    //shift up: not yeeting edges
    keysdown[16] = false;
  }
  if (key == 82) {
    //r key: clear graph
    G.reset();
  }
  if (select != null && key == 83) {
    //s key: toggles sink node
    select.sink = !select.sink;
    select = null;
  }
  if (key == 90 && select != null) {
    //z key: deletes selected node
    let ooo = select;
    G.nodes.splice(G.nodes.indexOf(select), 1);
    for (let n of G.nodes) {
      for (let e of n.adj) {
        if (e.id == ooo.id) {
          n.adj.splice(n.adj.indexOf(e), 1);
        }
      }
    }
    select = null;
  }
  if (key == 69 && select != null) {
    //e key: add 1 to node
    select.addVal(1);
  }
  if (key >= 48 && key < 58) {
    //number 0-9: modifies node value
    let val = key - 48;
    if (select != null) {
      select.v *= 10;
      select.v += val;
    }
  }
  if (key == 192) {
    //tilda: set node value to 0
    if (select != null) {
      select.v = 0;
    }
  }
  if (key == 27) {
    //esc key: unselect
    select = null;
  }
  if(key==79) {
    //o key: random values for each node
    G.nodes.forEach(x=>x.v = Math.floor(rand_val_gen*Math.random()*x.adj.length));
  }

  if (key == 84) {
    //t key: generate tree
    G.reset();
    for (let i = 0; i < inSize; i++) {
      while (true) {
        let ddd = 50;
        let xx = Math.random() * (c.width-2*ddd)+ddd;
        let yy = Math.random() * (c.height-2*ddd)+ddd;
        let ooo = true;
        for (let n of G.nodes) {
          if (dist([xx, yy], [n.x, n.y]) < n.r * (2 + 2)) {
            ooo = false;
            break;
          }
        }
        if (ooo) {
          G.nodes.push(new Node(xx, yy));
          if (G.nodes.length > 1) {
            let oo = (Math.random() * (G.nodes.length - 1)) | 0;
            G.nodes[G.nodes.length - 1].adj.push(G.nodes[oo]);
            G.nodes[oo].adj.push(G.nodes[G.nodes.length - 1]);
          }
          break;
        }
      }
    }
  }
  if (key == 75) {
    //k key: generate complete
    G.reset();
    let xx = c.width / 2;
    let yy = c.height / 2;
    let rr = c.height / 2 - 50;
    for (let i = 0; i < inSize; i++) {
      G.nodes.push(
        new Node(
          xx + Math.sin(((2 * Math.PI) / inSize) * i) * rr,
          yy + Math.cos(((2 * Math.PI) / inSize) * i) * rr
        )
      );
    }
    for (let i = 0; i < G.nodes.length - 1; i++) {
      for (let j = i + 1; j < G.nodes.length; j++) {
        G.nodes[i].adj.push(G.nodes[j]);
        G.nodes[j].adj.push(G.nodes[i]);
      }
    }
  }
  if(key==71){
    //g key: generate grid graph
    let iii = 0;
    for(let i = 0; i < inSize; i++){
      for(let j = 0; j < inSize; j++){
        G.nodes.push(new Node(50+i*75,50+j*75));
        if(j>0){
          G.nodes[iii].adj.push(G.nodes[iii-1]);
          G.nodes[iii-1].adj.push(G.nodes[iii]);
        }
        if(i>0){
          G.nodes[iii].adj.push(G.nodes[iii-inSize]);
          G.nodes[iii-inSize].adj.push(G.nodes[iii]);
        }
        iii++;
      }
    }
  }
});

const inputsize = document.getElementById("size");
const simspeed = document.getElementById("simspeed");
const slider = document.getElementById("slider");
const inputtime = document.getElementById("time");
const maxdistime = document.getElementById("maxtime");

inputsize.onchange = () => {
  inSize = inputsize.value;
};
simspeed.onchange = () => {
  sim_speed = simspeed.value / 2;
};
slider.oninput = () => {
  if (!(scene == "readd" || scene == "replay")) return;
  st = Math.round(slider.value);
  G = H[st];
};
inputtime.onchange = () => {
  if (!(scene == "readd" || scene == "replay")) return;
  st = Math.round(inputtime.value);
};
