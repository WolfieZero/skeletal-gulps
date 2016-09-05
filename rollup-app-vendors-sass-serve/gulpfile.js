// =============================================================================
// Gulp
// =============================================================================
// Tasks:
// - `default`
// - `watch`
// - `app` - Compile app source files
// - `vendor` - Compile vendor files into one file
// - `sass` - Compiles SCSS to CSS


// Gulp Dependencies
// =============================================================================

const _ = require('lodash');
const gulp = require('gulp');
const csso = require('gulp-csso');
const sass = require('gulp-sass');
const gutil = require('gulp-util');
const buffer = require('vinyl-buffer');
const browserSync = require('browser-sync');
const source = require('vinyl-source-stream');
const sourcemaps = require('gulp-sourcemaps');
const autoprefixer = require('gulp-autoprefixer');


// Rollup Dependencies
// =============================================================================

const rollup = require('rollup-stream');
const html = require('rollup-plugin-html');
const buble = require('rollup-plugin-buble');
const replace = require('rollup-plugin-replace');
const commonjs = require('rollup-plugin-commonjs');
const nodeResolve = require('rollup-plugin-node-resolve');


// Setup local settings
// =============================================================================

let local = {};

try {
    gutil.log(gutil.colors.bgMagenta.bold(' === Local build === '));
    local = require('./.local');
} catch (e) {
    gutil.log(gutil.colors.bgMagenta.bold(' === Production build === '));
}


// Configs
// =============================================================================

const config = _.merge({
    sourcemaps: true,

    sassSource: './resources/assets/sass',
    appSource: './resources/assets/app',
    jsSource: './resources/assets/js',

    /**
     * @see  https://www.browsersync.io/docs/options
     */
    browsersync: {
        open: false,
        notify: false,
        snippetOptions: {
            rule: {
                match: /<\/body>/i,
                fn: (snippet, match) => snippet + match
            }
        }
    },

    /**
     * @see  https://github.com/ai/browserslist#queries
     */
    supportedBrowsers: [
        'iOS 9',
        'ie >= 10',
        'last 2 Chrome versions'
    ]
}, local);


// Functions
// =============================================================================

/**
 * Show errors in a prettier way.
 * @param   {Object}  error
 * @return  {void}
 */
const onError = function(error) {
    gutil.log(gutil.colors.bgRed.bold('  ERROR ') + ' ' + gutil.colors.red.bold(error.message));
    this.emit('end');
};


// Task: `default`
// =============================================================================

gulp.task('default', ['app', 'vendors', 'sass']);


// Task: `watch` - Watch and process
// =============================================================================

gulp.task('watch', ['default'], () => {
    _([
        {
            watch: [config.sassSource + '/**/*.scss'],
            run: ['sass']
        },
        {
            watch: [config.appSource + '/**/*.js', config.appSource + '/**/*.html'],
            run: ['app']
        },
        {
            watch: [config.jsSource + '/**/*.js'],
            run: ['vendors']
        }
    ]).forEach((task) => {
        gulp.watch(task.watch, task.run);
    });

    gulp.watch([
        './public/js/app.js',
        './public/js/vendors.js',
        './public/css/app.css'
    ]).on('change', browserSync.reload);
});


// Task: `serve` - Setup browser-sync
// =============================================================================

gulp.task('serve', ['watch'], () => {
    browserSync.init(config.browsersync)
});


// Task: `app` - Compile app source files
// =============================================================================

gulp.task('app', () => {
    let file = 'app.js';

    let rollupOptions = {
        entry: config.appSource + '/' + file,
        format: 'iife',
        moduleName: file,
        sourceMap: config.sourcemaps,
        plugins: [
            html({
                include: config.appSource + '/**/*.html',
                htmlMinifierOptions: {
                    collapseWhitespace: true,
                    collapseBooleanAttributes: true,
                    conservativeCollapse: true
                }
            }),
            replace({
                ENV_LOCAL: JSON.stringify(local),
                exclude: './node_modules/**'
            }),
            nodeResolve({
                browser: true
            }),
            buble()
        ]
    };

    return rollup(rollupOptions)
        .on('error', onError)
        .pipe(source(file))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./public/js'))
});


// Task: `vendors` - Compile vendor files into one file
// =============================================================================

gulp.task('vendors', () => {
    let file = 'vendors.js';

    let rollupOptions = {
        entry: config.jsSource + '/' + file,
        format: 'iife',
        moduleName: file,
        sourceMap: config.sourcemaps,
        plugins: [
            nodeResolve({
                browser: true,
                preferBuiltins: false
            }),
            commonjs({
                include: [
                    'node_modules/**',
                    config.jsSource + '/**'
                ],
                sourceMap: config.sourcemaps
            }),
            buble()
        ]
    };

    return rollup(rollupOptions)
        .on('error', onError)
        .pipe(source(file))
        .pipe(buffer())
        .pipe(sourcemaps.init())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest('./public/js'))
});


// Task: `sass` - Compiles SCSS to CSS
// =============================================================================

gulp.task('sass', () => {

    /**
     * @see  https://github.com/sindresorhus/gulp-autoprefixer#api
     */
    let autoprefixerOptions = {
        browsers: config.supportedBrowsers
    };

    /**
     * @see  https://github.com/ben-eb/gulp-csso#api
     */
    let cssoOptions = {
        restructure: false
    };

    /**
     * @see  https://github.com/sass/node-sass#options
     */
    let sassOptions = {
        includePaths: [
            'node_modules'
        ],
        outputStyle: 'compressed',
        precision: '2'
    };

    return gulp.src(config.sassSource + '/**/*.scss')
        .pipe(sourcemaps.init())
        .pipe(sass(sassOptions))
            .on('error', onError)
        .pipe(autoprefixer(autoprefixerOptions))
            .on('error', onError)
        .pipe(csso(cssoOptions))
            .on('error', onError)
        .pipe(sourcemaps.write('./'))
        .pipe(gulp.dest('./public/css'));

});
