import { Colors, type ColorScheme, type ThemeColorPalette } from "@/constants/theme";
import { useColorScheme } from "./use-color-scheme";

/**
 * Returns the current theme's color palette.
 * Usage: const colors = useColors(); then colors.text, colors.background, etc.
 */
export function useColors(colorSchemeOverride?: ColorScheme): ThemeColorPalette {
  // التطبيق أداة عمل يومية؛ الواجهة الفاتحة أوضح للحقول والملفات ولا تتبدل
  // تلقائيًا إلى الوضع الداكن بحسب إعداد جهاز المستخدم.
  const colorSchema = useColorScheme();
  void colorSchema;
  const scheme = (colorSchemeOverride ?? "light") as ColorScheme;
  return Colors[scheme];
}
