import { Admin } from 'flarum/common/extenders';

export default [
  new Admin()
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.enabled',
      type: 'boolean',
      label: 'Enable CFB Scores Ticker',
      help: 'Show a live FBS college football scores ticker in the forum header.',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.position',
      type: 'select',
      options: {
        top: 'Top of page',
        bottom: 'Bottom of page',
      },
      label: 'Ticker Position',
      help: 'Where the ticker appears on the page.',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.refreshInterval',
      type: 'number',
      min: 15,
      placeholder: '60',
      label: 'Refresh Interval (seconds)',
      help: 'How often to poll ESPN for updated scores. Minimum 15 seconds.',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.scrollSpeed',
      type: 'number',
      min: 5,
      max: 120,
      placeholder: '40',
      label: 'Scroll Speed',
      help: 'Ticker scroll speed in pixels per second.',
    }))
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.avocado_compat',
      type: 'boolean',
      label: 'Avocado Theme Compatibility',
      help: 'Enable if using the Avocado theme. Ensures the ticker is positioned correctly below the fixed header.',
    })),
];
