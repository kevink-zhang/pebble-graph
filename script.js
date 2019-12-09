const c = document.querySelector("#c");
//const c2 = document.querySelector("#c2");
const ctx = c.getContext("2d");
//const ctx2 = c2.getContext("2d");

c.style.width = "500px";
c.style.height = "500px";
const scale = window.devicePixelRatio;
c.width = Math.ceil(500 * scale);
c.height = Math.ceil(500 * scale);
ctx.scale(scale, scale);

// c2.style.width = "80px";
// c2.style.height = "48px";
// c2.width = Math.ceil(80 * scale);
// c2.height = Math.ceil(48 * scale);
//ctx2.scale(scale, scale);

class Node {
  constructor(x, y) {
    this.adj = [];
    this.x = x;
    this.y = y;
    this.v = 0;
    this.r = 10;
  }
  draw() {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x,this.y,this.r,0,2*Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
    //console.log(this.x, this.y);
    for(let e of this.adj){
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(e.x ,e.y);
      //ctx.fill();
      ctx.stroke();
      ctx.closePath();
    }
    ctx.fillText(this.v,this.x+this.r+2,this.y);
  }
  addVal(v) {
    this.v+=v;
    console.log("aDS "+v);
  }
  addEdge(e){
    this.adj.push(e);
  }
  update() {
    if(this.v>=this.adj.length){
      this.v-=this.adj.length;
      return true;
    }
    return false;
  }
}

class Signal {
  constructor(src,tar){
    this.src = src;
    this.tar = tar;
    this.pos = [src.x,src.y];
    this.dx = (tar.x-src.x)/200;
    this.dy = (tar.y-src.y)/200;
  }
  draw() {
    ctx.strokeStyle = "red";
    //ctx.fillStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x,this.y,2,0,2*Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
  update() {
    this.pos[0]+=this.dx;
    this.pos[1]+=this.dy;
    if(this.pos[0]==this.tar.x){
      this.tar.addVal(1);
    }
  }
}
class Graph {
  constructor() {
    this.nodes = [];
    this.signals = [];
    this.move = true; //true if no signals are active, false otherwise to preserve sanity
  }
  draw() {
    this.nodes.forEach(x=>x.draw());
    this.signals.forEach(x=>x.draw());
  }
  update() {
    this.signals.forEach(x=>x.update());
    if(this.signals.length>0 && this.signals[0].pos[0]==this.signals[0].tar.x){
      this.signals = [];
    }
    
    if(!this.move) return;
    
    for(let n of this.nodes){
      if(n.update()){
        for(let e of n.adj){
          this.signals.push(new Signal(n,e));
          console.log
        }
        break;
      }
    }
  }
  addNode(x,y){
    this.nodes.push(new Node(x,y));
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
let paused = false; //will not update graph
let scene = "add"; //scene

let G = new Graph();

function draw() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, c.width, c.height);
  if(scene=="play") G.update();
  G.draw();
  
  window.requestAnimationFrame(draw);
}

draw();

let mouse = { x: 0, y: 0 };


c.addEventListener("mousedown", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
});

let movedx = 0;
let movedy = 0;

c.addEventListener("mousemove", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
  mouse.x = x;
  mouse.y = y;
});

let select = null;
c.addEventListener("mouseup", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
  
  let p = [x,y];
  let newN = true;
  for(let n of G.nodes){
    let pp = [n.x,n.y];
    if(dist(p,pp)<n.r){
      newN = false;
      if(select==n) {
        n.addVal(1);
        select = null;
        //console.log("IASDJASDA");
      }
      else if(select==null) select = n;
      else{
        n.addEdge(select);
        select.addEdge(n);
        select = null;
      }
    }
  }
  if(newN) {
    G.addNode(x,y);
    console.log("NEW");
  }
  
  console.log(x + " " + y);
});

let keysdown = {};
// window.addEventListener("keydown", e => {
//   const key = e.keyCode ? e.keyCode : e.which;
//   if (!(key in keysdown)) {
//     keysdown[key] = true;

//     if (key == 27) setActive(null);
//     if (key == 8) {
//       if (!active.fixed) G.nodes = G.nodes.filter(n => n != active);
//       else active.out = [];
//       G.nodes.forEach(n => (n.out = n.out.filter(o => o != active)));
//       G.signals = G.signals.filter(n => n.start != active && n.end != active);
//       setActive(null);
//     }
//   }
// });

window.addEventListener("keyup", e => {
  const key = e.keyCode;
  //console.log(key);
  if(key==32){//space bar, toggles simulation
    if(scene=="add") scene = "play";
    else if(scene=="play") scene = "add";
  }
});

// const sidebar = document.getElementById("sidebar");
// const threshold = document.getElementById("threshold");
// const weight = document.getElementById("weight");
// const name = document.getElementById("name");
// function setActive(a) {
//   active = a;
//   if (a) {
//     sidebar.classList.remove("hidden");
//     weight.value = a.weight;
//     threshold.value = a.actpot;
//     name.value = a.name;
//     console.log(a);
//   }
// }
// threshold.onchange = () => {
//   active.actpot = +threshold.value;
// };
// weight.onchange = () => {
//   active.weight = +weight.value;
// };
// name.onchange = () => {
//   if (!active.fixed) active.name = name.value;
// };
