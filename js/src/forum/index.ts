import app from 'flarum/forum/app';
import { extend, override } from 'flarum/common/extend';
import HeaderPrimary from 'flarum/forum/components/HeaderPrimary';
import CfbTicker from './components/CfbTicker';

/**
 * Keep a top ticker directly under whatever bar is at the top of the window.
 *
 * Measuring the header's height once is not enough:
 * - on phones core moves `.App-header` into the slide-out drawer, so its
 *   height is the drawer's (700px or so) and the bar on screen is
 *   `.App-navigation`, which only becomes fixed once the page scrolls;
 * - a theme whose header scrolls away with the page (Masthead) left the
 *   ticker floating mid-page at the header's old height.
 *
 * So the ticker sits under the lowest visible edge of either bar, and at the
 * top of the window once neither is on screen. The value is written to <html>
 * as `--cfb-ticker-top` / `--cfb-ticker-bottom` (sticky sidebars use it), and
 * only when it changes, so a page that scrolls under a fixed header does no
 * style work at all.
 */
function follow(root: HTMLElement) {
  const bars = ['.App-header', '.App-navigation'].map((s) => document.querySelector<HTMLElement>(s)).filter((el): el is HTMLElement => !!el);
  const html = document.documentElement;
  html.classList.add('cfb-ticker-top');
  let current = '';
  let queued = false;

  const place = () => {
    queued = false;
    let top = 0;

    for (const bar of bars) {
      const r = bar.getBoundingClientRect();
      // A bar along the top of the window: not the drawer parked off-screen,
      // not a sidebar, not one already scrolled away.
      if (r.height === 0 || r.right <= 0 || r.left >= window.innerWidth || r.top > 40 || r.height > window.innerHeight / 2) continue;
      if (getComputedStyle(bar).visibility === 'hidden') continue;
      top = Math.max(top, Math.round(r.bottom));
    }

    const bottom = top + root.offsetHeight;
    if (current === top + ':' + bottom) return;
    current = top + ':' + bottom;
    html.style.setProperty('--cfb-ticker-top', top + 'px');
    html.style.setProperty('--cfb-ticker-bottom', bottom + 'px');
  };

  const queue = () => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(place);
  };

  place();
  window.addEventListener('scroll', queue, { passive: true });
  window.addEventListener('resize', queue, { passive: true });
  if ('ResizeObserver' in window) {
    const observer = new ResizeObserver(queue);
    [...bars, root].forEach((el) => observer.observe(el));
  }
}

app.initializers.add('ernestdefoe-espn-cfb-ticker', () => {
  // Core lands a jumped-to post just under the header (or the phone's top
  // bar) and knows nothing of the ticker below it, so the post's first lines
  // hid behind the bar. Land it under the ticker's lower edge instead, read
  // live since the ticker follows a header that scrolls away. By module name:
  // the post stream is loaded lazily.
  override('flarum/forum/components/PostStream', 'getMarginTop', function (this: any, original: () => number) {
    const margin = original();
    const root = document.getElementById('cfb-ticker-root');
    if (!margin || root?.dataset.position !== 'top') return margin;

    return Math.max(margin, Math.round(root.getBoundingClientRect().bottom) + parseInt(this.$().css('margin-top'), 10));
  });

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

    if (position === 'top') follow(root);
  });
});
