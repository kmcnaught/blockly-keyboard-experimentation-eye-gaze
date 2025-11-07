/**
 * @license
 * Copyright 2024 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

// Build configuration for minimal demo

const path = require('path');
const webpack = require('webpack');

const config = {
  mode: 'development',
  entry: './minimal-demo.ts',
  output: {
    filename: 'minimal_demo_bundle.js',
    path: path.resolve(__dirname, '../build'),
    clean: false, // Don't clean the entire build directory
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
    fallback: {
      'util': false,
    },
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('development'),
    }),
  ],
  devtool: 'eval-source-map',
};

module.exports = config;
