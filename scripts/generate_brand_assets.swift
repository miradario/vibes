import AppKit
import Foundation

let fileManager = FileManager.default
let root = URL(fileURLWithPath: fileManager.currentDirectoryPath)
let assetsDir = root.appendingPathComponent("assets", isDirectory: true)

let dark = NSColor(calibratedRed: 0.20, green: 0.24, blue: 0.29, alpha: 1.0)
let aqua = NSColor(calibratedRed: 0.78, green: 0.92, blue: 0.92, alpha: 1.0)
let aquaLine = NSColor(calibratedRed: 0.66, green: 0.87, blue: 0.87, alpha: 1.0)
let orange = NSColor(calibratedRed: 0.98, green: 0.69, blue: 0.34, alpha: 1.0)
let peach = NSColor(calibratedRed: 0.99, green: 0.91, blue: 0.84, alpha: 1.0)
let white = NSColor(calibratedRed: 0.9647, green: 0.9647, blue: 0.9569, alpha: 1.0)

func makeBitmap(size: CGSize) -> NSBitmapImageRep {
  guard let rep = NSBitmapImageRep(
    bitmapDataPlanes: nil,
    pixelsWide: Int(size.width),
    pixelsHigh: Int(size.height),
    bitsPerSample: 8,
    samplesPerPixel: 4,
    hasAlpha: true,
    isPlanar: false,
    colorSpaceName: .deviceRGB,
    bytesPerRow: 0,
    bitsPerPixel: 0
  ) else {
    fatalError("Could not create bitmap")
  }

  rep.size = size
  return rep
}

func savePNG(_ rep: NSBitmapImageRep, to url: URL) throws {
  guard let data = rep.representation(using: .png, properties: [:]) else {
    throw NSError(domain: "BrandAssets", code: 1, userInfo: [NSLocalizedDescriptionKey: "PNG export failed"])
  }
  try data.write(to: url)
}

func drawCircle(_ center: CGPoint, radius: CGFloat, color: NSColor) {
  color.setFill()
  NSBezierPath(ovalIn: CGRect(x: center.x - radius, y: center.y - radius, width: radius * 2, height: radius * 2)).fill()
}

func strokePath(_ configure: (NSBezierPath) -> Void, color: NSColor, lineWidth: CGFloat, lineCap: NSBezierPath.LineCapStyle = .round) {
  let path = NSBezierPath()
  path.lineWidth = lineWidth
  path.lineCapStyle = lineCap
  configure(path)
  color.setStroke()
  path.stroke()
}

func fillPath(_ configure: (NSBezierPath) -> Void, color: NSColor) {
  let path = NSBezierPath()
  configure(path)
  color.setFill()
  path.fill()
}

func drawBlob(rect: CGRect, color: NSColor, alpha: CGFloat, rotationDegrees: CGFloat = 0, outline: Bool = false) {
  let transform = NSAffineTransform()
  transform.translateX(by: rect.midX, yBy: rect.midY)
  transform.rotate(byDegrees: rotationDegrees)
  transform.translateX(by: -rect.midX, yBy: -rect.midY)

  let path = NSBezierPath(roundedRect: rect, xRadius: rect.width * 0.42, yRadius: rect.height * 0.42)
  path.transform(using: transform as AffineTransform)

  if outline {
    color.withAlphaComponent(alpha).setStroke()
    path.lineWidth = max(2, min(rect.width, rect.height) * 0.004)
    path.stroke()
  } else {
    color.withAlphaComponent(alpha).setFill()
    path.fill()
  }
}

