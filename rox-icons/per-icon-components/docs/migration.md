## NEW ICON COMPONENT API!

In Roxbury v9, every icon is its own Vue component. Import only the icons you use, and only those ship in your app.

```js
import BellIcon from '@cnodigital/roxbury/rox-icons/bell';
```

```vue
<BellIcon size="large" label="Notifications" />
```

Browse every icon and copy its import from the [icon gallery](#all-icons).

### What changed

**Deprecated (removed in v10)**

- `<CnbIcon>` and its `icon` prop, in both forms: Font Awesome names (`icon="bell"`) and imported SVGs (`:icon="BellSvg"`). In development, Roxbury logs a console warning once per page load.
- The `color` prop on `<CnbIcon>`.

**Removed (breaking)**

- Font Awesome styles are no longer included in `Core.min.css`. If you still need them while you migrate, import them separately:
  ```js
  import '@cnodigital/roxbury/css/fontawesome/fontawesome.css';
  ```
- The `font-awesome` prop. `<CnbIcon>` now detects the mode from the `icon` value.
- The `spin`, `pulse`, `rotate`, `flip` and `circle` props. Pass Font Awesome classes instead, e.g. `class="fas fa-spin"`.

### Is your app affected?

Your app is affected if any of these apply:

- **You use `<CnbIcon>` anywhere.** It still works in v9, but you'll see deprecation warnings. Plan to migrate before v10.
- **You rely on Font Awesome classes (`fa-*`) from `Core.min.css`.** Icons will render blank until you import the Font Awesome stylesheet above or switch to icon components.
- **You pass `font-awesome`, `spin`, `pulse`, `rotate`, `flip` or `circle` to `<CnbIcon>`.** These props are gone. Remove them, or use Font Awesome classes.
- **You install vite-svg-loader only to pass SVGs to `<CnbIcon>`.** You can remove it once you've migrated. The new icon components don't need it.

If none of these apply, there's nothing to do.

### How to migrate

| Before (v8)                              | After (v9)                                        |
| ---------------------------------------- | ------------------------------------------------- |
| `<CnbIcon icon="bell" />`                | `<BellIcon />`                                    |
| `<CnbIcon :icon="BellSvg" />`            | `<BellIcon />`                                    |
| `<CnbIcon icon="bell" size="large" />`   | `<BellIcon size="large" />`                       |
| `<CnbIcon icon="bell" color="#c00" />`   | `<BellIcon style="--rox-icon-svg-color: #c00" />` |
| `<CnbIcon icon="bell" label="Alerts" />` | `<BellIcon label="Alerts" />`                     |

- **Sizes:** `size` takes the same values as before (`xsmall` to `10x`). Without it, an icon matches the surrounding font size.
- **Colors:** `color` accepts `primary` or `current` (the surrounding text color). For any other color, set the `--rox-icon-svg-color` CSS variable on the icon or on any parent element.
- **Accessibility:** icons without a `label` are hidden from screen readers. Add a `label` when the icon is the only thing conveying meaning, e.g. an icon-only button.
- **Fixed colors:** status icons such as danger, warning and success always keep their own colors.
