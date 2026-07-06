import en from "./locales/en";
import es from "./locales/es";
import zh from "./locales/zh";

export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
    en,
    es,
    zh,
  },
}));
