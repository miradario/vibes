// Analytic ribbon shading: a transparent centre, a rounded cross-section,
// and moving folds. Colors are supplied by the Vibes theme.
export const VIBI_ORB_SHADER = `
uniform float size;
uniform float phase;
uniform float3 orange;
uniform float3 light;
uniform float3 dark;

half4 main(float2 position) {
  float2 p = (position / size - 0.5) * 2.0;
  float turn = phase * 0.5 - 0.35;
  float c = cos(turn);
  float s = sin(turn);
  p = float2(c * p.x - s * p.y, s * p.x + c * p.y);
  p.y /= 0.88 + 0.10 * sin(phase);
  float angle = atan(p.y, p.x);
  float radius = length(p);
  float fold = angle * 3.0 - phase;
  float centre = 0.56 + 0.055 * cos(fold);
  float thickness = 0.205 + 0.035 * sin(angle * 2.0 + phase);
  float edge = (radius - centre) / thickness;
  float coverage = 1.0 - smoothstep(0.975, 1.025, abs(edge));
  if (coverage < 0.001) return half4(0.0);

  float roundness = sqrt(max(0.0, 1.0 - edge * edge));
  float twist = 0.60 * sin(fold);
  float side = edge * cos(twist) - roundness * sin(twist);
  float front = roundness * cos(twist) + edge * sin(twist);
  float3 normal = normalize(float3(cos(angle) * side, sin(angle) * side, front));
  float3 lamp = normalize(float3(-0.55, -0.65, 1.0));
  float diffuse = max(0.0, dot(normal, lamp));
  float sheen = pow(max(0.0, dot(normal, normalize(float3(-0.35, -0.45, 1.5)))), 14.0);
  float innerShade = (1.0 - diffuse) * 0.27;
  float3 color = mix(orange, dark, innerShade);
  color = mix(color, light, diffuse * diffuse * 0.43 + sheen * 0.32);
  return half4(color * coverage, coverage);
}
`;
