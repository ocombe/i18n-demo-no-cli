# Angular i18n demo with webpack

- Webpack and @ngtool packages, but no @angular/cli.
- Supports both JIT and AOT.

### How to use:
Update the file `env.conf.json` by setting:
- `defaultLang`: the lang of the application without translations
- `i18nInFormat`: the format of the translations file for serve/build
- `i18nOutFormat`: the format of the translations file for extraction
- `outFile`: the name of the file for extraction
- `outputPath`: the path where the translations file should be extracted (/!\ _there is a bug right now in the @ngtools with Angular v5 where the option `outDir` from the tsconfig will overwrite the outputPath. This should be resolved in the next rc of the cli, but right now you'll have to set the value of `outDir` in src/tsconfig.extract.json_)

Use the commands from package.json to serve/build the app: `npm run start` & `npm run start:fr` will use JIT, `npm run start:aot` and `npm run start:aot:fr` will use AOT.
Same thing for the build commands.

Extract the messages with the command `npm run extract`,
it will extract the messages to the src/i18n/ folder (unless you change the `env.conf.json` file)
and it will automatically merge the new messages into your existing translations using the [ngx-i18nsupport library](https://github.com/martinroob/ngx-i18nsupport).
Right now it supports the language fr, you can add more languages for the merge option in the file xliffmerge.conf.json (see the [ngx-i18nsupport repository](https://github.com/martinroob/ngx-i18nsupport) for more info).
