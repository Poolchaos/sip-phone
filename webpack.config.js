const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const DuplicatePackageCheckerPlugin = require('duplicate-package-checker-webpack-plugin');
const project = require('./aurelia_project/aurelia.json');
const { AureliaPlugin, ModuleDependenciesPlugin } = require('aurelia-webpack-plugin');
const { ProvidePlugin } = require('webpack');
const webpack = require('webpack');
const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
const UglifyJsPlugin = require('uglifyjs-webpack-plugin');
const GitRevisionPlugin = require('git-revision-webpack-plugin');

const gitRevisionPlugin = new GitRevisionPlugin();

const OptimizeCSSAssetsPlugin = require('optimize-css-assets-webpack-plugin');

// TODO: Gerard - for version
const packageFile = require('./package.json');

// config helpers:
const ensureArray = config => (config && (Array.isArray(config) ? config : [config])) || [];
const when = (condition, config, negativeConfig) => (condition ? ensureArray(config) : ensureArray(negativeConfig));

// primary config:
const title = 'ZaiCommunicator';
const outDir = path.resolve(__dirname, project.platform.output);
const srcDir = path.resolve(__dirname, 'src');
const nodeModulesDir = path.resolve(__dirname, 'node_modules');

const cssRules = [
  {
    loader: 'css-loader',
    options: {
      sourceMap: true,
    },
  },
];

