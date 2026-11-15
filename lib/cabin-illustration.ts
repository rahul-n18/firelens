type Particle = { x: number; y: number; wx: number; wy: number; age: number };

// The cabin geometry and coefficients belong to the illustration, not to a study.
export function illustrateCabin(
  cvs: HTMLCanvasElement,
  g: number,
  flow: number,
  largeSmoke: boolean,
  onDetector: (reached: boolean) => void,
) {
  const context = cvs.getContext("2d");
  if (!context) return;
  const ctx = context;
  const W = cvs.width, H = cvs.height, floorY = H - 46, ceilY = 34, wallL = 30, wallR = W - 30;
  const src = { x: 300, y: floorY }, det = { x: 480, y: ceilY, w: 64 };
  let parts: Particle[] = [];
  let detHits = 0, reached = false, last = 0, frame = 0;
  const css = (name: string) => getComputedStyle(cvs).getPropertyValue(name).trim();

  function step(dt: number) {
    for (let i = 0; i < 2; i++) { const a = Math.random() * 6.283, sp = 10 + Math.random() * 22;
      parts.push({ x: src.x + (Math.random() - .5) * 12, y: src.y - 6, wx: Math.cos(a) * sp, wy: Math.sin(a) * sp, age: 0 }); }
    const drift = flow * 9; // px/s per cm/s, illustration scale only
    for (const p of parts) {
      p.age += dt;
      const lift = 150 * g * Math.exp(-p.age / 4);            // buoyant rise scales with gravity and fades as smoke cools
      const spread = Math.exp(-p.age / 6);                     // initial puff spreading, slows over time
      const turb = 14 + 10 * Math.min(p.age, 3);               // plume widens as it rises
      p.x += (drift * Math.min(1, p.age / 1.5) + p.wx * spread + (Math.random() - .5) * turb) * dt;
      p.y += (-lift + p.wy * spread + (Math.random() - .5) * turb) * dt;
      if (p.y < ceilY + 6) { p.y = ceilY + 6 + Math.random() * 6; if (g > 0) p.x += (p.x < src.x ? -1 : 1) * 80 * g * dt; }
      if (p.y > floorY - 3) p.y = floorY - 3;
      if (p.x < wallL + 3) p.x = wallL + 3;
      if (p.y < ceilY + 24 && p.x > det.x - det.w / 2 && p.x < det.x + det.w / 2) detHits++;
    }
    parts = parts.filter(p => p.x < wallR - 2 && p.age < 26);
    if (parts.length > 1100) parts.splice(0, parts.length - 1100);
    if (!reached && detHits > 55) { reached = true; onDetector(true); }
  }
  let sprite: HTMLCanvasElement | null = null, spriteKey = "";
  function smokeSprite(rgb: string) {
    if (sprite && spriteKey === rgb) return sprite;
    const c = document.createElement("canvas"); c.width = c.height = 64; const x = c.getContext("2d")!;
    const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, `rgba(${rgb},1)`); gr.addColorStop(.45, `rgba(${rgb},.55)`); gr.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = gr; x.fillRect(0, 0, 64, 64); sprite = c; spriteKey = rgb; return c;
  }
  const layer = document.createElement("canvas"); layer.width = W; layer.height = H; const lctx = layer.getContext("2d")!;
  function rrect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  let tclock = 0;
  function lf(w: number) { const k = Math.min(2.3, W / Math.max(1, cvs.clientWidth)); return `${w} ${Math.round(12.5 * k)}px 'Public Sans', Arial`; }
  function draw() {
    const ink = css("--ink"), muted = css("--muted"), rule = css("--rule"), surface = css("--surface"), paper = css("--paper"), alert = css("--detector-alert"), smoke = css("--smoke");
    tclock += 1 / 60;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = surface; ctx.fillRect(0, 0, W, H);
    // module interior
    rrect(ctx, wallL, ceilY, wallR - wallL, floorY - ceilY, 22); ctx.fillStyle = paper; ctx.fill();
    ctx.save(); rrect(ctx, wallL, ceilY, wallR - wallL, floorY - ceilY, 22); ctx.clip();
    ctx.strokeStyle = rule; ctx.lineWidth = 1;
    for (let x = wallL + 80; x < wallR; x += 80) { ctx.beginPath(); ctx.moveTo(x, ceilY); ctx.lineTo(x, ceilY + 8); ctx.moveTo(x, floorY - 8); ctx.lineTo(x, floorY); ctx.stroke(); }
    // airflow streamlines (animated dashes)
    if (flow > 0) {
      ctx.strokeStyle = muted; ctx.globalAlpha = .35; ctx.lineWidth = 1.2; ctx.setLineDash([10, 14]); ctx.lineDashOffset = -tclock * flow * 9;
      for (let k = 0; k < 4; k++) { const y = ceilY + 70 + k * 62; ctx.beginPath(); ctx.moveTo(wallL + 14, y); ctx.bezierCurveTo(W * .4, y + 10, W * .7, y + 30 + k * 6, wallR - 14, floorY - 80 + k * 4); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalAlpha = 1;
    }
    // smoke: soft blurred clouds
    lctx.clearRect(0, 0, W, H);
    const sp = smokeSprite(smoke);
    for (const p of parts) {
      const r = Math.min(46, (7 + p.age * 3.4) * (largeSmoke ? 1.35 : 1));
      lctx.globalAlpha = Math.max(0, .07 * Math.exp(-p.age / 12));
      lctx.drawImage(sp, p.x - r, p.y - r, 2 * r, 2 * r);
    }
    lctx.globalAlpha = 1;
    ctx.filter = "blur(2.5px)"; ctx.drawImage(layer, 0, 0); ctx.filter = "none";
    ctx.restore();
    // shell
    rrect(ctx, wallL, ceilY, wallR - wallL, floorY - ceilY, 22); ctx.strokeStyle = ink; ctx.lineWidth = 2.5; ctx.stroke();
    // vents
    ctx.fillStyle = surface; ctx.strokeStyle = ink; ctx.lineWidth = 1.5;
    rrect(ctx, wallL - 5, ceilY + 46, 10, 64, 3); ctx.fill(); ctx.stroke();
    rrect(ctx, wallR - 5, floorY - 112, 10, 64, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = muted; ctx.font = lf(500);
    ctx.textAlign = "left"; ctx.fillText("Air supply", wallL + 14, ceilY + 82);
    ctx.textAlign = "right"; ctx.fillText("Air return", wallR - 14, floorY - 76);
    // detector
    const dx = det.x - det.w / 2;
    rrect(ctx, dx, ceilY - 2, det.w, 14, 4); ctx.fillStyle = surface; ctx.fill(); ctx.strokeStyle = ink; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(det.x, ceilY + 5, 3.5, 0, 6.283); ctx.fillStyle = reached ? alert : rule; ctx.fill();
    if (reached) { ctx.beginPath(); ctx.arc(det.x, ceilY + 5, 9 + 3 * Math.sin(tclock * 6), 0, 6.283); ctx.strokeStyle = alert; ctx.globalAlpha = .35; ctx.stroke(); ctx.globalAlpha = 1; }
    ctx.fillStyle = muted; ctx.font = lf(500); ctx.textAlign = "center"; ctx.fillText("Smoke detector", det.x, ceilY - 10);
    // heat source with glow
    const fl = 1 + .08 * Math.sin(tclock * 11);
    const glow = ctx.createRadialGradient(src.x, floorY - 8, 0, src.x, floorY - 8, 34);
    glow.addColorStop(0, "rgba(255,140,40,.45)"); glow.addColorStop(1, "rgba(255,140,40,0)");
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(src.x, floorY - 8, 34, 0, 6.283); ctx.fill();
    const fg = ctx.createLinearGradient(0, floorY - 24 * fl, 0, floorY);
    fg.addColorStop(0, "#FFC24A"); fg.addColorStop(1, "#E2401B");
    ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(src.x - 8, floorY - 3); ctx.bezierCurveTo(src.x - 9, floorY - 14, src.x, floorY - 18 * fl, src.x, floorY - 24 * fl); ctx.bezierCurveTo(src.x, floorY - 18 * fl, src.x + 9, floorY - 14, src.x + 8, floorY - 3); ctx.closePath(); ctx.fill();
    rrect(ctx, src.x - 20, floorY - 4, 40, 7, 2); ctx.fillStyle = ink; ctx.fill();
    ctx.fillStyle = muted; ctx.font = lf(500); ctx.textAlign = "center"; ctx.fillText("Overheating material", src.x, floorY + 30);
  }
  function loop(t: number) {
    const dt = Math.min(.05, (t - last) / 1000 || .016);
    last = t;
    step(dt);
    draw();
    frame = requestAnimationFrame(loop);
  }

  function stop() {
    cancelAnimationFrame(frame);
    frame = 0;
    last = 0;
  }

  function refresh() {
    stop();
    parts = [];
    detHits = 0;
    reached = false;
    onDetector(false);
    if (motion.matches) {
      for (let i = 0; i < 300; i++) step(1 / 30);
    }
    draw();
    if (!motion.matches && visible) frame = requestAnimationFrame(loop);
  }

  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let visible = false;
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) stop();
    else if (!motion.matches && !frame) frame = requestAnimationFrame(loop);
  });
  const resize = new ResizeObserver(draw);
  observer.observe(cvs);
  resize.observe(cvs);
  motion.addEventListener("change", refresh);
  refresh();
  return () => {
    stop();
    observer.disconnect();
    resize.disconnect();
    motion.removeEventListener("change", refresh);
  };
}
