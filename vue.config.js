const { defineConfig } = require("@vue/cli-service");

module.exports = defineConfig({
  transpileDependencies: true,
  publicPath: "/", // Ensure assets are served from root, compatible with Vercel
  devServer: {
    proxy: {
      "/api": {
        target: "https://monitor-backend.jetcamstudio.com:5000",
        changeOrigin: true,
      },
    },
    hot: true,
    liveReload: true,
  },
  configureWebpack: {
    performance: {
      hints: false,
    },
    cache: false,
    optimization: {
      runtimeChunk: false,
      splitChunks: false,
      removeAvailableModules: true,
      removeEmptyChunks: true,
    },
  },
  css: {
    extract: false, // Disable CSS extraction
    sourceMap: true,
  },
  chainWebpack: (config) => {
    // Basic image handling without caching
    config.module
      .rule("images")
      .test(/\.(png|jpe?g|gif|webp)(\?.*)?$/)
      .use("file-loader")
      .loader("file-loader")
      .options({
        name: "img/[name].[ext]",
      });

    // Disable caching in production
    config.when(process.env.NODE_ENV === "production", (config) => {
      config.optimization.minimize(true);
      config.output.filename("[name].js");
    });

    // Clear cache groups
    config.optimization.splitChunks({
      cacheGroups: {},
    });
  },
});
