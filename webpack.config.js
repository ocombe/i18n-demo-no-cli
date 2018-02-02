const fs = require('fs');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const ProgressPlugin = require('webpack/lib/ProgressPlugin');
const DefinePlugin = require('webpack/lib/DefinePlugin');
const CircularDependencyPlugin = require('circular-dependency-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const autoprefixer = require('autoprefixer');
const postcssUrl = require('postcss-url');
const cssnano = require('cssnano');
const postcssImports = require('postcss-import');
const {NoEmitOnErrorsPlugin, SourceMapDevToolPlugin, NamedModulesPlugin} = require('webpack');
const {NamedLazyChunksWebpackPlugin, BaseHrefWebpackPlugin} = require('@angular/cli/plugins/webpack');
const {CommonsChunkPlugin} = require('webpack').optimize;
const {AngularCompilerPlugin} = require('@ngtools/webpack');
const ENV_CONFIG = require('./env.conf.json');

const nodeModules = path.join(process.cwd(), 'node_modules');
const realNodeModules = fs.realpathSync(nodeModules);
const genDirNodeModules = path.join(process.cwd(), 'src', '$$_gendir', 'node_modules');
const entryPoints = ["inline", "polyfills", "sw-register", "styles", "vendor", "main"];
const minimizeCss = false;
const baseHref = "";
const deployUrl = "";
const postcssPlugins = function (loader) {
  // safe settings based on: https://github.com/ben-eb/cssnano/issues/358#issuecomment-283696193
  const importantCommentRe = /@preserve|@licen[cs]e|[@#]\s*source(?:Mapping)?URL|^!/i;
  const minimizeOptions = {
    autoprefixer: false,
    safe: true,
    mergeLonghand: false,
    discardComments: {remove: (comment) => !importantCommentRe.test(comment)}
  };
  return [
    postcssImports({
      resolve: (url, context) => {
        return new Promise((resolve, reject) => {
          loader.resolve(context, url, (err, result) => {
            if (err) {
              reject(err);
              return;
            }
            resolve(result);
          });
        });
      },
      load: (filename) => {
        return new Promise((resolve, reject) => {
          loader.fs.readFile(filename, (err, data) => {
            if (err) {
              reject(err);
              return;
            }
            const content = data.toString();
            resolve(content);
          });
        });
      }
    }),
    postcssUrl({
      filter: ({url}) => url.startsWith('~'),
      url: ({url}) => {
        const fullPath = path.join(projectRoot, 'node_modules', url.substr(1));
        return path.relative(loader.context, fullPath).replace(/\\/g, '/');
      }
    }),
    postcssUrl([
      {
        // Only convert root relative URLs, which CSS-Loader won't process into require().
        filter: ({url}) => url.startsWith('/') && !url.startsWith('//'),
        url: ({url}) => {
          if (deployUrl.match(/:\/\//) || deployUrl.startsWith('/')) {
            // If deployUrl is absolute or root relative, ignore baseHref & use deployUrl as is.
            return `${deployUrl.replace(/\/$/, '')}${url}`;
          }
          else if (baseHref.match(/:\/\//)) {
            // If baseHref contains a scheme, include it as is.
            return baseHref.replace(/\/$/, '') +
              `/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
          }
          else {
            // Join together base-href, deploy-url and the original URL.
            // Also dedupe multiple slashes into single ones.
            return `/${baseHref}/${deployUrl}/${url}`.replace(/\/\/+/g, '/');
          }
        }
      },
      {
        // TODO: inline .cur if not supporting IE (use browserslist to check)
        filter: (asset) => !asset.hash && !asset.absolutePath.endsWith('.cur'),
        url: 'inline',
        // NOTE: maxSize is in KB
        maxSize: 10
      }
    ]),
    autoprefixer(),
  ].concat(minimizeCss ? [cssnano(minimizeOptions)] : []);
};

module.exports = function (env) {
  env = Object.assign({}, ENV_CONFIG, env);

  const config = {
    "resolve": {
      "extensions": [
        ".ts",
        ".js"
      ],
      "modules": [
        "./node_modules",
        "./node_modules"
      ],
      "symlinks": true,
      "mainFields": [
        "browser",
        "module",
        "main"
      ]
    },
    "resolveLoader": {
      "modules": [
        "./node_modules",
        "./node_modules"
      ]
    },
    "entry": {
      "main": [
        "./src\\main.ts"
      ],
      "polyfills": [
        "./src\\polyfills.ts"
      ],
      "styles": [
        "./src\\styles.css"
      ]
    },
    "output": {
      "path": path.join(process.cwd(), "dist"),
      "filename": "[name].bundle.js",
      "chunkFilename": "[id].chunk.js",
      "crossOriginLoading": false
    },
    "module": {
      "rules": [
        {
          "test": /\.html$/,
          "loader": "raw-loader"
        },
        {
          "test": /\.(eot|svg|cur)$/,
          "loader": "file-loader?name=[name].[hash:20].[ext]"
        },
        {
          "test": /\.(jpg|png|webp|gif|otf|ttf|woff|woff2|ani)$/,
          "loader": "url-loader?name=[name].[hash:20].[ext]&limit=10000"
        },
        {
          "exclude": [
            path.join(process.cwd(), "src\\styles.css")
          ],
          "test": /\.css$/,
          "use": [
            "exports-loader?module.exports.toString()",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            }
          ]
        },
        {
          "include": [
            path.join(process.cwd(), "src\\styles.css")
          ],
          "test": /\.css$/,
          "use": [
            "style-loader",
            {
              "loader": "css-loader",
              "options": {
                "sourceMap": false,
                "importLoaders": 1
              }
            },
            {
              "loader": "postcss-loader",
              "options": {
                "ident": "postcss",
                "plugins": postcssPlugins
              }
            }
          ]
        },
        {
          "test": /\.ts$/,
          "use": [
            "@ngtools/webpack"
          ]
        }
      ]
    },
    "plugins": [
      new NoEmitOnErrorsPlugin(),
      new CopyWebpackPlugin([
        {
          "context": "src",
          "to": "",
          "from": {
            "glob": "assets/**/*",
            "dot": true
          }
        },
        {
          "context": "src",
          "to": "",
          "from": {
            "glob": "favicon.ico",
            "dot": true
          }
        }
      ], {
        "ignore": [
          ".gitkeep"
        ],
        "debug": "warning"
      }),
      new ProgressPlugin(),
      new CircularDependencyPlugin({
        "exclude": /(\\|\/)node_modules(\\|\/)/,
        "failOnError": false
      }),
      new NamedLazyChunksWebpackPlugin(),
      new HtmlWebpackPlugin({
        "template": "./src\\index.html",
        "filename": "./index.html",
        "hash": false,
        "inject": true,
        "compile": true,
        "favicon": false,
        "minify": false,
        "cache": true,
        "showErrors": true,
        "chunks": "all",
        "excludeChunks": [],
        "title": "Webpack App",
        "xhtml": true,
        "chunksSortMode": function sort(left, right) {
          let leftIndex = entryPoints.indexOf(left.names[0]);
          let rightindex = entryPoints.indexOf(right.names[0]);
          if (leftIndex > rightindex) {
            return 1;
          }
          else if (leftIndex < rightindex) {
            return -1;
          }
          else {
            return 0;
          }
        }
      }),
      new BaseHrefWebpackPlugin({}),
      new CommonsChunkPlugin({
        "name": [
          "inline"
        ],
        "minChunks": null
      }),
      new CommonsChunkPlugin({
        "name": [
          "vendor"
        ],
        "minChunks": (module) => {
          return module.resource
            && (module.resource.startsWith(nodeModules)
              || module.resource.startsWith(genDirNodeModules)
              || module.resource.startsWith(realNodeModules));
        },
        "chunks": [
          "main"
        ]
      }),
      new SourceMapDevToolPlugin({
        "filename": "[file].map[query]",
        "moduleFilenameTemplate": "[resource-path]",
        "fallbackModuleFilenameTemplate": "[resource-path]?[hash]",
        "sourceRoot": "webpack:///"
      }),
      new CommonsChunkPlugin({
        "name": [
          "main"
        ],
        "minChunks": 2,
        "async": "common"
      }),
      new NamedModulesPlugin({}),
      // Define env variables to help with builds
      // Reference: https://webpack.js.org/plugins/define-plugin/#src/components/Sidebar/Sidebar.jsx
      new DefinePlugin({
        // define a global "ENV" variable that we can use in the app, it contains the --env option from the npm command
        'ENV': JSON.stringify(env)
      })
    ],
    "node": {
      "fs": "empty",
      "global": true,
      "crypto": "empty",
      "tls": "empty",
      "net": "empty",
      "process": true,
      "module": false,
      "clearImmediate": false,
      "setImmediate": false
    },
    "devServer": {
      "historyApiFallback": true
    }
  };

  if (env.extract) {
    function getI18nOutfile(format) {
      switch (format) {
        case 'xmb':
          return 'messages.xmb';
        case 'xlf':
        case 'xlif':
        case 'xliff':
        case 'xlf2':
        case 'xliff2':
          return 'messages.xlf';
        default:
          throw new Error(`Unsupported format "${format}"`);
      }
    }

    const outFormat = env.i18nOutFormat || 'xlf';
    let outFile = env.outFile || getI18nOutfile(outFormat);
    if(env.outputPath) {
      outFile = path.join(env.outputPath, outFile);
    }

    config.plugins.push(new AngularCompilerPlugin({
      "mainPath": "main.ts",
      "i18nOutFile": outFile,
      "i18nOutFormat": outFormat,
      "locale": env.locale,
      "platform": 0,
      "sourceMap": true,
      "exclude": [],
      "tsConfigPath": "src/tsconfig.app.json",
      "compilerOptions": {},
      "skipCodeGeneration": !env.aot // skip == no aot
    }));
  } else {
    config.plugins.push(new AngularCompilerPlugin({
      "mainPath": "main.ts",
      "i18nInFile": env.locale && env.locale !== env.defaultLang ? `src/i18n/messages.${env.locale}.xlf` : null,
      "locale": env.locale || env.defaultLang,
      "platform": 0,
      "sourceMap": true,
      "exclude": [],
      "tsConfigPath": "src/tsconfig.app.json",
      "compilerOptions": {},
      "skipCodeGeneration": !env.aot // skip == no aot
    }));
  }

  return config;
};
