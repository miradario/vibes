import { bounceOffPhoto } from "../src/lib/matchCirclePhysics";
import React, { useEffect, useRef, useState } from "react";
import { Animated, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import { vibesTheme } from "../src/theme/vibesTheme";

type Props = { split: Animated.Value; drift: Animated.Value; top: number; animate: boolean; photoSize: number };

/** Two colored accents pause above the Vibes figure, then roam around the photos. */
export default function MatchConnectionLogo({ split, drift, top, animate, photoSize }: Props) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const logoRef = useRef<View>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const wander = useRef([new Animated.ValueXY(), new Animated.ValueXY()]).current;
  const sizes = useRef([new Animated.Value(1.5), new Animated.Value(1.8)]).current;
  useEffect(() => {
    let frame = 0;
    wander.forEach((value, index) => {
      value.setValue({ x: 0, y: 0 });
      sizes[index].setValue(index ? 1.8 : 1.5);
    });
    if (!animate || !origin) return;
    const centerX = origin.x + 13;
    const offset = (width - 40 - photoSize) / 2;
    const obstacles = [-1, 1].map(side => ({ x: centerX + side * offset, y: origin.y + 76, radius: photoSize / 2 }));
    let bodies = [0, 1].map(index => ({
      x: centerX, y: origin.y + 13 + (index ? 34 : 0),
      vx: index ? 30 : -35, vy: -48, radius: index ? 16 : 20,
      size: index ? 1.8 : 1.5, targetSize: 1.5, nextChange: 0,
    }));
    let last = 0;
    const tick = (now: number) => {
      const elapsed = last ? Math.min((now - last) / 1000, 0.032) : 0;
      last = now;
      bodies = bodies.map((body, index) => {
        if (now > body.nextChange) {
          body.targetSize = 1.3 + Math.random() * 1.1;
          body.nextChange = now + 2500 + Math.random() * 2500;
          // Small steering changes preserve momentum while avoiding a repeating route.
          const angle = (Math.random() - 0.5) * 0.7;
          const vx = body.vx * Math.cos(angle) - body.vy * Math.sin(angle);
          body.vy = body.vx * Math.sin(angle) + body.vy * Math.cos(angle);
          body.vx = vx;
        }
        body.size += (body.targetSize - body.size) * elapsed * 0.6;
        body.radius = 13 * body.size * (index ? 0.7 : 1);
        // Substeps prevent tunneling through the photo when frame delivery slows.
        for (let step = 0; step < 4; step++) {
          body.x += body.vx * elapsed / 4;
          body.y += body.vy * elapsed / 4;
          const minX = body.radius + 8, maxX = width - body.radius - 8;
          const minY = insets.top + body.radius + 8, maxY = height - insets.bottom - body.radius - 8;
          if (body.x < minX) { body.x = minX; body.vx = Math.abs(body.vx); }
          if (body.x > maxX) { body.x = maxX; body.vx = -Math.abs(body.vx); }
          if (body.y < minY) { body.y = minY; body.vy = Math.abs(body.vy); }
          if (body.y > maxY) { body.y = maxY; body.vy = -Math.abs(body.vy); }
          for (const photo of obstacles) body = { ...body, ...bounceOffPhoto(body, photo) };
        }
        wander[index].setValue({ x: body.x - centerX, y: body.y - origin.y - 13 - (index ? 34 : 0) });
        sizes[index].setValue(body.size);
        return body;
      });
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [animate, wander, sizes, origin, width, height, photoSize, insets.top, insets.bottom]);

  return (
    <View ref={logoRef} onLayout={() => logoRef.current?.measureInWindow((x, y) => {
      setOrigin(previous => previous?.x === x + 47 && previous?.y === y ? previous : { x: x + 47, y });
    })} pointerEvents="none" accessible={false} style={[styles.logo, { top }]}>
      {[0, 1].map(index => (
        <Animated.View key={index} style={[styles.circle, {
          transform: [
            { translateY: Animated.add(split.interpolate({ inputRange: [0, 1], outputRange: [index ? 34 : 0, index ? 34 : 0] }), wander[index].y) },
            { translateX: wander[index].x },
            { scale: Animated.multiply(split.interpolate({ inputRange: [0, 1], outputRange: [1, index ? 0.7 : 1] }), sizes[index]) },
          ],
          backgroundColor: index ? vibesTheme.colors.accentMustard : vibesTheme.colors.accentCoral,
        }]}>
        </Animated.View>
      ))}
      <Animated.View style={[styles.body, { transform: [
        { translateY: drift.interpolate({ inputRange: [0, 1], outputRange: [0, 5] }) },
        { translateX: drift.interpolate({ inputRange: [0, 1], outputRange: [0, -3] }) },
        { rotate: drift.interpolate({ inputRange: [0, 1], outputRange: ["-3deg", "3deg"] }) },
      ] }]}>
      <Svg width="120" height="116" viewBox="0 0 150 145">
        <Path d="M75 8 C68 18 53 29 53 42 C53 54 69 69 75 73 C81 69 97 54 97 42 C97 29 82 18 75 8Z" fill={vibesTheme.colors.accentBlue} />
      </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  logo: { position: "absolute", left: "50%", marginLeft: -60, width: 120, height: 174 },
  circle: { position: "absolute", left: 47, top: 0, width: 26, height: 26, borderRadius: 13, overflow: "hidden", opacity: 0.82 },
  body: { position: "absolute", top: 52, left: 0 },
});
