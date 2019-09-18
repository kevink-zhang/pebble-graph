/* If you're feeling fancy you can add interactivity 
    to your site with Javascript */
const c = document.querySelector("#c");
const ctx = c.getContext("2d");

class Neuron {
  constructor(a,b) {
    this.x = a;
    this.y = b;
    this.s = s;
    this.out = [];
    this.in = [];
  }
  draw() {
    ctx.fillRect(this.x, this.y,this.s,this.s);
  }
  update() {
    this.out.forEach(x=>x.update(this.in[0]+this.in[1]));
  }
}

let t = 0;
let neurons = new Neuron(20,10);

function draw() {
  ctx.clearRect(0,0,c.width,c.height);
  
  
  for(let n of neurons) {
    n.draw();
  }  
  
  t++
  window.requestAnimationFrame(draw);
}


draw();