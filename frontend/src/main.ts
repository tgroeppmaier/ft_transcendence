// currently not in use

// class Paddle {
//   x: number;
//   y: number;
//   width: number;
//   height: number;
//   color: string;
//   speed: number;

//   constructor(x: number, y: number, width: number, height: number, color: string, speed: number) {
//     this.x = x;
//     this.y = y;
//     this.width = width;
//     this.height = height;
//     this.color = color;
//     this.speed = speed;
//   }

//   draw(ctx: CanvasRenderingContext2D) {
//     ctx.fillStyle = this.color;
//     ctx.fillRect(this.x, this.y, this.width, this.height);
//   }
// }

// document.addEventListener('DOMContentLoaded', () => { // wait until Browser has read the html file
//   const el = document.getElementById('gameBoard');
//   if (!(el instanceof HTMLCanvasElement)) throw new Error('Canvas #gameBoard not found');
//   const canvas = el;

//   const ctx2d = canvas.getContext('2d');
//   if (!ctx2d) throw new Error('2D context not available');
//   const ctx = ctx2d;

// // Function to handle canvas resizing
//   function resizeCanvas() {
//     canvas.width = window.innerWidth;  // Set width to window width
//     canvas.height = window.innerHeight; // Set height to window height
//     // Redraw everything after resizing
//   }

//   // Initial resize
//   resizeCanvas();

//   // Add event listener for window resize
//   window.addEventListener('resize', resizeCanvas);


//   const r = 15;
//   let x = canvas.width / 2;
//   let y = canvas.height / 2;
//   let vx = 3;
//   let vy = 3;

//   function step() {
//     // Update position
//     x += vx; // center of the ball
//     y += vy;

//     // Bounce on walls
//     if (x - r < 0) { x = r; vx *= -1; }
//     if (x + r > canvas.width) { x = canvas.width - r; vx *= -1; }
//     if (y - r < 0) { y = r; vy *= -1; }
//     if (y + r > canvas.height) { y = canvas.height - r; vy *= -1; }

//     // Draw
//     ctx.clearRect(0, 0, canvas.width, canvas.height); // clears the canvas
//     ctx.beginPath(); // new shape. fill and stroke only affect the arc
//     ctx.arc(x, y, r, 0, Math.PI * 2);
//     ctx.fillStyle = '#1e90ff';
//     ctx.fill();
//     ctx.strokeStyle = '#0b3d91';
//     ctx.stroke();
//     ctx.beginPath();
//     ctx.rect(0, canvas.height / 2 - 40, 20, 80);
//     ctx.fillStyle = '#000000';
//     ctx.fill();

//     requestAnimationFrame(step);
//   }

//   const h1 = document.getElementById('myH1') as HTMLHeadingElement | null;
//   if (h1) h1.textContent = 'Bouncing Ball';

//   step();
//   console.log('Hello');
// });