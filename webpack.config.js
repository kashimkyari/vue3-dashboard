module.exports = (env, argv) => {
  const mode = argv.mode || "development";

  const config = {
    entry: "./src/index.js",
    output: {
      path: `${__dirname}/lib`,
      filename: "index.js",
      library: "my-library",
      libraryTarget: "umd",
    },
    module: {
      rules: [
        {
          test: /\.(js|jsx)$/,
          exclude: /node_modules/,
          use: ["babel-loader"],
        },
      ],
    },
    cache: false, // Disable webpack caching
    optimization: {
      removeAvailableModules: true,
      removeEmptyChunks: true,
      splitChunks: false, // Disable code splitting/caching
    },
    devtool: mode === "development" ? "cheap-module-eval-source-map" : false,
  };
  return config;
};
