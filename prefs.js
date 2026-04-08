import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import Gtk from 'gi://Gtk';
import Adw from 'gi://Adw';

import { ExtensionPreferences, gettext as _ } from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class DndTimerPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        this._settings = this.getSettings();

        const settingsPage = new Adw.PreferencesPage({
            title: _('Settings'),
            icon_name: 'preferences-system-symbolic',
        });
        window.add(settingsPage);

        const behaviorGroup = new Adw.PreferencesGroup({
            title: _('Behavior'),
        });
        settingsPage.add(behaviorGroup);

        const rememberRow = new Adw.SwitchRow({
            title: _('Remember state'),
            subtitle: _('Remember the last DND state across sessions and reboots'),
        });
        this._settings.bind(
            'remember-state', rememberRow, 'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        behaviorGroup.add(rememberRow);

        const notifRow = new Adw.SwitchRow({
            title: _('Show notification when timer ends'),
            subtitle: _('Display a notification when the DND timer expires'),
        });
        this._settings.bind(
            'show-end-notification', notifRow, 'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        behaviorGroup.add(notifRow);

        const toggleNotifRow = new Adw.SwitchRow({
            title: _('Notifications on toggle'),
            subtitle: _('Show a notification when DND is manually enabled or disabled'),
        });
        this._settings.bind(
            'show-toggle-notification', toggleNotifRow, 'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        behaviorGroup.add(toggleNotifRow);

        const displayGroup = new Adw.PreferencesGroup({
            title: _('Display'),
        });
        settingsPage.add(displayGroup);

        const subtitleRow = new Adw.SwitchRow({
            title: _('Show timer in subtitle'),
            subtitle: _('Show the countdown end‑time below the toggle title'),
        });
        this._settings.bind(
            'show-timer-subtitle', subtitleRow, 'active',
            Gio.SettingsBindFlags.DEFAULT
        );
        displayGroup.add(subtitleRow);

        const timerPage = new Adw.PreferencesPage({
            title: _('Timer'),
            icon_name: 'alarm-symbolic',
        });
        window.add(timerPage);

        const DEFAULT_DURATIONS = [15, 30, 60, 120, 240, 480];
        const PRESET_NAMES = [
            _('Timer 1 (short)'),
            _('Timer 2'),
            _('Timer 3 (medium)'),
            _('Timer 4'),
            _('Timer 5'),
            _('Timer 6 (long)'),
        ];

        const resetBtn = new Gtk.Button({
            icon_name: 'view-refresh-symbolic',
            valign: Gtk.Align.CENTER,
            css_classes: ['flat'],
            tooltip_text: _('Reset to defaults'),
        });

        const presetsGroup = new Adw.PreferencesGroup({
            title: _('Preset Durations'),
            description: _('Customize the timer options shown in the dropdown menu. Values are in minutes. Set to 0 to hide a slot.'),
            header_suffix: resetBtn,
        });
        timerPage.add(presetsGroup);

        const durations = this._settings.get_value('timer-durations').deepUnpack();
        const spinRows = [];

        for (let i = 0; i < 6; i++) {
            const value = i < durations.length ? durations[i] : DEFAULT_DURATIONS[i];
            const spinRow = new Adw.SpinRow({
                title: PRESET_NAMES[i],
                subtitle: this._formatDuration(value),
                adjustment: new Gtk.Adjustment({
                    lower: 0,
                    upper: 1440,
                    step_increment: 5,
                    page_increment: 30,
                    value,
                }),
            });

            spinRow.connect('notify::value', () => {
                spinRow.subtitle = this._formatDuration(spinRow.value);
                this._saveDurations(spinRows);
            });

            spinRows.push(spinRow);
            presetsGroup.add(spinRow);
        }

        resetBtn.connect('clicked', () => {
            for (let i = 0; i < spinRows.length; i++) {
                spinRows[i].value = DEFAULT_DURATIONS[i];
            }
        });

        const aboutPage = new Adw.PreferencesPage({
            title: _('About'),
            icon_name: 'help-about-symbolic',
        });
        window.add(aboutPage);

        const whatsNewGroup = new Adw.PreferencesGroup({
            title: _("What's New"),
        });

        const v3Row = new Adw.ExpanderRow({
            title: 'v3 — Native UI Overhaul',
            subtitle: 'Redesigned to match GNOME Shell',
            expanded: true,
        });
        const v3Notes = new Gtk.Label({
            label:
                '  Changes:\n' +
                '• Native dropdown: menu now uses standard GNOME popup‑menu items.\n' +
                '• Fixed faded/transparent appearance on stock theme.\n' +
                '• Timer presets with check‑mark indicator for the active timer.\n' +
                '• "Until I turn it off" infinite option (like Caffeine).\n' +
                '• Remember state: optionally persist DND across sessions.\n' +
                '• Toggle notifications: get notified when DND is toggled.\n' +
                '• New Preferences window with behavior & display settings.\n' +
                '• Quick "Settings" link inside the dropdown menu.',
            justify: Gtk.Justification.LEFT,
            xalign: 0,
            wrap: true,
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 15,
            margin_end: 15,
        });
        v3Row.add_row(v3Notes);
        whatsNewGroup.add(v3Row);

        const v2Row = new Adw.ExpanderRow({
            title: 'v2 — Initial Release',
            subtitle: 'Core timer functionality',
            expanded: false,
        });
        const v2Notes = new Gtk.Label({
            label:
                '  Features:\n' +
                '• Timed Do Not Disturb: set a timer to auto‑re‑enable notifications.\n' +
                '• Custom duration input field.\n' +
                '• Quick presets: 15 m, 30 m, 1 h, 2 h, 4 h, 8 h.\n' +
                '• Seamlessly replaces the default DND toggle.',
            justify: Gtk.Justification.LEFT,
            xalign: 0,
            wrap: true,
            margin_top: 10,
            margin_bottom: 10,
            margin_start: 15,
            margin_end: 15,
        });
        v2Row.add_row(v2Notes);
        whatsNewGroup.add(v2Row);

        aboutPage.add(whatsNewGroup);

        const supportGroup = new Adw.PreferencesGroup({
            title: _('Support the Project'),
        });

        const kofiRow = new Adw.ActionRow({
            title: 'Support on Ko-fi',
            subtitle: 'Buy me a coffee on Ko-fi',
        });
        const kofiBtn = new Gtk.Button({
            label: 'Open',
            valign: Gtk.Align.CENTER,
            css_classes: ['suggested-action'],
        });
        kofiBtn.connect('clicked', () =>
            Gio.AppInfo.launch_default_for_uri('https://ko-fi.com/andbal', null));
        kofiRow.add_suffix(kofiBtn);
        supportGroup.add(kofiRow);

        const bmacRow = new Adw.ActionRow({
            title: 'Buy Me a Coffee',
            subtitle: 'Support via BuyMeACoffee',
        });
        const bmacBtn = new Gtk.Button({
            label: 'Open',
            valign: Gtk.Align.CENTER,
            css_classes: ['suggested-action'],
        });
        bmacBtn.connect('clicked', () =>
            Gio.AppInfo.launch_default_for_uri('https://buymeacoffee.com/andbal', null));
        bmacRow.add_suffix(bmacBtn);
        supportGroup.add(bmacRow);

        const paypalRow = new Adw.ActionRow({
            title: 'Support via PayPal',
            subtitle: 'Direct donation via PayPal',
        });
        const paypalBtn = new Gtk.Button({
            label: 'Open',
            valign: Gtk.Align.CENTER,
            css_classes: ['suggested-action'],
        });
        paypalBtn.connect('clicked', () =>
            Gio.AppInfo.launch_default_for_uri('https://paypal.me/andraslaszlo23', null));
        paypalRow.add_suffix(paypalBtn);
        supportGroup.add(paypalRow);

        const githubRow = new Adw.ActionRow({
            title: _('Source Code'),
            subtitle: _('Report bugs or view source on GitHub'),
        });
        const githubBtn = new Gtk.Button({
            icon_name: 'external-link-symbolic',
            valign: Gtk.Align.CENTER,
        });
        githubBtn.connect('clicked', () =>
            Gio.AppInfo.launch_default_for_uri('https://github.com/Andbal23/timed-do-not-disturb', null));
        githubRow.add_suffix(githubBtn);
        supportGroup.add(githubRow);

        aboutPage.add(supportGroup);

        const promoGroup = new Adw.PreferencesGroup({
            title: _('Check Out My Other Extensions'),
        });

        const extProfilesRow = new Adw.ActionRow({
            title: 'Extension Profiles',
            subtitle: 'Create, manage, and instantly switch between different sets of GNOME extensions.',
        });
        const extProfilesBtn = new Gtk.Button({
            label: 'View on GitHub',
            valign: Gtk.Align.CENTER,
        });
        extProfilesBtn.connect('clicked', () =>
            Gio.AppInfo.launch_default_for_uri('https://github.com/Andbal23/extension-profiles', null));
        extProfilesRow.add_suffix(extProfilesBtn);
        promoGroup.add(extProfilesRow);

        const musicPillRow = new Adw.ActionRow({
            title: 'Dynamic Music Pill',
            subtitle: 'An elegant music player widget with audio visualizer and seamless integration.',
        });
        const musicPillBtn = new Gtk.Button({
            label: 'View on GitHub',
            valign: Gtk.Align.CENTER,
        });
        musicPillBtn.connect('clicked', () =>
            Gio.AppInfo.launch_default_for_uri('https://github.com/Andbal23/dynamic-music-pill', null));
        musicPillRow.add_suffix(musicPillBtn);
        promoGroup.add(musicPillRow);

        aboutPage.add(promoGroup);
    }

    _formatDuration(minutes) {
        if (minutes === 0) return _('Hidden');
        if (minutes < 60) return `${minutes} ${_('minutes')}`;

        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;

        let str = `${hours} ${_('hour')}${hours > 1 ? 's' : ''}`;
        if (mins > 0) str += ` ${mins} ${_('min')}`;
        return str;
    }

    _saveDurations(spinRows) {
        const values = spinRows.map(row => Math.round(row.value));
        const variant = new GLib.Variant('ai', values);
        this._settings.set_value('timer-durations', variant);
    }
}
