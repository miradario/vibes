export type BubbleBody = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
};

// Only the circular avatars collide; labels follow without affecting physics.
export function stepBubbles(
  bodies: BubbleBody[],
  width: number,
  height: number,
  elapsed: number
): BubbleBody[] {
  "worklet";
  const dt = Math.min(Math.max(elapsed, 0), 1 / 30);
  const next = bodies.map((body) => ({
    ...body,
    x: body.x + body.vx * dt,
    y: body.y + body.vy * dt,
  }));
  const clamp = (body: BubbleBody) => {
    "worklet";
    const maxX = Math.max(0, width - body.width),
      maxY = Math.max(0, height - body.height);
    if (body.x < 0) {
      body.x = 0;
      body.vx = Math.abs(body.vx);
    }
    if (body.x > maxX) {
      body.x = maxX;
      body.vx = -Math.abs(body.vx);
    }
    if (body.y < 0) {
      body.y = 0;
      body.vy = Math.abs(body.vy);
    }
    if (body.y > maxY) {
      body.y = maxY;
      body.vy = -Math.abs(body.vy);
    }
  };
  for (let pass = 0; pass < 10; pass++) {
    next.forEach(clamp);
    for (let i = 0; i < next.length; i++)
      for (let j = i + 1; j < next.length; j++) {
        const a = next[i],
          b = next[j];
        const dx = b.x + b.width / 2 - a.x - a.width / 2;
        const dy = b.y + b.height / 2 - a.y - a.height / 2;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const minDistance = (a.width + b.width) / 2 + 4;
        if (distance >= minDistance) continue;
        const nx = distance > 0 ? dx / distance : 1;
        const ny = distance > 0 ? dy / distance : 0;
        const correction = (minDistance - distance) / 2 + 0.01;
        a.x -= nx * correction;
        a.y -= ny * correction;
        b.x += nx * correction;
        b.y += ny * correction;
        const approach = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
        if (approach < 0) {
          a.vx += approach * nx;
          a.vy += approach * ny;
          b.vx -= approach * nx;
          b.vy -= approach * ny;
        }
      }
  }
  next.forEach(clamp);
  return next;
}