func drawMeditationGlyph(center: CGPoint, scale: CGFloat, transparentHead: Bool = false) {
  let stroke = 8 * scale

  if !transparentHead {
    fillPath({ path in
      path.move(to: CGPoint(x: center.x, y: center.y + 120 * scale))
      path.curve(
        to: CGPoint(x: center.x - 28 * scale, y: center.y + 78 * scale),
        controlPoint1: CGPoint(x: center.x - 4 * scale, y: center.y + 112 * scale),
        controlPoint2: CGPoint(x: center.x - 28 * scale, y: center.y + 96 * scale)
      )
      path.curve(
        to: CGPoint(x: center.x, y: center.y + 30 * scale),
        controlPoint1: CGPoint(x: center.x - 28 * scale, y: center.y + 58 * scale),
        controlPoint2: CGPoint(x: center.x - 12 * scale, y: center.y + 38 * scale)
      )
      path.curve(
        to: CGPoint(x: center.x + 28 * scale, y: center.y + 78 * scale),
        controlPoint1: CGPoint(x: center.x + 12 * scale, y: center.y + 38 * scale),
        controlPoint2: CGPoint(x: center.x + 28 * scale, y: center.y + 58 * scale)
      )
      path.curve(
        to: CGPoint(x: center.x, y: center.y + 120 * scale),
        controlPoint1: CGPoint(x: center.x + 28 * scale, y: center.y + 96 * scale),
        controlPoint2: CGPoint(x: center.x + 4 * scale, y: center.y + 112 * scale)
      )
      path.close()
    }, color: aqua)
  }

  strokePath({ path in
    path.move(to: CGPoint(x: center.x - 30 * scale, y: center.y + 84 * scale))
    path.curve(
      to: CGPoint(x: center.x, y: center.y + 28 * scale),
      controlPoint1: CGPoint(x: center.x - 34 * scale, y: center.y + 60 * scale),
      controlPoint2: CGPoint(x: center.x - 12 * scale, y: center.y + 36 * scale)
    )
    path.curve(
      to: CGPoint(x: center.x + 30 * scale, y: center.y + 84 * scale),
      controlPoint1: CGPoint(x: center.x + 12 * scale, y: center.y + 36 * scale),
      controlPoint2: CGPoint(x: center.x + 34 * scale, y: center.y + 60 * scale)
    )
    path.move(to: CGPoint(x: center.x - 44 * scale, y: center.y - 10 * scale))
    path.curve(
      to: CGPoint(x: center.x, y: center.y - 76 * scale),
      controlPoint1: CGPoint(x: center.x - 52 * scale, y: center.y - 42 * scale),
      controlPoint2: CGPoint(x: center.x - 24 * scale, y: center.y - 76 * scale)
    )
    path.curve(
      to: CGPoint(x: center.x + 44 * scale, y: center.y - 10 * scale),
      controlPoint1: CGPoint(x: center.x + 24 * scale, y: center.y - 76 * scale),
      controlPoint2: CGPoint(x: center.x + 52 * scale, y: center.y - 42 * scale)
    )
    path.move(to: CGPoint(x: center.x - 96 * scale, y: center.y - 118 * scale))
    path.curve(
      to: CGPoint(x: center.x - 22 * scale, y: center.y - 130 * scale),
      controlPoint1: CGPoint(x: center.x - 104 * scale, y: center.y - 160 * scale),
      controlPoint2: CGPoint(x: center.x - 66 * scale, y: center.y - 142 * scale)
    )
    path.curve(
      to: CGPoint(x: center.x + 12 * scale, y: center.y - 122 * scale),
      controlPoint1: CGPoint(x: center.x - 8 * scale, y: center.y - 124 * scale),
      controlPoint2: CGPoint(x: center.x - 2 * scale, y: center.y - 112 * scale)
    )
    path.curve(
      to: CGPoint(x: center.x + 98 * scale, y: center.y - 118 * scale),
      controlPoint1: CGPoint(x: center.x + 52 * scale, y: center.y - 142 * scale),
      controlPoint2: CGPoint(x: center.x + 86 * scale, y: center.y - 164 * scale)
    )
  }, color: dark, lineWidth: stroke)

  drawCircle(CGPoint(x: center.x, y: center.y + 158 * scale), radius: 12 * scale, color: orange)
  drawCircle(CGPoint(x: center.x, y: center.y + 202 * scale), radius: 21 * scale, color: orange)
}

func drawAttributedText(_ text: String, rect: CGRect, fontSize: CGFloat, color: NSColor, weight: NSFont.Weight = .regular, kerning: CGFloat = 0, alignment: NSTextAlignment = .center) {
  let paragraph = NSMutableParagraphStyle()
  paragraph.alignment = alignment
  let font = NSFont.systemFont(ofSize: fontSize, weight: weight)
  let attrs: [NSAttributedString.Key: Any] = [
    .font: font,
    .foregroundColor: color,
    .kern: kerning,
    .paragraphStyle: paragraph
  ]
  let string = NSAttributedString(string: text, attributes: attrs)
  string.draw(in: rect)
}

