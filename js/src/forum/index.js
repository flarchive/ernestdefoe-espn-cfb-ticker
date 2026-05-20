import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import HeaderPrimary from 'flarum/forum/components/HeaderPrimary';
import CfbTicker from './components/CfbTicker';

app.initializers.add('ernestdefoe-espn-cfb-ticker', () => {
    extend(HeaderPrimary.prototype, 'oncreate', function () {
        // Guard: only mount once (oncreate can fire again after route changes)
        if (document.getElementById('cfb-ticker-root')) return;

        if (!app.forum.attribute('ernestdefoe-espn-cfb-ticker.enabled')) return;

        const position = app.forum.attribute('ernestdefoe-espn-cfb-ticker.position') || 'top';
        const avocado  = !!app.forum.attribute('ernestdefoe-espn-cfb-ticker.avocado_compat');

        const root = document.createElement('div');
        root.id = 'cfb-ticker-root';
        root.setAttribute('data-position', position);
        if (avocado) root.setAttribute('data-avocado', 'true');
        document.body.appendChild(root);
        document.body.classList.add('has-cfb-ticker-' + position);

        m.mount(root, CfbTicker);
    });
});
