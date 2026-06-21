import app from 'flarum/admin/app';
import Extend from 'flarum/common/extenders';

export default [
  new Extend.Admin()
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.enabled',
      type: 'boolean',
      label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.enabled_label'),
      help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.enabled_help'),
    }))
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.position',
      type: 'select',
      options: {
        top: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.position_top'),
        bottom: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.position_bottom'),
      },
      label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.position_label'),
      help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.position_help'),
    }))
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.refreshInterval',
      type: 'number',
      min: 15,
      placeholder: '60',
      label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.refresh_label'),
      help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.refresh_help'),
    }))
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.scrollSpeed',
      type: 'number',
      min: 5,
      max: 120,
      placeholder: '40',
      label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.speed_label'),
      help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.speed_help'),
    }))
    .setting(() => ({
      setting: 'ernestdefoe-espn-cfb-ticker.avocado_compat',
      type: 'boolean',
      label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.avocado_label'),
      help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.avocado_help'),
    })),
];
