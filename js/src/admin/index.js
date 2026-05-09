import app from 'flarum/admin/app';
import { extend } from 'flarum/common/extend';

app.initializers.add('yourvendor-espn-cfb-ticker-admin', () => {
    app.extensionData
        .for('yourvendor-espn-cfb-ticker')
        .registerSetting({
            setting: 'espn_cfb_ticker.enabled',
            label:   app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.enabled_label'),
            help:    app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.enabled_help'),
            type:    'boolean',
        })
        .registerSetting({
            setting: 'espn_cfb_ticker.position',
            label:   app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.position_label'),
            type:    'select',
            options: {
                top:    app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.position_top'),
                bottom: app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.position_bottom'),
            },
        })
        .registerSetting({
            setting:     'espn_cfb_ticker.speed',
            label:       app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.speed_label'),
            help:        app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.speed_help'),
            type:        'number',
            placeholder: '40',
            min:         5,
            max:         200,
        })
        .registerSetting({
            setting:     'espn_cfb_ticker.refresh_interval',
            label:       app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.refresh_label'),
            help:        app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.refresh_help'),
            type:        'number',
            placeholder: '60',
            min:         15,
            max:         3600,
        })
        .registerSetting({
            setting: 'espn_cfb_ticker.show_logos',
            label:   app.translator.trans('yourvendor-espn-cfb-ticker.admin.settings.show_logos_label'),
            type:    'boolean',
        });
});
