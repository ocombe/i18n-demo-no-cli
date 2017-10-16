import {LOCALE_ID, StaticProvider, TRANSLATIONS, TRANSLATIONS_FORMAT} from "@angular/core";

export function getTranslationProviders(isAot: boolean, locale = ENV.defaultLang): Promise<StaticProvider[]> {
  const PROVIDERS = [];

  document.querySelector('html').lang = locale;

  // Providers are automatically setup by the AngularCompilerPlugin for AOT
  if(isAot || locale === ENV.defaultLang) {
    return Promise.resolve(PROVIDERS);
  }

  return getTranslationsWithSystemJs(locale)
    .then((translations: string) => [
      {provide: TRANSLATIONS, useValue: translations},
      {provide: TRANSLATIONS_FORMAT, useValue: 'xlf'},
      ...PROVIDERS
    ])
    .catch(() => {
      throw  new Error(`Unable to load translations for locale ${locale}, please check that the file src/i18n/messages.${locale}.xlf exists`);
    });
}

function getTranslationsWithSystemJs(locale: string) {
  return System.import(`raw-loader!./i18n/messages.${locale}.xlf`); // relies on webpack raw loader
}
