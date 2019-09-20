// Was thinking about this a little bit more, and we really need a way for signals to propogate slowly...
// That is how the brain works, and this should be able to do the same thing
// Also, action potentials always happen at full strength

const c = document.querySelector("#c");
const ctx = c.getContext("2d");

const damp = 0.45;
const backdrop = "#000000";
const neuron_color = "#ffffff";


class Signal {
  constructor(srcid, endid, val) {
    this.src = [srcid.x,srcid.y];
    this.end = [endid.x,endid.y];
    this.srcid = srcid; //source neuron
    this.endid = endid; //end neuron
    this.pos = this.src;
    this.val = val;
    this.dead = false;
    
    let dx = this.end[0]-this.src[0];
    let dy = this.end[1]-this.src[1];
    let mag = dist([0,0],[dx,dy]);
    this.uVec = [dx/mag,dy/mag];
  }
  draw(){
    ctx.beginPath();
    ctx.arc(this.pos[0], this.pos[1], 5, 0, 2 * Math.PI);
    ctx.stroke();
  }
  update() {
    if(this.dead){
      return false;
    }
    
    for(let i = 0; i < 2; i++){
      this.pos[i]+=this.uVec[i];
    }
    if(dist(this.pos,this.end)<1.1){
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
  constructor(a,b,i) {
    this.x = a;
    this.y = b;
    this.s = 15;
    this.ID = i;
    this.out = []; //vertices which this goes into
    this.in = []; //vertices which go into this
    this.val = 0;
  }
  draw() {
    ctx.fillStyle = neuron_color;
    ctx.fillRect(this.x-this.s/2, this.y-this.s/2,this.s,this.s);
    //ctx.fillText(this.inval.reduce((a, b) => a + b,0), this.x+10,this.y);
    ctx.fillText(this.val,this.x+12,this.y);
    
    for(let n of this.out){
      ctx.beginPath();
      ctx.strokeStyle = neuron_color;
      ctx.moveTo(this.x,this.y);
      ctx.lineTo(n.x, n.y);
      ctx.stroke();
    }
  }
  update(inVal) {
    this.val+=inVal;
    this.val = fround(this.val,10);
    let ret = [];
    for(let n of this.out){
      ret.push(new Signal(this,n,this.val*damp));
    }
    return ret;
  }
}


class Graph {
  constructor(){
    this.nodes = [];
    this.signals = [];
  }
  draw(){
    this.nodes.forEach(x=>x.draw());
    this.signals.forEach(x=>x.draw());
  }
  update(){
    let remov = [];
    for(let s of this.signals){
      if(!s.dead && s.update()){
        this.addValue(s.endid.ID,s.val);
        remov.push(s);
      }
    }
  }
  addValue(n,v){
    let newSigs = this.nodes[n].update(v);
    for(let s of newSigs){
      this.signals.push(s);
    }
  }
  addNode(){
    let testPos = [];
    let tooClose = true;
    let minbound = 70;
    let tests = 0;
    while(tooClose){
      tooClose = false;
      testPos = [20+Math.random()*380,20+Math.random()*380];
      for(let n of this.nodes){
        if(dist([n.x,n.y],testPos)<minbound){
          tooClose = true;
          break;
        }
      }
      tests++;
      if(tests>5){
        minbound-=10;
        tests -= 5;
      }
    }
    this.nodes.push(new Neuron(testPos[0],testPos[1],this.nodes.length));
  }
  addEdge(a,b){
    this.nodes[a].out.push(this.nodes[b]);
  }
}

function dist(p1,p2){
  return Math.sqrt((p1[0]-p2[0])*(p1[0]-p2[0])+(p1[1]-p2[1])*(p1[1]-p2[1]));
}
function fround(x,f){
  return Math.round(x*f)/f;
}


let t = 0; //time counter
let brain = new Graph();


for(let i = 0; i < 5; i++){
  brain.addNode();
}

brain.addEdge(0,1);
brain.addEdge(0,2);
brain.addEdge(0,4);
brain.addEdge(2,3);
brain.addEdge(3,0);
brain.addValue(0,4);


let active;
function draw() {
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, c.width, c.height);
  
  brain.draw();
  
  // sketch draw on top thing
  if (active){
  ctx.fillStyle = "red";
  ctx.fillRect(active.x-active.s/2, active.y-active.s/2, active.s,active.s)
  }
  brain.update();
  
  ctx.fillStyle = neuron_color;
  ctx.fillText(t,400,400);
  t++;
  window.requestAnimationFrame(draw);
}

draw();

c.addEventListener("mousedown", e => {
  let x = e.clientX - c.getBoundingClientRect().left;
  let y = e.clientY - c.getBoundingClientRect().top;
  
  let below = brain.nodes.find(n => n.x<x+n.s && n.x > x-n.s && n.y<y+n.s && n.y > y-n.s);
  if (below) {
    active = below;
  } else {
    let n = new Neuron(x,y,brain.nodes.length);
    active = n;
    brain.nodes.push(n);  
  }
});
