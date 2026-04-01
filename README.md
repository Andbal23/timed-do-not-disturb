# Timed Do Not Disturb

A GNOME Shell extension that supercharges the built-in Do Not Disturb toggle with a timer menu — mute notifications for a set duration and let them come back automatically.

---

![Views](https://komarev.com/ghpvc/?username=Andbal23d&repo=timed-do-not-disturb&label=Views&color=green) ![GNOME Shell](https://img.shields.io/badge/GNOME-45%20--%2050-blue?logo=gnome&logoColor=white) ![GitHub License](https://img.shields.io/github/license/Andbal23/timed-do-not-disturb)
[![Stars](https://img.shields.io/github/stars/Andbal23/timed-do-not-disturb?style=social)](https://github.com/Andbal23/timed-do-not-disturb/stargazers)

---

## Features

* **Preset Timers:** Six quick-pick buttons (15m, 30m, 1h, 2h, 4h, 8h) right in the Quick Settings panel.
* **Custom Duration:** Enter any number of minutes via the built-in input field.
* **Auto Re-enable:** Notifications turn back on automatically when the timer expires — with a notification to let you know.
* **Subtitle Display:** The toggle shows the exact end time ("Until 14:30") so you always know when DND will lift.
* **Seamless Integration:** Replaces the stock DND toggle in-place, keeping the familiar look and feel.
* **i18n Ready:** Full gettext support for translations.

## Quick Settings Menu


<p align="center"><img width="521" height="772" alt="image" src="https://github.com/user-attachments/assets/72c79457-6677-4e30-b7af-03a107914ff1" />
</p>

## Installation

### From GNOME Extensions Store (Recommended)

<p align="center">
  <a href="https://extensions.gnome.org/extension/9550/timed-do-not-disturb//">
    <img alt="Get it on GNOME Extensions" width="400" src="https://raw.githubusercontent.com/andyholmes/gnome-shell-extensions-badge/master/get-it-on-ego.svg?sanitize=true"/>
  </a>
</p>

### Manual Installation from Source

**1.** Clone the repository:
```bash
git clone https://github.com/Andbal23/timed-do-not-disturb.git
```

**2.** Enter the directory:
```bash
cd timed-do-not-disturb
```

**3.** Create the extension directory:
```bash
mkdir -p ~/.local/share/gnome-shell/extensions/timed-do-not-disturb@andbal
```

**4.** Copy all files:
```bash
cp -r * ~/.local/share/gnome-shell/extensions/timed-do-not-disturb@andbal/
```

**5.** Restart GNOME Shell:
- **X11:** Press `Alt+F2`, type `r`, and press `Enter`.
- **Wayland:** Log out and log back in.

**6.** Enable the extension via **GNOME Extensions**, **Extension Manager**, or:
```bash
gnome-extensions enable timed-do-not-disturb@andbal
```

---

## Check out this one too :)

https://github.com/Andbal23/dynamic-music-pill <br>
https://github.com/Andbal23/extension-profiles

---

## Support the Project

<div align="center">

[![Buy Me A Coffee](https://img.shields.io/badge/Buy%20Me%20A%20Coffee-Donate-yellow?style=for-the-badge&logo=buy-me-a-coffee)](https://www.buymeacoffee.com/andbal)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support-red?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/andbal)

</div>

---

## Star History

[![Star History Chart](https://api.star-history.com/svg?repos=Andbal23/timed-do-not-disturb&type=Date)](https://star-history.com/#Andbal23/timed-do-not-disturb&Date)

---

## License

This project is licensed under the [GPL-3.0 License](LICENSE).

<p align="center">Made with ❤️ for the GNOME community.</p>
