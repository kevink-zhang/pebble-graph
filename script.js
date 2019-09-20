// Was thinking about this a little bit more, and we really need a way for signals to propogate slowly...
// That is how the brain works, and this should be able to do the same thing
// Also, action potentials always happen at full strength

const c = document.querySelector("#c");
const ctx = c.getContext("2d");

const damp = 0.8;
const backdrop = "#000000";
const neuron_color = "#ffffff";

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
    this.val = fround(this.val,1000);
    this.out.forEach(x=>x.update(this.val * damp));
  }
}

class Signal {
  constructor() {
    
  }
  update() {
    
  }
}

class Graph {
  constructor(){
    this.nodes = [];
    this.signals = [];
  }
  draw(){
    this.nodes.forEach(x=>x.draw());
    //ctx.fillRect(10,10,10,10);
  }
  update(){
    //this.signals.forEach(x=>x.update());
  }
  nUpdate(n,v){
    this.nodes[n].update(v);
  }
  addNode(){
    let testPos = [];
    let tooClose = true;
    while(tooClose){
      tooClose = false;
      testPos = [20+Math.random()*200,20+Math.random()*70];
      for(let n of this.nodes){
        if(dist([n.x,n.y],testPos)<60){
          tooClose = true;
          break;
        }
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
brain.nUpdate(0,4);


function draw() {
  ctx.clearRect(0,0,c.width,c.height);
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, c.width, c.height);
  
  brain.draw();
  brain.update();
  
  t++;
  window.requestAnimationFrame(draw);
}

draw();