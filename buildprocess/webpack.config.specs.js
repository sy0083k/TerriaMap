/* eslint-disable no-undef */
/* eslint-disable @typescript-eslint/no-require-imports */

"use strict";

const configureWebpack = require("terriajs/buildprocess/configureWebpack");
const defaultBabelLoader = require("terriajs/buildprocess/defaultBabelLoader");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const fs = require("fs");
const path = require("path");

const terriaJSBasePath = path.dirname(require.resolve("terriajs/package.json"));
const terriaMapBasePath = path.resolve(__dirname, "..");

function collectSpecEntries(rootDir) {
  return fs.readdirSync(rootDir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(rootDir, entry.name);

    if (entry.isDirectory()) {
      return collectSpecEntries(entryPath);
    }

    return /Spec\.tsx?$/.test(entry.name) ? [entryPath] : [];
  });
}

// Collect spec entries: terriajs SpecMain bootstrap + all TerriaMap specs
const specEntries = [
  path.join(terriaJSBasePath, "test", "SpecMain.ts"),
  ...collectSpecEntries(path.join(terriaMapBasePath, "test"))
];

module.exports = function (devMode) {
  const babelLoader = defaultBabelLoader({ devMode });

  const baseConfig = {
    mode: devMode ? "development" : "production",
    entry: specEntries,
    output: {
      path: path.resolve(terriaMapBasePath, "wwwroot", "build"),
      filename: "TerriaMap-specs.js",
      publicPath: "build/"
    },
    devtool: devMode ? "eval-cheap-module-source-map" : "source-map",
    externals: {
      cheerio: "window",
      "react/addons": true,
      "react/lib/ExecutionEnvironment": true,
      "react/lib/ReactContext": true
    },
    resolve: {
      alias: {},
      modules: ["node_modules"]
    },
    plugins: [new MiniCssExtractPlugin({ ignoreOrder: true })],
    module: {
      rules: [
        // Transpile TerriaMap's own lib and test source with Babel
        {
          test: /\.(ts|js)x?$/,
          include: [
            path.resolve(terriaMapBasePath, "lib"),
            path.resolve(terriaMapBasePath, "test")
          ],
          use: [babelLoader]
        },
        // CSV/XML test fixtures from terriajs wwwroot
        {
          test: /\.(csv|xml)$/i,
          include: [path.resolve(terriaJSBasePath, "wwwroot", "test")],
          type: "asset/source"
        }
      ]
    }
  };

  return configureWebpack({
    terriaJSBasePath,
    config: baseConfig,
    devMode,
    MiniCssExtractPlugin,
    babelLoader
  });
};
