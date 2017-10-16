/* SystemJS module definition */
declare var module: NodeModule;
interface NodeModule {
  id: string;
}

declare var System: any;

interface ENV {
  defaultLang: string;
  locale?: string;
  aot?: boolean;
  prod?: boolean;
  extract?: boolean;
  i18nInFormat?: 'xlf'|'xlf2'|'xtb';
  i18nOutFormat?: 'xlf'|'xlf2'|'xmb';
  i18nFile?: string;
  outFile?: string;
  outputPath?: string;
}

declare const ENV: ENV;
