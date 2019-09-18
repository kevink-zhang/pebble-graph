/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */
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
    //this.out.forEach(x=>x.draw());
    for(let i = 0; i < this.out.length; i++){
      ctx.beginPath();
      ctx.moveTo(this.x+this.s/2,this.y+this.s/2);
      ctx.lineTo(this.out[i].x+this.out[i].s/2,this.out[i].y+this.out[i].s/2);
      ctx.stroke();
    }
  }
  update(inn) {
    this.inval = inn; // || this.inval;
    //this.out.forEach(x=>x.update([this.inval.reduce((a, b) => (a + b),0)*damp])); //for each output, send out sum of this input
  }
}

let t = 0;
let neurons = [new Neuron(20,10),new Neuron(10,40), new Neuron(50,40)];


neurons[0].update([4,3]);

function addConnection(a,b){
  a.out.push(b);
  b.in.push(a);
}

addConnection(neurons[0],neurons[1]);
addConnection(neurons[0],neurons[2]);
neurons[0].update([3,1]);

function draw() {
  ctx.clearRect(0,0,c.width,c.height);
  
  for(let i = 0; i < neurons.length; i++){
    neurons[i].draw();
  }
  //neurons.draw();
  
  t++;
  window.requestAnimationFrame(draw);
}

draw();