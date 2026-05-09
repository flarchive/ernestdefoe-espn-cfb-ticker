const config = require('flarum-webpack-config');

module.exports = config({
    useExtensions: [],
    // Mithril JSX: transform m() calls via babel
    babelOptions: {
        plugins: [
            ['@babel/plugin-transform-react-jsx', { pragma: 'm' }]
        ]
    }
});
