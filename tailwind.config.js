/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: "class",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // === Design Tokens: Dark & Purple Fintech Theme (Triadic Harmony) ===
        // Backgrounds
        "bg-primary": "#05050A",     // Preto obsidiana profundo
        "bg-card": "#090d16",        // Superfície de cards no Dark Mode
        "bg-surface": "#131129",     // Superfícies elevadas com tom violeta escuro
        // Accents (Tríade Harmônica: Violeta + Esmeralda + Coral Quente)
        "accent-purple": "#7c3aed",  // violet-600: ações primárias e marca
        "accent-violet": "#a78bfa",  // violet-400: destaques e ícones no dark
        "accent-coral": "#fb923c",   // orange-400: saídas / despesas (combina com roxo sem vibrar)
        "accent-emerald": "#10b981", // emerald-500: receitas / positivo
        // Text
        "text-primary": "#f1f5f9",   // slate-100
        "text-secondary": "#94a3b8", // slate-400
        "text-muted": "#475569",     // slate-600
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"],
      },
    },
  },
  plugins: [],
};
