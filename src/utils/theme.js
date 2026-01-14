export const THEME_KEY = "theme"; // "dark" | "light"

export function getInitialTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === "dark" || saved === "light") return saved;

  // 기존 앱이 다크 기반이므로 기본값은 dark
  return "light";

}

export function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

export function persistTheme(theme) {
  localStorage.setItem(THEME_KEY, theme);
}
