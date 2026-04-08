import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';

import { Extension, gettext as _ } from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import { QuickMenuToggle } from 'resource:///org/gnome/shell/ui/quickSettings.js';
import * as PopupMenu from 'resource:///org/gnome/shell/ui/popupMenu.js';

const DndTimerToggle = GObject.registerClass(
    class DndTimerToggle extends QuickMenuToggle {
        _init(extension) {
            super._init({
                title: _('Do Not Disturb'),
                iconName: 'notifications-disabled-symbolic',
                toggleMode: true,
            });

            this._ext = extension;
            this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.notifications' });
            this._extSettings = extension.getSettings();
            this._presetItems = new Map();

            this._buildMenu();

            this._settingsId = this._settings.connect(
                'changed::show-banners', () => this._syncState()
            );
            this._extSubtitleId = this._extSettings.connect(
                'changed::show-timer-subtitle', () => this._syncState()
            );
            this._extDurationsId = this._extSettings.connect(
                'changed::timer-durations', () => this._buildMenu()
            );
            this.connect('clicked', () => this._toggleDnd());

            this._syncState();
        }

        _formatDuration(minutes) {
            if (minutes < 60) return `${minutes} ${_('minutes')}`;

            const hours = Math.floor(minutes / 60);
            const mins = minutes % 60;

            let str = `${hours} ${_('hour')}${hours > 1 ? 's' : ''}`;
            if (mins > 0) str += ` ${mins} ${_('min')}`;
            return str;
        }

        _buildMenu() {
            if (!this._itemsSection) {
                this.menu.setHeader(
                    'notifications-disabled-symbolic',
                    _('Do Not Disturb')
                );

                this._itemsSection = new PopupMenu.PopupMenuSection();
                this.menu.addMenuItem(this._itemsSection);

                this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());
                const settingsItem = this.menu.addAction(_('Settings'), () => {
                    this._ext.openPreferences();
                });
                settingsItem.visible = Main.sessionMode.allowSettings;
            }

            this._itemsSection.removeAll();
            this._presetItems.clear();

            const durations = this._extSettings.get_value('timer-durations').deepUnpack();

            for (const mins of durations) {
                if (mins <= 0) continue;

                const item = new PopupMenu.PopupImageMenuItem(
                    this._formatDuration(mins), 'alarm-symbolic'
                );
                item.connect('activate', () => {
                    this._ext.startTimer(mins);
                });
                this._itemsSection.addMenuItem(item);
                this._presetItems.set(mins, item);
            }

            const infiniteItem = new PopupMenu.PopupImageMenuItem(
                _('Until I turn it off'), 'notifications-disabled-symbolic'
            );
            infiniteItem.connect('activate', () => {
                this._ext._activeTimerMins = 0;
                this._ext.cancelTimer();
                this._settings.set_boolean('show-banners', false);
                this._syncState();

                if (this._extSettings.get_boolean('show-toggle-notification')) {
                    Main.notify(
                        _('Do Not Disturb'),
                        _('Enabled')
                    );
                }
            });
            this._itemsSection.addMenuItem(infiniteItem);
            this._presetItems.set(0, infiniteItem);

            this._syncOrnaments();
        }

        _syncState() {
            const isDndOn = !this._settings.get_boolean('show-banners');
            this.checked = isDndOn;

            if (!isDndOn) {
                this.subtitle = null;
                this._ext._activeTimerMins = -1;
                this._ext.cancelTimer();
            } else {
                const showSubtitle = this._extSettings.get_boolean('show-timer-subtitle');
                if (showSubtitle) {
                    const endTime = this._ext.getEndTimeString();
                    this.subtitle = endTime ? `${_('Until')} ${endTime}` : _('On');
                } else {
                    this.subtitle = _('On');
                }
            }

            this._syncOrnaments();
        }

        _syncOrnaments() {
            const isDndOn = !this._settings.get_boolean('show-banners');
            const activeMins = this._ext.getActiveTimerMins();

            for (const [mins, item] of this._presetItems) {
                if (isDndOn && mins === activeMins) {
                    item.setOrnament(PopupMenu.Ornament.CHECK);
                } else {
                    item.setOrnament(PopupMenu.Ornament.NONE);
                }
            }
        }

        _toggleDnd() {
            const wasDndOn = !this._settings.get_boolean('show-banners');

            if (wasDndOn) {
                this._ext._activeTimerMins = -1;
                this._ext.cancelTimer();
                this._settings.set_boolean('show-banners', true);

                if (this._extSettings.get_boolean('show-toggle-notification')) {
                    Main.notify(
                        _('Do Not Disturb'),
                        _('Disabled')
                    );
                }
            } else {
                this._ext._activeTimerMins = 0;
                this._settings.set_boolean('show-banners', false);

                if (this._extSettings.get_boolean('show-toggle-notification')) {
                    Main.notify(
                        _('Do Not Disturb'),
                        _('Enabled')
                    );
                }
            }
        }

        destroy() {
            if (this._settingsId) {
                this._settings.disconnect(this._settingsId);
                this._settingsId = null;
            }
            if (this._extSubtitleId) {
                this._extSettings.disconnect(this._extSubtitleId);
                this._extSubtitleId = null;
            }
            if (this._extDurationsId) {
                this._extSettings.disconnect(this._extDurationsId);
                this._extDurationsId = null;
            }
            this._settings = null;
            this._extSettings = null;
            super.destroy();
        }
    });

