// NexVault Dark — animations.js

// ---- Particle System ----
class ParticleSystem {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    for(let i=0; i<60; i++) this.particles.push(this.spawn());
    this.raf = requestAnimationFrame(() => this.loop());
  }
  resize() {
    this.canvas.width  = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  spawn() {
    return {
      x: Math.random() * (this.canvas.width  || window.innerWidth),
      y: Math.random() * (this.canvas.height || window.innerHeight),
      r: Math.random() * 1.4 + 0.3,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      a: Math.random() * 0.5 + 0.1,
      color: Math.random() > 0.5 ? '0,212,170' : '79,140,255',
    };
  }
  loop() {
    const { ctx, canvas, particles } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      p.x += p.vx; p.y += p.vy;
      if(p.x < 0 || p.x > canvas.width)  p.vx *= -1;
      if(p.y < 0 || p.y > canvas.height) p.vy *= -1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
      ctx.fillStyle = `rgba(${p.color},${p.a})`;
      ctx.fill();
    });
    // Draw connections
    for(let i=0; i<particles.length; i++) {
      for(let j=i+1; j<particles.length; j++) {
        const dx = particles[i].x - particles[j].x;
        const dy = particles[i].y - particles[j].y;
        const dist = Math.sqrt(dx*dx + dy*dy);
        if(dist < 120) {
          ctx.beginPath();
          ctx.moveTo(particles[i].x, particles[i].y);
          ctx.lineTo(particles[j].x, particles[j].y);
          ctx.strokeStyle = `rgba(0,212,170,${0.08*(1-dist/120)})`;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }
      }
    }
    this.raf = requestAnimationFrame(() => this.loop());
  }
  destroy() { cancelAnimationFrame(this.raf); }
}

// ---- Mouse Glow ----
function initMouseGlow() {
  const glow = document.createElement('div');
  glow.style.cssText = 'position:fixed;pointer-events:none;z-index:0;width:300px;height:300px;border-radius:50%;background:radial-gradient(circle,rgba(0,212,170,0.04) 0%,transparent 70%);transform:translate(-50%,-50%);transition:left 0.1s,top 0.1s;';
  document.body.appendChild(glow);
  document.addEventListener('mousemove', e => {
    glow.style.left = e.clientX + 'px';
    glow.style.top  = e.clientY + 'px';
  });
}

// ---- Tilt Cards ----
function initTiltCards() {
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const rect = card.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top  + rect.height/2;
      const dx = (e.clientX - cx) / (rect.width/2);
      const dy = (e.clientY - cy) / (rect.height/2);
      card.style.transform = `perspective(600px) rotateY(${dx*6}deg) rotateX(${-dy*6}deg) scale(1.02)`;
      card.style.boxShadow = `0 ${8+dy*6}px ${24+Math.abs(dx)*10}px rgba(0,0,0,0.3), 0 0 20px rgba(0,212,170,0.1)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = '';
      card.style.boxShadow = '';
    });
  });
}

// ---- Scan Line ----
function initScanLine() {
  const line = document.createElement('div');
  line.className = 'scan-line';
  document.body.appendChild(line);
}

// ---- Init All ----
document.addEventListener('DOMContentLoaded', () => {
  // Particles
  const canvas = document.getElementById('vfx-canvas');
  if(canvas) window._particles = new ParticleSystem(canvas);

  initMouseGlow();
  initTiltCards();
  // initScanLine(); // uncomment for retro scan line effect

  // Intersection observer for stagger
  const obs = new IntersectionObserver(entries => {
    entries.forEach(e => { if(e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: 0.05 });
  document.querySelectorAll('.stagger > *').forEach((el, i) => {
    el.style.transitionDelay = (i * 0.06) + 's';
    obs.observe(el);
  });
});
