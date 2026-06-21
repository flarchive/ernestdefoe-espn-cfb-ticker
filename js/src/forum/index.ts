import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import HeaderPrimary from 'flarum/forum/components/HeaderPrimary';
import CfbTicker from './components/CfbTicker';

app.initializers.add('ernestdefoe-espn-cfb-ticker', () => {
    extend(HeaderPrimary.prototype, 'oncreate', function (this: HeaderPrimary) {
        // The ticker is mounted into its own element appended to <body>, not as
        // a child of HeaderPrimary, ON PURPOSE: it must persist across SPA route
        // changes (which tear down/rebuild the header subtree) and sit
        // fixed/top-of-page outside the header's stacking + overflow context. The
        // getElementById guard makes the mount idempotent across oncreate calls.
        if (document.getElementById('cfb-ticker-root')) return;

        if (!app.forum.attribute('ernestdefoe-espn-cfb-ticker.enabled')) return;

        const position = (app.forum.attribute('ernestdefoe-espn-cfb-ticker.position') as string) || 'top';
        const avocado = !!app.forum.attribute('ernestdefoe-espn-cfb-ticker.avocado_compat');

        const root = document.createElement('div');
        root.id = 'cfb-ticker-root';
        root.setAttribute('data-position', position);
        if (avocado) root.setAttribute('data-avocado', 'true');
        document.body.appendChild(root);
        document.body.classList.add('has-cfb-ticker-' + position);

        m.mount(root, CfbTicker);
    });
});
