'use strict';

const fs = require('fs');
const gulp = require('gulp');
const sass = require('gulp-sass')(require('sass'));
const concat = require('gulp-concat');
const rename = require("gulp-rename");
const minify = require('gulp-minify');
const clean = require('gulp-clean-css');
const inject = require('gulp-inject-string');

const postcss = require('gulp-postcss');
const autoprefixer = require('autoprefixer');
// const sourcemaps = require('gulp-sourcemaps');

const markdown = require('markdown-it')({
    linkify: true
});

const buildDate = new Date().getUTCFullYear();
const packageData = JSON.parse(fs.readFileSync(__dirname + '/package.json'));

function commentData(glue, extras)
{
    let data = [
        `${packageData.name} ${packageData.version}`,
        `Copyright (c) ${buildDate} ${packageData.author} (${packageData.email})`,
        `Released under the ${packageData.license} license`
    ];

    if (extras) data = data.concat(extras);

    return data.join(glue);
}

function releaseComment()
{
    return '\/*\n * ' + commentData('\n * ', [ '', packageData.homepage ]) + '\n *\/\n\n';
}

function releaseMinComment()
{
    return '\/* ' + commentData(' | ') + ' *\/\n';
}

function readRecursiveFolder(folder, mainFolder)
{
    const items = [], folderPath = mainFolder + '/' + folder;

    fs.readdirSync(folderPath).forEach(file => {
        if (file !== 'index.html') {
            const path = folder + '/' + file;

            if (fs.lstatSync(mainFolder + '/' + path).isDirectory()) {
                items = items.concat(readRecursiveFolder(path, mainFolder));
            } else if (/\.html$/i.test(file)) {
                items.push(path.replace(/^\.\//, ''));
            }
        }
    });

    return items;
}

gulp.task('examples', () => {
    const exampleFolder = __dirname + '/examples';
    const examples = readRecursiveFolder('.', exampleFolder);

    for (const i = examples.length - 1; i >= 0; i--) {
        examples[i] = `<li><a href="${examples[i]}">${examples[i]}</a></li>`;
    }

    const htmlOutput = `<!DOCTYPE html>
<html>
<head>
<title>Victory.css examples</title>
</head>
<body>
<ul>
${examples.join('\n')}
</ul>
</html>`;

    fs.writeFileSync(exampleFolder + '/index.html', htmlOutput);
});

gulp.task('readme', () => {
    const content = fs.readFileSync(__dirname + '/README.md', 'utf8');

    content = markdown.render(content);

    const htmlOutput = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>README - Victory.css</title>
</head>
<body>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style type="text/css">
*, :before, :after {
    box-sizing: border-box;
}

body {
    min-width: 300px;
}

code {
    background: rgba(27,31,35,.05);
    display: inline-block;
    white-space: nowrap;
    padding: 3px 6px;
    margin: 3px 0;
    border-radius: 3px;
    font-size: 85%;
    line-height: 1.45;
}

pre > code {
    white-space: pre;
    padding: 16px;
    overflow: auto;
    display: block;
}

ul {
    padding: 0 0 0 23px;
}

h2 {
    border-bottom: 1px solid #efefef;
}

main {
    padding: 45px 0;
    font-family: sans-serif;
    color: #333333;
    overflow: hidden;
    font-size: 16px;
    font-family: "Helvetica Neue", Helvetica, "Segoe UI", Arial, freesans, sans-serif;
    line-height: 1.6;
    word-wrap: break-word;
    max-width: 980px;
    border: 1px solid #ddd;
    margin: 16px auto;
    -ms-text-size-adjust: 100%;
    -webkit-text-size-adjust: 100%;
    text-align: center;
}

main > article {
    display: inline-block;
    text-align: left;
    min-width: 300px;
    width: 90%;
    margin: 0 auto;
}

table {
    border-collapse: collapse;
    display: block;
    min-width: 280px;
    overflow-x: auto;
}

table tbody tr:nth-child(odd) {
    background: #f6f8fa;
}

table td, table th {
    border: thin solid #ddd;
    padding: 6px 13px;
    text-align: center;
}

table td {
    padding-top: .2em;
    padding-bottom: .2em;
}

blockquote {
    margin: 5px;
    padding: 0 15px;
    color: #777;
    border-left: 4px solid #ddd;
}

hr {
    height: .25em;
    padding: 0;
    margin: 24px 0;
    background-color: #e1e4e8;
    border: 0;
}
</style>

<main>
    <article>${content}</article>
</main>
</body>
</html>`;

    fs.writeFileSync(__dirname + '/README.html', htmlOutput);
});

/* Default project */
gulp.task('mergecss', () => {
    return gulp
        .src(__dirname + '/src/scss/victory.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('prefix', () => {
    return gulp
        .src(__dirname + '/dist/victory.css')
        .pipe(postcss([
            autoprefixer()
        ]))
        .pipe(inject.prepend(releaseComment()))
        .pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('mincss', () => {
    return gulp
        .src(__dirname + '/dist/victory.css')
        .pipe(clean({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(inject.prepend(releaseMinComment()))
        .pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('mergejs', () => {
    let src = [
        __dirname + '/src/js/victory.js',
        __dirname + '/src/js/_polyfill.js',
        __dirname + '/src/js/_toggle.js',
        __dirname + '/src/js/_navbar.js',
        __dirname + '/src/js/_slide.js'
    ];

    return gulp
        .src(src)
        .pipe(concat('victory.js'))
        .pipe(inject.prepend(releaseComment()))
        .pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('minjs', gulp.series(() => {
    return gulp
        .src(__dirname + '/dist/victory.js')
        .pipe(minify({
            ext: { min: '.min.js' }
        }))
        .pipe(gulp.dest(__dirname + '/dist'));
}, () => {
    return gulp
        .src(__dirname + '/dist/victory.min.js')
        .pipe(inject.prepend(releaseMinComment()))
        .pipe(gulp.dest(__dirname + '/dist'));
}));

/* Basic project */
gulp.task('basic:mergecss', () => {
    return gulp.src(__dirname + '/src/scss/basic.scss')
        .pipe(sass().on('error', sass.logError))
        .pipe(rename({ basename: 'victory-basic' }))
        .pipe(postcss([
            autoprefixer()
        ]))
        .pipe(inject.prepend(releaseComment()))
        .pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('basic:mincss', () => {
    return gulp
        .src(__dirname + '/dist/victory-basic.css')
        .pipe(clean({ compatibility: 'ie8' }))
        .pipe(rename({ suffix: '.min' }))
        .pipe(inject.prepend(releaseMinComment()))
        .pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('basic:mergejs', () => {
    let src = [
        __dirname + '/src/js/victory.js',
        __dirname + '/src/js/_polyfill.js'
    ];

    return gulp
        .src(src)
        .pipe(rename({ basename: 'victory-basic' }))
        .pipe(inject.prepend(releaseComment()))
        .pipe(gulp.dest(__dirname + '/dist'));
});

gulp.task('basic:minjs', gulp.series(() => {
    return gulp
        .src(__dirname + '/dist/victory-basic.js')
        .pipe(minify({
            ext: { min: '.min.js' }
        }))
        .pipe(gulp.dest(__dirname + '/dist'));
}, () => {
    return gulp
        .src(__dirname + '/dist/victory-basic.min.js')
        .pipe(inject.prepend(releaseMinComment()))
        .pipe(gulp.dest(__dirname + '/dist'));
}));

/* Deploy commands */
gulp.task('default', gulp.series(
    'mergecss', 'prefix', 'mincss', 'mergejs', 'minjs',
    'basic:mergecss', 'basic:mincss', 'basic:mergejs', 'basic:minjs'
));

gulp.task('basic', gulp.series('basic:mergecss', 'basic:mincss', 'basic:mergejs', 'basic:minjs'));

gulp.task('standard', gulp.series('mergecss', 'prefix', 'mincss', 'mergejs', 'minjs'));
