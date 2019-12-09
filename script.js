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
  }
  draw() {
    ctx.strokeStyle = "lightblue";
    ctx.fillStyle = "lightblue";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.x,this.y,2,0,2*Math.PI);
    ctx.fill();
    ctx.stroke();
    //console.log(this.x, this.y);
  }
  addVal(v) {
    this.v+=v;
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
    ctx.arc(this.pos[0],this.pos[1],0,1,2*Math.PI);
  }
  update() {
    this.pos[0]+=this.dx;
    this.pos[1]+=this.dy;
  }
}
class Graph {
  constructor() {
    this.nodes = [];
    this.signals = [];
  }
  draw() {
    this.nodes.forEach(x=>x.draw());
    
  }
  update() {
    for(let n of this.nodes){
      if(n.update()){
        
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
  //ctx.fillStyle = backdrop;
  //ctx.fillRect(0, 0, c.width, c.height);
  G.update();
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
c.addEventListener("mouseup", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
  
  let p = [x,y];
  for(let n of G.nodes){
    let pp = [n.x,n.y];
    if(dist(p,pp)<n.r){
      n.addVal(1);
    }
  }
  G.addNode(x,y);
  
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

// window.addEventListener("keyup", e => {
//   const key = e.keyCode ? e.keyCode : e.which;
//   delete keysdown[key];
// });

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
