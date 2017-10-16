import {enableProdMode, StaticProvider} from '@angular/core';
import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from './app/app.module';
import {getTranslationProviders} from "./i18n-providers";

if(ENV.prod) {
  enableProdMode();
}

getTranslationProviders(ENV.aot, ENV.locale).then((providers: StaticProvider[]) => {
  platformBrowserDynamic().bootstrapModule(AppModule, {providers});
});
