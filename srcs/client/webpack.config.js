module.exports = {
    mode: process.env.NODE_ENV === "production" ? "production" : "development",
    devtool: "inline-source-map",
    entry: "./src/index.tsx",
    output: {
      path: __dirname + "/build",
      filename: "bundle.js",
    },
    devServer: {
      static: "./client",
      port: 4545,
    },
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
    },
    module: {
      rules: [
        { test: /\.tsx?$/, exclude: /node_modules/, loader: "ts-loader" },
        { test: /\.js$/, use: ["source-map-loader"], enforce: "pre" },
        { test: /\.css$/, use: ["style-loader", "css-loader"] },
      ],
    },
    plugins: [],
  };