module.exports = ({ production, server, extractCss, coverage, analyze, environment, beta } = {}) => {
  // TODO: Gerard - this is mainly for hmr. see if this work for updates
  const baseUrl = production ? '/' : 'http://localhost:8080/';

  return {
    resolve: {
      extensions: ['.ts', '.js'],
      modules: [srcDir, nodeModulesDir],
      // Enforce single aurelia-binding, to avoid v1/v2 duplication due to
      // out-of-date dependencies on 3rd party aurelia plugins
      alias: {
        'aurelia-binding': path.resolve(__dirname, 'node_modules/aurelia-binding'),
      },
    },
    entry: {
      app: ['aurelia-bootstrapper'],
      content_script1: [`${srcDir}/content-script1`], // use later for content scripts?
    },
    mode: production ? 'production' : 'development',
    output: {
      path: outDir,
      publicPath: baseUrl,
      filename: '[name].[hash].' + packageFile.version + '.js',
      sourceMapFilename: '[name].[hash].' + packageFile.version + '.map',
      chunkFilename: '[name].[hash].' + packageFile.version + '.js',
    },
    performance: { hints: false },
    devServer: {
      contentBase: outDir,
      // serve index.html for all 404 (required for push-state)
      historyApiFallback: true,
      disableHostCheck: true
    },
    devtool: production ? 'nosources-source-map' : 'cheap-module-eval-source-map',
    // devtool: production ? 'sourcemap' : 'cheap-module-eval-source-map',
    module: {
      rules: [
        // CSS required in JS/TS files should use the style-loader that auto-injects it into the website
        // only when the issuer is a .js/.ts file, so the loaders are not applied inside html templates
        {
          test: /\.css$/i,
          issuer: [{ not: [{ test: /\.html$/i }] }],
          use: extractCss
            ? [
                {
                  loader: MiniCssExtractPlugin.loader,
                },
                // 'css-loader'
                {
                  loader: 'css-loader',
                  options: {
                    sourceMap: true,
                  },
                },
              ]
            : ['style-loader', ...cssRules],
        },
        {
          test: /\.css$/i,
          issuer: [{ test: /\.html$/i }],
          // CSS required in templates cannot be extracted safely
          // because Aurelia would try to require it again in runtime
          use: cssRules,
        },
        {
          test: /\.less$/,
          use: ['style-loader', 'css-loader', 'less-loader'],
        },
        { test: /\.html$/i, loader: 'html-loader' },
        {
          test: /\.js$/,
          exclude: /(node_modules)/,
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,
            // .babelrc is for test environment only - ignore for builds
            // TODO: we can use a single babelrc file, but figure out how aurelia is setting environments (compared to env variables)
            babelrc: false,
            plugins: [
              ['@babel/plugin-proposal-decorators', { legacy: true }],
              ['@babel/plugin-proposal-class-properties', { loose: true }],
            ],
            presets: [
              [
                '@babel/preset-env',
                {
                  targets: {
                    // "node": "current",
                    browsers: ['last 2 versions'],
                  },
                  loose: true,
                  modules: false,
                },
              ],
            ],
          },
        },
        {
          test: /\.ts$/,
          loader: 'ts-loader',
          exclude: /node_modules/,
        },
        // { test: /\.[tj]s$/, loader: "ts-loader",  exclude: /node_modules/,  }, // TODO: Gerard
        // // use Bluebird as the global Promise implementation:
        { test: /[\/\\]node_modules[\/\\]bluebird[\/\\].+\.js$/, loader: 'expose-loader?Promise' },
        // embed small images and fonts as Data Urls and larger ones as files:
        {
          test: /\.(png|gif|jpg|cur)$/i,
          loader: 'url-loader',
          options: {
            limit: 8192,
            // name: 'images/[name].[hash].[ext]',
            name: 'images-new/[name].[ext]',
          },
        },
        {
          test: /\.woff2(\?v=[0-9]\.[0-9]\.[0-9])?$/i,
          loader: 'url-loader',
          options: {
            limit: 10000,
            mimetype: 'application/font-woff2',
            // name: 'fonts/woff2/[name].[hash].[ext]',
            name: 'assets/fonts/woff2/[name].[ext]',
          },
        },
        {
          test: /\.woff(\?v=[0-9]\.[0-9]\.[0-9])?$/i,
          loader: 'url-loader',
          options: {
            limit: 10000,
            mimetype: 'application/font-woff',
            // name: 'fonts/woff/[name].[hash].[ext]',
            name: 'assets/fonts/woff/[name].[ext]',
          },
        },
        // load these fonts normally, as files:
        {
          test: /\.(ttf|eot|otf)(\?v=[0-9]\.[0-9]\.[0-9])?$/i,
          loader: 'file-loader',
          options: production
            ? {
                // name: 'fonts/[name].[hash].[ext]',
              }
            : {
                name: 'fonts/[name].[ext]',
              },
        },
        {
          test: /\.(svg)(\?v=[0-9]\.[0-9]\.[0-9])?$/i,
          loader: 'file-loader',
          options: production
            ? {
                // name: 'svg/[name].[hash].[ext]',
              }
            : {
                name: 'svg/[name].[ext]',
              },
        },
        {
          test: /\.(ogg|mp3|wav|mpe?g)$/i,
          loader: 'file-loader',
          options: {
            name: 'sounds/[name].[ext]',
          },
        },
        ...when(coverage, {
          test: /\.[jt]s$/i,
          loader: 'istanbul-instrumenter-loader',
          include: srcDir,
          exclude: [/\.{spec,test}\.[jt]s$/i],
          enforce: 'post',
          options: { esModules: true },
        }),
      ],
    },
    plugins: [
      new AureliaPlugin(),
      // new ProvidePlugin({
      //   Promise: 'bluebird',
      // }),
      new ModuleDependenciesPlugin({
        'aurelia-testing': ['./compile-spy', './view-spy'],
      }),
      new HtmlWebpackPlugin({
        template: 'index.ejs',
        filename: 'content-script1.html',
        chunks: ['content_script1'],
        minify: production
          ? {
              removeComments: true,
              collapseWhitespace: true,
            }
          : undefined,
        metadata: {
          // available in index.ejs //
          title,
          server,
          baseUrl,
          version: packageFile.version,
        },
      }),
      new HtmlWebpackPlugin({
        template: 'index.ejs',
        chunks: ['app'],
        minify: production
          ? {
              removeComments: true,
              collapseWhitespace: true,
            }
          : undefined,
        metadata: {
          // available in index.ejs //
          title,
          server,
          baseUrl,
          version: packageFile.version,
        },
      }),
      new webpack.ExtendedAPIPlugin(),
      // ref: https://webpack.js.org/plugins/mini-css-extract-plugin/
      ...when(
        extractCss,
        new MiniCssExtractPlugin({
          // updated to match the naming conventions for the js files
          // filename: production ? 'css/[name].[contenthash].bundle.css' : 'css/[name].[hash].bundle.css',
          // chunkFilename: production ? 'css/[name].[contenthash].chunk.css' : 'css/[name].[hash].chunk.css',
          filename: '[name].css',
          chunkFilename: '[id].css',
        })
      ),
      // ...when(environment === "dev", new CopyWebpackPlugin([
      ...when(
        true,
        new CopyWebpackPlugin([
          {
            from: 'static/manifest.json',
            to: 'manifest.json',
            transform(content, path) {
              const manifestTemplate = JSON.parse(content.toString());

              // manifestTemplate.name = package.name;
              manifestTemplate.name = beta ? 'WP Beta' : 'ZaiCommunicator';
              manifestTemplate.version = packageFile.version;

              manifestTemplate.description = beta
                ? 'Under construction.'
                : 'The best way for your agents to make and receive calls through ZaiLab’s communications platform.';

              const icon = beta ? 'cone-128' : 'icon-128';
              manifestTemplate.icons['128'] = `images/${icon}.png`;

              manifestTemplate.content_security_policy = production
                ? "script-src 'self' 'unsafe-eval' https://ajax.googleapis.com https://api.rollbar.com ; object-src 'self'; "
                : "script-src 'self' 'unsafe-eval' http://localhost:8080 https://ajax.googleapis.com https://api.rollbar.com ; object-src 'self'; ";

              manifestTemplate.permissions = production
                ? ['activeTab', 'notifications', 'tabs', 'contextMenus']
                : ['activeTab', 'notifications', 'tabs', 'contextMenus', '*://localhost/*'];
              return JSON.stringify(manifestTemplate, null, 2);
            },
          },
        ])
      ),
      ...when(
        production || server,
        new CopyWebpackPlugin([
          { from: 'static', to: outDir, ignore: ['.*'] }, // ignore dot (hidden) files
        ])
      ),
      ...when(analyze, new BundleAnalyzerPlugin()),
      new webpack.DefinePlugin({
        __APP_NAME__: JSON.stringify(packageFile.name),
        __APP_VERSION__: JSON.stringify(packageFile.version),
        __APP_BUILD__: JSON.stringify(gitRevisionPlugin.commithash()),
        __APP_BETA__: JSON.stringify(!!beta),
        __DEV__: JSON.stringify(!production),
      }),
    ],
  };
};
