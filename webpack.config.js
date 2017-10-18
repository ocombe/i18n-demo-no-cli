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
const customProperties = require('postcss-custom-properties');
const {NoEmitOnErrorsPlugin, SourceMapDevToolPlugin, NamedModulesPlugin} = require('webpack');
const {NamedLazyChunksWebpackPlugin, BaseHrefWebpackPlugin} = require('@angular/cli/plugins/webpack');
const {CommonsChunkPlugin} = require('webpack').optimize;
const {AngularCompilerPlugin, ExtractI18nPlugin} = require('@ngtools/webpack');
const ENV_CONFIG = require('./env.conf.json');

const nodeModules = path.join(process.cwd(), 'node_modules');
const realNodeModules = fs.realpathSync(nodeModules);
const genDirNodeModules = path.join(process.cwd(), 'src', '$$_gendir', 'node_modules');
const entryPoints = ["inline", "polyfills", "sw-register", "styles", "vendor", "main"];
const minimizeCss = false;
const baseHref = "";
const deployUrl = "";
const postcssPlugins = function() {
  // safe settings based on: https://github.com/ben-eb/cssnano/issues/358#issuecomment-283696193
  const importantCommentRe = /@preserve|@license|[@#]\s*source(?:Mapping)?URL|^!/i;
  const minimizeOptions = {
    autoprefixer: false,
    safe: true,
    mergeLonghand: false,
    discardComments: {remove: (comment) => !importantCommentRe.test(comment)}
  };
  return [
    postcssUrl({
      url: (URL) => {
        // Only convert root relative URLs, which CSS-Loader won't process into require().
        if(!URL.startsWith('/') || URL.startsWith('//')) {
          return URL;
        }
        if(deployUrl.match(/:\/\//)) {
          // If deployUrl contains a scheme, ignore baseHref use deployUrl as is.
          return `${deployUrl.replace(/\/$/, '')}${URL}`;
        }
        else if(baseHref.match(/:\/\//)) {
          // If baseHref contains a scheme, include it as is.
          return baseHref.replace(/\/$/, '') +
            `/${deployUrl}/${URL}`.replace(/\/\/+/g, '/');
        }
        else {
          // Join together base-href, deploy-url and the original URL.
          // Also dedupe multiple slashes into single ones.
          return `/${baseHref}/${deployUrl}/${URL}`.replace(/\/\/+/g, '/');
        }
      }
    }),
    autoprefixer(),
    customProperties({preserve: true})
  ].concat(minimizeCss ? [cssnano(minimizeOptions)] : []);
};

module.exports = function(env) {
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
          if(leftIndex > rightindex) {
            return 1;
          }
          else if(leftIndex < rightindex) {
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
      }),
      new AngularCompilerPlugin({
        "mainPath": "main.ts",
        "i18nInFile": env.locale && env.locale !== env.defaultLang ? `src/i18n/messages.${env.locale}.xlf` : null,
        "locale": env.locale || env.defaultLang,
        "platform": 0,
        "sourceMap": true,
        "exclude": [],
        "tsConfigPath": "src\\tsconfig.app.json",
        "compilerOptions": {},
        "skipCodeGeneration": !env.aot // skip == no aot
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

  if(env.extract) {
    config.plugins.push(new ExtractI18nPlugin({
      // fix for bug https://github.com/angular/angular/issues/19198 until it is merged into the main branch of the cli
      // we must use a specific config file to set the "outDir" option which overwrites the "genDir" option below
      "tsConfigPath": "src\\tsconfig.app.json",
      "exclude": [],
      "i18nFormat": env.i18nOutFormat,
      "locale": env.locale,
      "outFile": env.outFile,
      // this is ignored in Angular v5 until the bug explained above is fixed
      "genDir": env.outputPath
    }));
  }

  return config;
};
