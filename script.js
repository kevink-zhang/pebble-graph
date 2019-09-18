/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */
const c = document.querySelector("#c");
const ctx = c.getContext("2d");

class Neuron {
  constructor(a,b) {
    this.x = a;
    this.y = b;
    this.s = 10;
    this.out = [];
    this.in = [];
  }
  draw() {
    ctx.fillRect(this.x, this.y,this.s,this.s);
    ctx.fillText(this.in.reduce((a, b) => a + b,0), this.x+10,this.y);
    this.out.forEach(x=>x.draw());
  }
  update(inn) {
    this.in = inn || this.in;
    console.log(this.in);
    this.out.forEach(x=>x.update([this.in.reduce((a, b) => a + b,0)])); //for each output, send out sum of this input
  }
}

let t = 0;
let neurons = new Neuron(20,10);
neurons.out = [new Neuron(10,40), new Neuron(30,40)];


neurons.update([3,1]);

function draw() {
  ctx.clearRect(0,0,c.width,c.height);
  
  
  neurons.draw();
  
  t++
  window.requestAnimationFrame(draw);
}

draw();