import en from "./locales/en";
import es from "./locales/es";
import ko from "./locales/ko";
import zh from "./locales/zh";

export default defineI18nConfig(() => ({
  legacy: false,
  messages: {
    en,
    es,
    ko,
    zh,
  },
}));
