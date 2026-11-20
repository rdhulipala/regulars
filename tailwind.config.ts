import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        blue: { 600: "#2340ff" },
        hot: "#e8480f",
        ok: "#0c7a54"
      }
    }
  },
  plugins: []
};
export default config;
