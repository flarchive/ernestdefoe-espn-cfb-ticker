import app from 'flarum/admin/app';
import Component from 'flarum/common/Component';

const t = (key: string) => app.translator.trans('ernestdefoe-espn-cfb-ticker.admin.settings.' + key);

interface Attrs {
  /**
   * The settings page's OWN stream for `ernestdefoe-espn-cfb-ticker.leagues`.
   * 🚨 Never `app.data.settings`: the page saves what differs between the two,
   * so writing there ticks the box and sends nothing.
   */
  value: (next?: string) => string;
}

/** Which ESPN scoreboards the bar shows, as tick boxes over one comma-joined setting. */
export default class LeaguePicker extends Component<Attrs> {
  chosen(): string[] {
    return String(this.attrs.value() || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  toggle(key: string, on: boolean) {
    const chosen = this.chosen();
    this.attrs.value((on ? [...new Set([...chosen, key])] : chosen.filter((k) => k !== key)).join(','));
  }

  view() {
    // From the server's list (extend.php), never a copy written here.
    const leagues: string[] = (app.data as any).espnTickerLeagues || [];
    const chosen = this.chosen();

    return m('.Form-group.CfbTickerLeagues', [
      m('label', t('leagues_label')),
      m('.helpText', t('leagues_help')),
      leagues.map((key) =>
        m('label.checkbox', { key }, [
          m('input[type=checkbox]', {
            checked: chosen.includes(key),
            onchange: (e: Event) => this.toggle(key, (e.target as HTMLInputElement).checked),
          }),
          t('league.' + key),
        ])
      ),
    ]);
  }
}