func generateSplash() throws {
  let size = CGSize(width: 1242, height: 2688)
  let rep = makeBitmap(size: size)
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

  white.setFill()
  NSBezierPath(rect: CGRect(origin: .zero, size: size)).fill()

  drawBlob(rect: CGRect(x: 900, y: 2160, width: 420, height: 580), color: aqua, alpha: 0.26, rotationDegrees: 18)
  drawBlob(rect: CGRect(x: 1080, y: 1960, width: 220, height: 560), color: aquaLine, alpha: 0.7, rotationDegrees: -12, outline: true)
  drawBlob(rect: CGRect(x: -80, y: -140, width: 340, height: 420), color: peach, alpha: 0.65, rotationDegrees: 18)
  drawBlob(rect: CGRect(x: -30, y: 40, width: 320, height: 260), color: orange, alpha: 0.5, rotationDegrees: -20, outline: true)

  drawCircle(CGPoint(x: 940, y: 2230), radius: 17, color: orange)
  drawCircle(CGPoint(x: 985, y: 2198), radius: 9, color: orange)
  drawCircle(CGPoint(x: 915, y: 2172), radius: 7, color: orange)
  drawCircle(CGPoint(x: 890, y: 2266), radius: 10, color: orange)
  drawCircle(CGPoint(x: 912, y: 188), radius: 10, color: orange)

  strokePath({ path in
    path.appendArc(withCenter: CGPoint(x: 620, y: 236), radius: 58, startAngle: 18, endAngle: 316, clockwise: false)
  }, color: aquaLine, lineWidth: 5)
  drawCircle(CGPoint(x: 655, y: 186), radius: 9, color: orange)
  drawCircle(CGPoint(x: 268, y: 132), radius: 14, color: orange)

  drawMeditationGlyph(center: CGPoint(x: size.width / 2, y: size.height / 2 + 260), scale: 1.9)
  drawAttributedText("v i b e s", rect: CGRect(x: 0, y: 980, width: size.width, height: 120), fontSize: 88, color: dark, weight: .ultraLight, kerning: 24)
  drawAttributedText("CONECTA • RESPIRA • FLUYE", rect: CGRect(x: 0, y: 900, width: size.width, height: 60), fontSize: 34, color: aquaLine, weight: .medium, kerning: 6)

  NSGraphicsContext.restoreGraphicsState()
  try savePNG(rep, to: assetsDir.appendingPathComponent("splash.png"))
}

func generateIcon(size: CGFloat, filename: String, transparentBackground: Bool) throws {
  let rep = makeBitmap(size: CGSize(width: size, height: size))
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)

  if !transparentBackground {
    white.setFill()
    NSBezierPath(rect: CGRect(x: 0, y: 0, width: size, height: size)).fill()
  }

  if !transparentBackground {
    let shadow = NSShadow()
    shadow.shadowColor = NSColor.black.withAlphaComponent(0.08)
    shadow.shadowBlurRadius = size * 0.045
    shadow.shadowOffset = CGSize(width: 0, height: -size * 0.008)
    shadow.set()
    white.setFill()
    NSBezierPath(roundedRect: CGRect(x: size * 0.11, y: size * 0.11, width: size * 0.78, height: size * 0.78), xRadius: size * 0.16, yRadius: size * 0.16).fill()
  }

  let centerY = transparentBackground ? size * 0.5 : size * 0.53
  drawMeditationGlyph(center: CGPoint(x: size * 0.5, y: centerY), scale: size / 760, transparentHead: false)

  NSGraphicsContext.restoreGraphicsState()
  try savePNG(rep, to: assetsDir.appendingPathComponent(filename))
}

try generateSplash()
try generateIcon(size: 1024, filename: "icon.png", transparentBackground: false)
try generateIcon(size: 1024, filename: "favicon.png", transparentBackground: false)
try generateIcon(size: 1024, filename: "adaptive-icon.png", transparentBackground: true)

print("Brand assets generated.")
