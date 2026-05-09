import app from 'flarum/forum/app';
import HeaderPrimary from 'flarum/forum/components/HeaderPrimary';
import CfbTicker from './components/CfbTicker';

app.initializers.add('ernestdefoe-espn-cfb-ticker', () => {
    const origView = HeaderPrimary.prototype.view;
    HeaderPrimary.prototype.view = function () {
        const vnode = origView.apply(this, arguments);
        const enabled = app.forum.attribute('ernestdefoe-espn-cfb-ticker.enabled');
        if (enabled === false) return vnode;
        if (vnode && Array.isArray(vnode.children)) {
            vnode.children.unshift(m(CfbTicker));
        }
        return vnode;
    };
});
