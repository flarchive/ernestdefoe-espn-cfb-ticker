const config = require('flarum-webpack-config');

module.exports = config({
    entries: {
        forum: './js/src/forum/index.js',
        admin: './js/src/admin/index.js',
    },
});
