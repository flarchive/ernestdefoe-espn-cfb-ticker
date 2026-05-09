import app from 'flarum/admin/app';
import CfbTickerSettingsPage from './components/CfbTickerSettingsPage';

app.initializers.add('ernestdefoe-espn-cfb-ticker', () => {
    app.extensionData
        .for('ernestdefoe-espn-cfb-ticker')
        .registerSetting({
            setting: 'ernestdefoe-espn-cfb-ticker.enabled',
            label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.enabled_label'),
            help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.enabled_help'),
            type: 'boolean',
        })
        .registerSetting({
            setting: 'ernestdefoe-espn-cfb-ticker.position',
            label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.position_label'),
            help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.position_help'),
            type: 'select',
            options: {
                top: 'Top of page',
                bottom: 'Bottom of page',
            },
            default: 'top',
        })
        .registerSetting({
            setting: 'ernestdefoe-espn-cfb-ticker.refreshInterval',
            label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.refresh_label'),
            help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.refresh_help'),
            type: 'number',
            min: 15,
            placeholder: '60',
        })
        .registerSetting({
            setting: 'ernestdefoe-espn-cfb-ticker.scrollSpeed',
            label: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.speed_label'),
            help: app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.speed_help'),
            type: 'number',
            min: 5,
            max: 120,
            placeholder: '40',
        });
});
