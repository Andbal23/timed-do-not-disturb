import Gio from 'gi://Gio';
import GLib from 'gi://GLib';
import GObject from 'gi://GObject';
import St from 'gi://St';
import Clutter from 'gi://Clutter';

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
            toggleMode: true
        });

        this._ext = extension;
        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.notifications' });

        this._buildMenu();
        
        this._settingsId = this._settings.connect('changed::show-banners', () => this._syncState());
        this.connect('clicked', () => this._toggleDnd());

        this._syncState();
    }

    _buildMenu() {
        const presets = [
            { label: _('15m'), mins: 15 },
            { label: _('30m'), mins: 30 },
            { label: _('1h'), mins: 60 },
            { label: _('2h'), mins: 120 },
            { label: _('4h'), mins: 240 },
            { label: _('8h'), mins: 480 }
        ];

        const gridItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        gridItem.set_style('padding: 8px 12px;'); 

        const gridVBox = new St.BoxLayout({
            vertical: true,
            x_expand: true,
            style_class: 'dnd-preset-grid'
        });

        const row1 = new St.BoxLayout({ vertical: false, x_expand: true, style_class: 'dnd-preset-row' });
        const row2 = new St.BoxLayout({ vertical: false, x_expand: true, style_class: 'dnd-preset-row' });

        for (let i = 0; i < presets.length; i++) {
            const preset = presets[i];
            const btn = new St.Button({
                label: preset.label,
                style_class: 'dnd-preset-btn',
                x_expand: true,
                x_align: Clutter.ActorAlign.FILL,
                can_focus: true
            });
            
            btn.connect('clicked', () => {
                this._ext.startTimer(preset.mins);
                this.menu.close();
            });

            if (i < 3) {
                row1.add_child(btn);
            } else {
                row2.add_child(btn);
            }
        }

        gridVBox.add_child(row1);
        gridVBox.add_child(row2);
        gridItem.add_child(gridVBox);
        this.menu.addMenuItem(gridItem);

        this.menu.addMenuItem(new PopupMenu.PopupSeparatorMenuItem());

        const customItem = new PopupMenu.PopupBaseMenuItem({ reactive: false });
        customItem.set_style('padding: 8px 12px;');

        const box = new St.BoxLayout({ 
            style_class: 'dnd-timer-custom-box', 
            vertical: false, 
            x_expand: true 
        });

        const clockIcon = new St.Icon({
            icon_name: 'alarm-symbolic',
            style_class: 'popup-menu-icon',
            y_align: Clutter.ActorAlign.CENTER
        });
        clockIcon.set_style('margin-right: 8px;');

        this._entry = new St.Entry({
            hint_text: _('Custom (mins)...'),
            x_expand: true,
            can_focus: true,
            style_class: 'dnd-timer-entry'
        });

        const startBtn = new St.Button({
            label: _('Start'),
            style_class: 'dnd-timer-start-btn',
            can_focus: true,
            y_align: Clutter.ActorAlign.CENTER
        });

        const onCustomStart = () => {
            const val = parseInt(this._entry.get_text(), 10);
            if (!isNaN(val) && val > 0) {
                this._ext.startTimer(val);
                this._entry.set_text('');
                this.menu.close();
            }
        };

        startBtn.connect('clicked', onCustomStart);
        this._entry.clutter_text.connect('activate', onCustomStart);

        box.add_child(clockIcon);
        box.add_child(this._entry);
        box.add_child(startBtn);
        customItem.add_child(box);
        
        this.menu.addMenuItem(customItem);
    }

    _syncState() {
        const isDndOn = !this._settings.get_boolean('show-banners');
        this.checked = isDndOn;

        if (!isDndOn) {
            this.subtitle = null;
            this._ext.cancelTimer();
        } else {
            const endTime = this._ext.getEndTimeString();
            // Leteremtjük az 'Until' szót, hogy ezt is lehessen fordítani (pl. 'Eddig: 14:30')
            this.subtitle = endTime ? `${_('Until')} ${endTime}` : _('On');
        }
    }

    _toggleDnd() {
        const isDndOn = !this._settings.get_boolean('show-banners');
        this._settings.set_boolean('show-banners', isDndOn);
        
        if (!isDndOn) {
            this._ext.cancelTimer();
        }
    }

    destroy() {
        if (this._settingsId) {
            this._settings.disconnect(this._settingsId);
            this._settingsId = null;
        }
        this._settings = null;
        super.destroy();
    }
});

export default class DndTimerExtension extends Extension {
    enable() {
        this._timerId = null;
        this._endTimeString = null;
        this._settings = new Gio.Settings({ schema_id: 'org.gnome.desktop.notifications' });

        const qsMenu = Main.panel.statusArea.quickSettings.menu;
        this._originalToggle = null;
        
        for (const child of qsMenu._grid.get_children()) {
            if (child.constructor.name === 'DoNotDisturbToggle') {
                this._originalToggle = child;
                break;
            }
        }

        const originalTitle = this._originalToggle ? this._originalToggle.title : _('Do Not Disturb');

        this._toggle = new DndTimerToggle(this, originalTitle);
        
        if (this._originalToggle) {
            this._originalToggle.hide();
            
            qsMenu.addItem(this._toggle);
            
            qsMenu._grid.set_child_below_sibling(this._toggle, this._originalToggle);
        } else {
            qsMenu.addItem(this._toggle);
        }
    }

    disable() {
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
    }

    startTimer(minutes) {
        this.cancelTimer();
        
        this._settings.set_boolean('show-banners', false);

        const now = new Date();
        const endTime = new Date(now.getTime() + minutes * 60000);
        this._endTimeString = endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        this._timerId = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, minutes * 60, () => {
            this._timerId = null;
            this._endTimeString = null;
            
            this._settings.set_boolean('show-banners', true);
            Main.notify(_('Do Not Disturb Ended'), _('Notifications are enabled again.'));
            
            return GLib.SOURCE_REMOVE;
        });

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
}
