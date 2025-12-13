declare module 'react-native' {
  import * as React from 'react';

  export type ViewStyle = Record<string, any>;
  export type TextStyle = Record<string, any>;
  export type ImageStyle = Record<string, any>;

  export interface PressableStateCallbackType {
    pressed: boolean;
    hovered?: boolean;
    focused?: boolean;
  }

  export type StyleProp<T> = T | T[] | null | undefined;

  export interface TextInputProps {
    value?: string;
    onChangeText?: (text: string) => void;
    placeholder?: string;
    placeholderTextColor?: string;
    style?: StyleProp<TextStyle>;
    secureTextEntry?: boolean;
    keyboardType?: string;
    autoCapitalize?: string;
    autoCorrect?: boolean;
    multiline?: boolean;
    numberOfLines?: number;
    editable?: boolean;
    onFocus?: () => void;
    onBlur?: () => void;
    [key: string]: any;
  }

  export const View: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const Image: React.ComponentType<any>;
  export const StyleSheet: {
    create: <T extends Record<string, ViewStyle | TextStyle | ImageStyle>>(styles: T) => T;
    flatten: (style: any) => any;
  };
  export const TouchableOpacity: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const ScrollView: React.ComponentType<any>;
  export const Pressable: React.ComponentType<{
    style?: StyleProp<ViewStyle> | ((state: PressableStateCallbackType) => StyleProp<ViewStyle>);
    onPress?: (e?: any) => void;
    disabled?: boolean;
    children?: React.ReactNode;
    [key: string]: any;
  }>;
  export const ActivityIndicator: React.ComponentType<any>;
  export const Platform: {
    OS: 'ios' | 'android' | 'web' | 'windows' | 'macos';
    select: <T>(options: { [platform: string]: T }) => T;
  };
}
