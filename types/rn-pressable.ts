import "react-native";

/**
 * react-native-web supplies `hovered` on Pressable state; core .d.ts may only list `pressed`.
 */
declare module "react-native" {
  export interface PressableStateCallbackType {
    readonly hovered?: boolean;
  }
}

export {};
