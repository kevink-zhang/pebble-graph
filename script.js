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
    this.out = [];
    this.in = [];
    this.input = [];
  }
  draw() {
    ctx.fillRect(this.x, this.y,this.s,this.s);
    ctx.fillText(this.input.reduce((a, b) => a + b,0), this.x+10,this.y);
    this.out.forEach(x=>x.draw());
  }
  update(inn) {
    this.input = inn; // || this.input;
    this.out.forEach(x=>x.update([this.input.reduce((a, b) => (a + b),0)*damp])); //for each output, send out sum of this input
  }
}

let t = 0;
let neurons = [new Neuron(20,10),new Neuron(10,40), new Neuron(50,40)];


neurons[0].update([3,4]);

function addConnection(a,b){
  a.out.push(b);
  b.in.push(a);
}

addConnection(neurons[0],neurons[1]);
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