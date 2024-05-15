/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const MultiTsconfigPathsWebpackPlugin = require('../dist/lib/index').default;

module.exports = {
  mode: 'development',
  entry: './src/index.ts',
  output: {
    path: path.resolve(__dirname, 'build'),
    filename: 'build/[name].js',
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        use: { loader: 'swc-loader' },
      },
    ],
  },
  resolve: {
    extensions: ['.js', '.ts'],
    plugins: [
      new MultiTsconfigPathsWebpackPlugin({
        glob: './**/tsconfig.json', // optional
      }),
    ],
  },
  plugins: [
    new HtmlWebpackPlugin(),
  ],
  devServer: {
    host: '0.0.0.0',
    port: 3000,
  },
};