export default class DndTimerExtension extends Extension {
    enable() {
        this._timerId = null;
        this._endTimeString = null;
        this._activeTimerMins = -1;
        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.notifications' });
        this._extSettings = this.getSettings();

        if (this._extSettings.get_boolean('remember-state')) {
            const wasDndOn = !this._settings.get_boolean('show-banners');
            if (wasDndOn) {
                this._activeTimerMins = 0;
            }
        }

        const qsMenu = Main.panel.statusArea.quickSettings.menu;
        this._originalToggle = null;

        for (const child of qsMenu._grid.get_children()) {
            if (child.constructor.name === 'DoNotDisturbToggle') {
                this._originalToggle = child;
                break;
            }
        }

        this._toggle = new DndTimerToggle(this);

        if (this._originalToggle) {
            this._originalToggle.hide();
            qsMenu.addItem(this._toggle);
            qsMenu._grid.set_child_below_sibling(this._toggle, this._originalToggle);
        } else {
            qsMenu.addItem(this._toggle);
        }
    }

    disable() {
        if (!this._extSettings.get_boolean('remember-state')) {
            const isDndOn = !this._settings.get_boolean('show-banners');
            if (isDndOn && this._timerId) {
                this._settings.set_boolean('show-banners', true);
            }
        }

        this.cancelTimer();

        if (this._toggle) {
            this._toggle.destroy();
            this._toggle = null;
        }

        if (this._originalToggle) {
            this._originalToggle.show();
            this._originalToggle = null;
        }

        this._settings = null;
        this._extSettings = null;
    }

    startTimer(minutes) {
        this.cancelTimer();

        this._activeTimerMins = minutes;
        this._settings.set_boolean('show-banners', false);

        const now = new Date();
        const endTime = new Date(now.getTime() + minutes * 60000);
        this._endTimeString = endTime.toLocaleTimeString([], {
            hour: '2-digit', minute: '2-digit',
        });

        if (this._extSettings.get_boolean('show-toggle-notification')) {
            Main.notify(
                _('Do Not Disturb'),
                `${_('Until')} ${this._endTimeString}`
            );
        }

        this._timerId = GLib.timeout_add_seconds(
            GLib.PRIORITY_DEFAULT,
            minutes * 60,
            () => {
                this._timerId = null;
                this._endTimeString = null;
                this._activeTimerMins = -1;

                this._settings.set_boolean('show-banners', true);

                if (this._extSettings.get_boolean('show-end-notification')) {
                    Main.notify(
                        _('Do Not Disturb Ended'),
                        _('Notifications are enabled again.')
                    );
                }

                return GLib.SOURCE_REMOVE;
            }
        );

        if (this._toggle) {
            this._toggle._syncState();
        }
    }

    cancelTimer() {
        if (this._timerId) {
            GLib.Source.remove(this._timerId);
            this._timerId = null;
            this._endTimeString = null;
        }
    }

    getEndTimeString() {
        return this._endTimeString;
    }

    getActiveTimerMins() {
        return this._activeTimerMins;
    }
}
