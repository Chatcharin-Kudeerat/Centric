const fs = require('fs');
const path = require('path');
const del = require('del');
const gulp = require('gulp');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const TerserPlugin = require('terser-webpack-plugin');
const RUN_TIMESTAMP = Math.round(Date.now() / 1000);

const resolve = {
  extensions: ['.js'],
  modules: ['node_modules'],
  alias: {
    handlebars: 'handlebars/dist/handlebars.min.js',
    async: 'async/dist/async.min.js',
    jquery: 'jquery/dist/jquery.min.js',
    moment: 'moment/min/moment.min.js',
    lodash: 'lodash/lodash.min.js',
  }
};

const optimization = {
  minimize: true,
  minimizer: [
    new TerserPlugin({
      minify: TerserPlugin.uglifyJsMinify,
      parallel: true,
      terserOptions: {
        compress: true,
        ecma: 5,
        mangle: true,
        output: {
          comments: false,
          beautify: false
        }
      },
    })
  ]
};

const plugins = [
  new webpack.DefinePlugin({
    global: {}
  }),
  new webpack.LoaderOptionsPlugin({
    options: {
      handlebarsLoader: {}
    }
  }),
  new webpack.IgnorePlugin({
    resourceRegExp: /^\.\/locale$/,
    contextRegExp: /moment$/,
  }),
  // new require('webpack-bundle-analyzer').BundleAnalyzerPlugin()
];

const babelLoader = {
  test: /\.js$/,
  use: [{loader: 'babel-loader', options: {
    sourceType: 'unambiguous',
    ignore: [
      /\/core-js/,
    ],
    presets: [
      [
        '@babel/preset-env',
        {
          loose: false,
          debug: false,
          useBuiltIns: 'usage',
          corejs: 3,
          targets: {
            ie: '11'
          }
        }
    ]],
  }}],
};

const config = {
  publish: {
    dest: `./build`,
    src: []
  },
  esas: {
    dest: `./build`,
    config: {
      mode: 'production',
      entry: ['./publish/esas.js'],
      output: {
        filename: 'esas.js'
      },
      resolve: resolve,
      optimization: optimization,
      plugins: plugins,
      performance: {
        maxEntrypointSize: 1000000,
        maxAssetSize: 1000000
      }
    }
  },
  admin: {
    dest: './build',
    config: {
      entry: './publish/esas-admin.js',
      output: {
        filename: 'esas-admin.js'
      },
      resolve: resolve,
      optimization: optimization,
      plugins: plugins,
      performance: {
        maxEntrypointSize: 1000000,
        maxAssetSize: 1000000
      }
    }
  }
};


gulp.task('clean', () => {
  return new Promise((resolve, reject) => {
    try {
      del.sync('./build');
      resolve();
    } catch(e) {
      reject(e);
    }
  });
});

gulp.task('publish', function () {
  return new Promise(async (resolve, reject) => {
    try {
      for (const src of config.publish.src) {
        const dst = `${config.publish.dest}/${path.basename(src)}`;
        fs.mkdirSync(path.dirname(dst), { recursive: true });
        fs.copyFileSync(src, dst);
        fs.closeSync(fs.openSync(dst, 'a+'));
      }
      webpackStream(config.publish, webpack)
        .on('error', function(error) {
          this.emit('end');
        })
        .pipe(gulp.dest(config.publish.dest));
      resolve();
    } catch(e) {
      reject(e);
    }
  });
});

gulp.task('esas', gulp.series((done) => {
  return new Promise((resolve, reject) => {
    try {
      webpackStream(config.esas.config, webpack)
        .on('error', function(error) {
          this.emit('end');
        })
        .pipe(gulp.dest(config.esas.dest));
      resolve();
    } catch(e) {
      reject(e);
    }
  });
}));

gulp.task('admin', gulp.series((done) => {
  return new Promise((resolve, reject) => {
    try {
      webpackStream(config.admin.config, webpack)
        .on('error', function(error) {
          this.emit('end');
        })
        .pipe(gulp.dest(config.admin.dest));
      resolve();
    } catch(e) {
      reject(e);
    }
  });
}));
