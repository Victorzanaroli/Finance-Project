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
        // === Design Tokens: Dark Finance Theme ===
        // Backgrounds
        "bg-primary": "#020617",    // slate-950: fundo principal
        "bg-card": "#0f172a",       // slate-900: cards e painéis
        "bg-surface": "#1e293b",    // slate-800: superfícies elevadas
        // Accents
        "accent-purple": "#7c3aed", // purple-600: ações primárias
        "accent-cyan": "#22d3ee",   // cyan-400: destaques e saldos positivos
        "accent-rose": "#f43f5e",   // rose-500: despesas / negativo
        "accent-emerald": "#10b981", // emerald-500: receitas / positivo
        // Text
        "text-primary": "#f1f5f9",  // slate-100
        "text-secondary": "#94a3b8", // slate-400
        "text-muted": "#475569",    // slate-600
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
