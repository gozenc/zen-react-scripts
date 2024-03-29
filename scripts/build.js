#!/usr/bin/env node
const webpack = require('webpack');
const chalk = require("chalk");
const crypto = require("crypto");
const buildHash = crypto.randomBytes(3).toString("hex");
process.env["BUILD_HASH"] = process.argv.includes("--hash") ? buildHash : "[contenthash:6]";
process.env["NODE_ENV"] = "production";
const prodConfig = require("../config/webpack.prod");
const analyzeConfig = require("../config/webpack.analyze");
const prettyBytes = require('pretty-bytes');
const sizeThresholdWarn = 50000;
const sizeThresholdAlert = 220000;
const fg = require('fast-glob');
const { unlink } = require("fs/promises");

const isAnalyze = process.argv.includes("--analyze");

const compiler = webpack(isAnalyze ? analyzeConfig : prodConfig);

compiler.run(async (err, stats) => {
    console.log("compiler::exit");
    if (err) {
        console.log("compiler.err.stack");
        console.log(err.stack || err);
        if (err.details) {
            console.log("compiler.err.details");
            console.log(err);
            console.log(err.details);
        }
        process.exit(1);
    }
    const info = stats.toJson();
    if (stats.hasErrors()) {
        console.log("compiler.stats.hasErrors");
        info.errors.forEach(err => console.log(err.message));
        process.exit(1);
    }
    if (stats.hasWarnings()) {
        console.log("compiler.stats.hasWarnings");
        info.warnings.forEach(warning => console.log(warning.message));
    }
    // console.log(`Compiled modules are:`);
    // let modNum = 1
    // info.modules.forEach( (module, i) => {
    //     const sizeWithColor = module.size > byteWarnThreshold 
    //         ? chalk.red(prettyBytes(module.size)) 
    //         : chalk.green(prettyBytes(module.size));
    //     if (module.name.includes("webpack/runtime") ) {
    //         console.log()
    //     }
    //     if (module.name.endsWith("dules")) {
    //         symbol = "•"
    //     } else {
    //         symbol = modNum
    //         modNum++
    //     }
    //     const modulePath = module.name.includes("node_modules/css-loader/dist/cjs.js??ruleSet") ? "./src" + module.name.split("./src").pop() : module.name
    //     console.log(`[${symbol}]\t${sizeWithColor}\t${modulePath}`)
    // })
    console.log(`\nCompiled and ready to be deployed.`);
    const compiled = stats.compilation.getAssets().sort((a, b) => a.info.size - b.info.size);
    let totalSize = 0;
    compiled.forEach((asset, i) => {
        const sizeWithColor = chalk[
            asset.info.size > sizeThresholdAlert ? "red" : asset.info.size > sizeThresholdWarn ? "yellow" : "green"
        ](prettyBytes(asset.info.size));
        totalSize = asset.info.size + totalSize;
        // ? chalk.red(prettyBytes(asset.info.size))
        // : chalk.green(prettyBytes(asset.info.size));
        const assetPath = asset.name.includes("node_modules/css-loader/dist/cjs.js??ruleSet") ? asset.name.split("./src").pop() : asset.name;
        console.log(`[${i + 1}]\t${sizeWithColor}\t${assetPath}`);
    });
    const licenseFiles = await fg(['build/*LICENSE*', 'build/static/js/*LICENSE*', 'build/static/js/deps/*LICENSE*']);
    if (licenseFiles) {
        await Promise.all(licenseFiles.map(async f => await unlink(f)));
    }
    process.stdout.write(`\n`);
    process.stdout.write(`Total size ${prettyBytes(totalSize)}\n\n`);
});
