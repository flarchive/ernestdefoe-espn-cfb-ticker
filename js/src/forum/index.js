import app from 'flarum/forum/app';
import CfbTicker from './components/CfbTicker';

app.initializers.add('ernestdefoe-espn-cfb-ticker', () => {
    const enabled = app.forum.attribute('ernestdefoe-espn-cfb-ticker.enabled');
    if (enabled === false) return;

    const position = app.forum.attribute('ernestdefoe-espn-cfb-ticker.position') || 'top';
    const avocado  = !!app.forum.attribute('ernestdefoe-espn-cfb-ticker.avocado_compat');

    const root = document.createElement('div');
    root.id = 'cfb-ticker-root';
    root.setAttribute('data-position', position);
    if (avocado) root.setAttribute('data-avocado', 'true');
    document.body.appendChild(root);
    document.body.classList.add('has-cfb-ticker-' + position);

    m.mount(root, { view: () => m(CfbTicker) });
});
