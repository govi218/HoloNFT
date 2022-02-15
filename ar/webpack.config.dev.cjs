const path = require('path');

module.exports = {
  entry: {
    'mindar-latlong': './ar/latlong-target/index.js',
    'mindar-latlong-aframe': './ar/latlong-target/aframe.js',
    'mindar-latlong-three': './ar/latlong-target/three.js'
  },
  mode: 'development',
  devtool: 'inline-source-map',
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, '../public/javascripts/dist-dev'),
    publicPath: ''
  },
  module: {
    rules: [
      {
        test: /\.worker\.js$/,
        use: {
          loader: 'worker-loader',
          options: {
            inline: true,
            name: '[name].js'
          },
        },
      },
      {
        test: /\.s[ac]ss$/i,
        use: [
          'style-loader',
          'css-loader',
          'sass-loader'
        ]
      },
      {
        test: /\.html$/i,
        use: 'html-loader',
      },
    ],
  },
  resolve: {
    fallback: {
      fs: false,
      path: false,
      crypto: false
    }
  }
};
