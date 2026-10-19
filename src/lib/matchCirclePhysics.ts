export type MovingCircle = { x: number; y: number; vx: number; vy: number; radius: number };
export type CircleObstacle = { x: number; y: number; radius: number };

export function bounceOffPhoto(body: MovingCircle, photo: CircleObstacle): MovingCircle {
  const dx = body.x - photo.x;
  const dy = body.y - photo.y;
  const distance = Math.hypot(dx, dy);
  const clearance = body.radius + photo.radius + 5;
  if (distance >= clearance) return body;
  const nx = distance > 0.001 ? dx / distance : 0;
  const ny = distance > 0.001 ? dy / distance : -1;
  const approach = body.vx * nx + body.vy * ny;
  return {
    ...body, x: photo.x + nx * clearance, y: photo.y + ny * clearance,
    vx: approach < 0 ? body.vx - 2 * approach * nx : body.vx,
    vy: approach < 0 ? body.vy - 2 * approach * ny : body.vy,
  };
}
