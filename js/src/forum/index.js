import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import HeaderPrimary from 'flarum/forum/components/HeaderPrimary';
import CfbTicker from './components/CfbTicker';

app.initializers.add('yourvendor-espn-cfb-ticker', () => {
    const position = app.forum.attribute('espnCfbTicker.position') || 'top';
    const enabled  = app.forum.attribute('espnCfbTicker.enabled') !== false;

    if (!enabled) return;

    if (position === 'top') {
        // Inject above the header navigation bar
        extend(HeaderPrimary.prototype, 'view', function (vdom) {
            // We mount the ticker as a sibling above the header via a portal-like
            // approach using oncreate hook on the HeaderPrimary root element.
        });
    }

    // Use body oncreate to mount the ticker into a dedicated DOM node.
    const mountTicker = () => {
        const existing = document.getElementById('cfb-ticker-mount');
        if (existing) return;

        const mount = document.createElement('div');
        mount.id = 'cfb-ticker-mount';

        if (position === 'bottom') {
            document.body.appendChild(mount);
            mount.classList.add('cfb-ticker--bottom');
        } else {
            // Insert before #app for top positioning
            const appEl = document.getElementById('app');
            if (appEl) {
                document.body.insertBefore(mount, appEl);
            } else {
                document.body.prepend(mount);
            }
            mount.classList.add('cfb-ticker--top');
        }

        m.mount(mount, CfbTicker);
    };

    // Mount after app is ready
    $(document).ready(mountTicker);
});
