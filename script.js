const c = document.querySelector("#c");
const ctx = c.getContext("2d");

const damp = 0.8;

class Neuron {
  constructor(a,b) {
    this.x = a;
    this.y = b;
    this.s = 10;
    this.out = []; //vertices which this goes into
    this.in = []; //vertices which go into this
    this.inval = []; //input values
  }
  draw() {
    ctx.fillRect(this.x, this.y,this.s,this.s);
    ctx.fillText(this.inval.reduce((a, b) => a + b,0), this.x+10,this.y);
    
    for(let n of this.out){
      ctx.beginPath();
      ctx.moveTo(this.x+this.s/2,this.y+this.s/2);
      ctx.lineTo(n.x+n.s/2, n.y+n.s/2);
      ctx.stroke();
    }
  }
  update(inv) {
    this.inval.push(inv); // || this.inval;
    let sendval = (this.inval.reduce((a, b) => (a + b),0))*damp;
    //this.out.forEach(x=>x.update([this.inval.reduce((a, b) => (a + b),0)*damp])); //for each output, send out sum of this input
    this.out.forEach(x=>x.update(sendval));
  }
}

function addConnection(a,b){
  a.out.push(b);
  b.in.push(a);
}

let t = 0; //time counter
let neurons = [new Neuron(20,10),new Neuron(10,40), new Neuron(50,40)];

neurons[0].update(4);

addConnection(neurons[0],neurons[1]);
addConnection(neurons[0],neurons[2]);
addConnection(neurons[1],neurons[2]);


function draw() {
  ctx.clearRect(0,0,c.width,c.height);
  
  neurons.forEach(n=>n.draw());
  console.log
  t++;
  window.requestAnimationFrame(draw);
}

draw();