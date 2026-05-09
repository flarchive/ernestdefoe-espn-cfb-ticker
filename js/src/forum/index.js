import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import HeaderPrimary from 'flarum/forum/components/HeaderPrimary';
import CfbTicker from './components/CfbTicker';

app.initializers.add('ernestdefoe-espn-cfb-ticker', () => {
    // Extend HeaderPrimary.view so the ticker appears on every forum page.
    // This is the safe Flarum 2 pattern — never call m.mount() or extend app itself.
    extend(HeaderPrimary.prototype, 'view', function (vnode) {
        const enabled = app.forum.attribute('ernestdefoe-espn-cfb-ticker.enabled');
        // Default to enabled when the setting hasn't been saved yet
        if (enabled === false) return;

        if (vnode && Array.isArray(vnode.children)) {
            vnode.children.unshift(m(CfbTicker));
        }
    });
});
