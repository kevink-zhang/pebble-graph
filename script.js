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

const sim_speed = 20;

class Node {
  constructor(x, y) {
    this.adj = [];
    this.x = x;
    this.y = y;
    this.v = 0;
    this.r = 10;
    this.id = G.nodes.length;
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

    for(let e of this.adj){
      ctx.beginPath();
      ctx.moveTo(this.x, this.y);
      ctx.lineTo(e.x ,e.y);
      ctx.stroke();
      ctx.closePath();
    }
    
    ctx.fillStyle = "green";
    if(this.v>=this.adj.length) ctx.fillStyle = "red";
    ctx.fillText(this.v,this.x+this.r+2,this.y-3);
    ctx.fillStyle = "black";
    ctx.fillText(this.adj.length,this.x+this.r+2,this.y+10);
  }
  addVal(v) {
    this.v+=v;
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
    this.count = 25;
    this.dx = (tar.x-src.x)/this.count;
    this.dy = (tar.y-src.y)/this.count;
  }
  draw() {
    ctx.strokeStyle = "red";
    //ctx.fillStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(this.pos[0],this.pos[1],2,0,2*Math.PI);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
  update() {
    this.pos[0]+=this.dx*sim_speed;
    this.pos[1]+=this.dy*sim_speed;
    this.count-=sim_speed;
    if(this.count<=0){
      this.tar.addVal(1);
      G.signals.splice(G.signals.indexOf(this),1);
      G.move = 50;
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
  }
  draw() {
    this.signals.forEach(x=>x.draw());
    this.nodes.forEach(x=>x.draw());
    if(this.src){ //checks if positive radius
      ctx.strokeStyle = "red";
      ctx.beginPath();
      ctx.arc(this.src.x,this.src.y,this.cnt/4,0,2*Math.PI);
      ctx.stroke();
      ctx.closePath();
    }
  }
  addMemory(){
    let mm = [];
    this.nodes.forEach(x=>mm.push(x.v));
    
    if(this.mem[mm]) console.log("unstable");
    this.mem[mm] = true;
  }
  update() {
    this.signals.forEach(x=>x.update());
    
    if(this.move<=0){
      this.src = null;
      this.cnt = 0;
      
      this.addMemory();
      for(let n of this.nodes){
        if(n.update()){
          this.move = "???";
          this.src = n;
          this.cnt = 40;
          n.adj.forEach(x=>this.signals.push(new Signal(n,x)));
          break;
        }
      }
    }
    else this.cnt+=sim_speed;
    if(this.move>0) this.move-=sim_speed;
    
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
let select = null; //selected node

let G = new Graph();

function draw() {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, c.width, c.height);
  if(scene=="play") G.update();
  G.draw();
  
  if(select!=null){
    ctx.strokeStyle = "green";
    ctx.beginPath();
    let s = select.r+3;
    ctx.moveTo(select.x-s,select.y-s);
    ctx.lineTo(select.x-s,select.y+s);
    ctx.lineTo(select.x+s,select.y+s);
    ctx.lineTo(select.x+s,select.y-s);
    ctx.lineTo(select.x-s,select.y-s);
    ctx.stroke();
    ctx.closePath();
  }
  
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
  let newN = true;
  for(let n of G.nodes){
    let pp = [n.x,n.y];
    if(dist(p,pp)<=n.r+1){
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
