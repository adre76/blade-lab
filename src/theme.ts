// ─── TEMA BLADE X LAB ────────────────────────────────────────────────────────
// Paleta centralizada — importar de qualquer componente sem risco de import circular
export const T = {
  bgPage:        "#0b0e14",
  bgApp:         "#11151f",
  bgCard:        "#171c28",
  bgCardHover:   "#1e2433",
  bgHeader:      "#0b0e14",
  bgNav:         "#11151f",
  bgInput:       "#1e2433",

  accent:        "#00d4ff",   // ciano — ação primária, energia
  accentDim:     "#0891b2",
  accentWarm:    "#ff6b35",   // laranja — destaque e alerta de posse

  typeAttack:    "#ff4757",
  typeDefense:   "#3742fa",
  typeStamina:   "#2ed573",
  typeBalance:   "#ffa502",

  textPrimary:   "#e8ecf1",
  textSecondary: "#9aa5b8",
  textMuted:     "#5c6780",
  textOnAccent:  "#0b0e14",

  border:        "#252c3d",
  borderStrong:  "#354055",

  ok:            "#2ed573",
  warn:          "#ffa502",
  danger:        "#ff4757",
} as const;

export type ThemeColor = keyof typeof T;
