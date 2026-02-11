import { useFonts } from 'expo-font';

export function useCustomFonts() {
  const [fontsLoaded, fontError] = useFonts({
    Lora_400Regular: require('../../assets/fonts/Lora_400Regular.ttf'),
    Lora_500Medium: require('../../assets/fonts/Lora_500Medium.ttf'),
    Lora_600SemiBold: require('../../assets/fonts/Lora_600SemiBold.ttf'),
    Lora_700Bold: require('../../assets/fonts/Lora_700Bold.ttf')
  });

  if (fontError) {
    console.warn('[useCustomFonts] Font loading error:', fontError);
  }

  // Continue even if fonts fail to load (fallback to system fonts)
  return fontsLoaded || !!fontError;
}
