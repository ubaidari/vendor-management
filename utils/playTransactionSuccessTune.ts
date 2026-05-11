import { Platform, Vibration } from "react-native";
import { Asset } from "expo-asset";
import { createAudioPlayer, setAudioModeAsync, setIsAudioActiveAsync } from "expo-audio";

const SUCCESS_WAV = require("../assets/sounds/transaction-success.wav") as number;

/** Long enough for bundled success WAV; then release the native player. */
const PLAYER_RELEASE_MS = 2200;

const READY_TIMEOUT_MS = 5000;

let audioModeReady = false;

/** Buzz pattern when native audio is not available in this binary. */
const playFallbackBuzz = (): void => {
  if (Platform.OS === "web") {
    return;
  }
  try {
    Vibration.vibrate([0, 90, 45, 90, 45, 160]);
  } catch {
    // ignore
  }
};

/** `AudioPlayer` supports `addListener` at runtime; generated `.d.ts` omits it. */
type PlayerWithStatus = ReturnType<typeof createAudioPlayer> & {
  addListener(
    event: "playbackStatusUpdate",
    listener: (status: { isLoaded: boolean }) => void
  ): { remove(): void };
};

async function ensureSuccessSoundUri(): Promise<string> {
  const asset = Asset.fromModule(SUCCESS_WAV);
  if (!asset.downloaded) {
    await asset.downloadAsync();
  }
  const uri = asset.localUri ?? asset.uri;
  if (!uri) {
    throw new Error("Success sound asset has no URI");
  }
  return uri;
}

async function ensureAudioModeForAlerts(): Promise<void> {
  if (audioModeReady) {
    return;
  }
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync({
      playsInSilentMode: true,
      interruptionMode: "mixWithOthers",
      allowsRecording: false,
      shouldPlayInBackground: false,
      shouldRouteThroughEarpiece: false
    });
    audioModeReady = true;
  } catch {
    // Retry on next call
  }
}

function waitUntilPlayerReportsLoaded(
  player: ReturnType<typeof createAudioPlayer>,
  timeoutMs: number
): Promise<void> {
  const p = player as PlayerWithStatus;
  if (player.isLoaded) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let finished = false;
    const finish = (): void => {
      if (finished) {
        return;
      }
      finished = true;
      clearTimeout(timer);
      try {
        subscription.remove();
      } catch {
        // ignore
      }
      resolve();
    };

    const timer = setTimeout(finish, timeoutMs);
    const subscription = p.addListener("playbackStatusUpdate", (status) => {
      if (status.isLoaded) {
        finish();
      }
    });
  });
}

export async function configureAppAudioForAlerts(): Promise<void> {
  try {
    await setIsAudioActiveAsync(true);
  } catch {
    // ignore
  }
  await ensureAudioModeForAlerts();
}

/** ATM-style success: plays WAV via expo-audio; on failure, short vibration (native only). */
export async function playTransactionSuccessTune(): Promise<void> {
  try {
    await setIsAudioActiveAsync(true);
    await ensureAudioModeForAlerts();

    const uri = await ensureSuccessSoundUri();
    const player = createAudioPlayer({ uri, name: "transaction-success.wav" });
    player.muted = false;
    player.volume = 1;

    await waitUntilPlayerReportsLoaded(player, READY_TIMEOUT_MS);

    if (!player.isLoaded) {
      try {
        player.remove();
      } catch {
        // ignore
      }
      playFallbackBuzz();
      return;
    }

    player.play();
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // ignore
      }
    }, PLAYER_RELEASE_MS);
  } catch {
    playFallbackBuzz();
  }
}
