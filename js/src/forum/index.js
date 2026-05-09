import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import IndexPage from 'flarum/forum/components/IndexPage';
import CfbTicker from './components/CfbTicker';

app.initializers.add('ernestdefoe-espn-cfb-ticker', () => {
    // Inject the ticker into every forum page by extending the IndexPage header
    // and also mounting globally via the forum body.
    extend(app, 'mount', function () {
        const enabled = app.forum.attribute('ernestdefoe-espn-cfb-ticker.enabled');
        if (!enabled && enabled !== undefined) return;

        const position = app.forum.attribute('ernestdefoe-espn-cfb-ticker.position') || 'top';
        const container = document.createElement('div');
        container.id = 'cfb-ticker-mount';
        container.setAttribute('data-position', position);

        if (position === 'bottom') {
            document.body.appendChild(container);
        } else {
            const forumBody = document.getElementById('app');
            if (forumBody) {
                forumBody.insertBefore(container, forumBody.firstChild);
            } else {
                document.body.insertBefore(container, document.body.firstChild);
            }
        }

        m.mount(container, CfbTicker);
    });
});
