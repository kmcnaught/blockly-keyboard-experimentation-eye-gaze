/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

const path = require('path');
const webpack = require('webpack');

module.exports = {
  mode: 'development',
  entry: './index.ts',
  devtool: 'eval-source-map',
  output: {
    path: path.resolve(__dirname),
    filename: 'bundle.js',
    clean: false,
  },
  resolve: {
    extensions: ['.ts', '.js'],
    fallback: {
      'util': false,
    },
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname),
    },
    compress: true,
    port: 8082,
    open: true,
    hot: false, // Disable HMR to prevent re-initialization issues
    liveReload: false, // Disable live reload for stability
  },
};
