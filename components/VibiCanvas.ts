// The base implementation is native; Metro chooses .web for browser builds.
export { Canvas, useThree } from "@react-three/fiber/native";
export { prepareExpoGLContext as prepareVibiContext } from "../src/vibi/expoGL";
