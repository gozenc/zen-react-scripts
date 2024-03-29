const path = require("path");
const webpack = require("webpack");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const Dotenv = require("dotenv-webpack");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const InterpolateHtmlPlugin = require("@gozenc/interpolate-html-plugin");
const { existsSync, readFileSync } = require("fs");
const TsconfigPathsPlugin = require("tsconfig-paths-webpack-plugin");

const appPath = path.resolve("src", "index.tsx");
const tsConfigPath = path.resolve("tsconfig.json");
const preloadPath = path.resolve("src", "preload.js");

const tsConfig = existsSync(tsConfigPath)
  ? JSON.parse(removeTrailingComma(readFileSync(tsConfigPath, "utf8")))
  : undefined;

function removeTrailingComma(jsonString) {
  const fixedString = jsonString.replace(/,\s*([\]}])/g, "$1");
  return fixedString;
}

const entryPoints = existsSync(preloadPath)
  ? { preload: preloadPath, app: appPath }
  : { app: appPath };

module.exports = {
  entry: entryPoints,
  target: "browserslist",
  output: {
    path: path.resolve("build"),
    publicPath: "/",
  },
  resolve: {
    fallback: {
      dgram: false,
      fs: false,
      net: false,
      tls: false,
      child_process: false,
      __dirname: false,
    },
    modules: ["node_modules"],
    extensions: [
      ".web.ts",
      ".ts",
      ".web.tsx",
      ".tsx",
      ".web.js",
      ".js",
      ".web.jsx",
      ".jsx",
      ".json",
    ],
    plugins: [new TsconfigPathsPlugin()],
  },
  module: {
    rules: [
      {
        test: /\.(worker)\.ts$/,
        use: "worker-loader",
        exclude: /(node_modules|bower_components)/,
      },
      {
        test: /\.(ts|js)x?$/,
        exclude: /(node_modules|bower_components)/,
        include: tsConfig ? getTsRootPaths(tsConfig) : path.resolve("src"),
        use: {
          loader: "babel-loader",
          options: {
            exclude: [
              /node_modules[\\\/]core-js/,
              /node_modules[\\\/]webpack[\\\/]buildin/,
            ],
            presets: [
              "@babel/preset-env",
              "@babel/preset-react",
              "@babel/preset-typescript",
            ],
            plugins: ["@babel/plugin-transform-runtime"],
          },
        },
      },
      {
        test: /\.csv$/,
        loader: "csv-loader",
        options: {
          dynamicTyping: true,
          header: true,
          skipEmptyLines: true,
        },
      },
      {
        test: /\.(png|jpe?g|gif)$/i,
        type: "asset/resource",
      },
      {
        test: /\.(woff|woff2|ttf|eot|otf)$/i,
        type: "asset/resource",
        generator: {
          filename: `static/fonts/[name].${process.env["BUILD_HASH"]}[ext]`,
        },
      },
      {
        test: /\.svg$/,
        type: "asset/resource",
        use: "svgo-loader",
      },
    ],
  },
  plugins: [
    new Dotenv(),
    // new webpack.ProgressPlugin(),
    new HtmlWebpackPlugin({
      template: path.resolve("public", "index.html"),
      minify: false,
    }),
    new InterpolateHtmlPlugin(HtmlWebpackPlugin, { VALUE: null }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: "./public",
          to: "./",
          globOptions: {
            ignore: ["**/*.html"],
          },
        },
      ],
    }),
    new webpack.IgnorePlugin({
      resourceRegExp: /^\.\/locale$/,
      contextRegExp: /moment$/,
    }),
    new WebpackManifestPlugin({
      fileName: "asset-manifest.json",
    }),
  ],
};

function getTsRootPaths(config) {
  const collectedPaths = [];
  if (config && config.compilerOptions && config.compilerOptions.rootDirs) {
    for (const rootDir of config.compilerOptions.rootDirs) {
      collectedPaths.push(path.resolve(rootDir));
    }
  }
  if (config && config.include && config.include) {
    for (const includePath of config.include) {
      collectedPaths.push(path.resolve(includePath));
    }
  }
  const nonDuplicates = [...new Set(collectedPaths)];
  return nonDuplicates;
}
