import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import HttpApi from 'i18next-http-backend';
import { getSupportedLanguages } from './utils/languageUtils';
import budgetAppRuOverrides from './i18n/budgetAppRuOverrides';

const applyBudgetAppRuOverrides = () => {
  i18n.addResourceBundle('ru', 'translation', budgetAppRuOverrides, true, true);
};

i18n
  .use(HttpApi)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    supportedLngs: getSupportedLanguages(),
    fallbackLng: 'ru',
    detection: {
      order: ['localStorage', 'querystring', 'cookie', 'sessionStorage'],
      caches: ['localStorage', 'cookie'],
      lookupLocalStorage: 'i18nextLng',
    },
    backend: {
      loadPath: '/locales/{{lng}}/{{ns}}.json',
    },
    react: {
      useSuspense: false,
    },
  })
  .then(applyBudgetAppRuOverrides);

i18n.on('loaded', applyBudgetAppRuOverrides);

export default i18n;
