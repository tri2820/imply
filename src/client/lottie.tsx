// Initialize lottie player
// ---------

import { LottiePlayer } from "lottie-web";

// @ts-ignore
let lottie: LottiePlayer = undefined;
if (typeof window !== "undefined") {
  lottie = (await import("lottie-web")).default;
}

export { lottie };
