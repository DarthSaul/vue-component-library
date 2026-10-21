## NEW ICON COMPONENT API!

In Roxbury v9, every icon is its own Vue component. Import only the icons you use, and only those ship in your app.

```js
import BellIcon from '@cnodigital/roxbury/rox-icons/bell';
```

```vue
<BellIcon size="large" label="Notifications" />
```

Browse every icon and copy its import from the [icon gallery](#all-icons).

`<CnbIcon>` stays, for SVGs that aren't in the Roxbury icon set. Pass your own SVG component to its `icon` prop:

```vue
<CnbIcon :icon="MyCustomSvg" label="Custom" />
```

### What changed

**Deprecated (removed in v10)**

- Font Awesome icon names in `<CnbIcon>`'s `icon` prop (`icon="bell"`). Use the matching icon component instead. In development, Roxbury logs a console warning once per page load when an icon name is passed.
- The `color` prop on `<CnbIcon>`.

Passing your own SVG component (`:icon="MyCustomSvg"`) is **not** deprecated.

**Removed (breaking)**

- Font Awesome styles are no longer included in `Core.min.css`. If you still need them while you migrate, import them separately:
  ```js
  import '@cnodigital/roxbury/css/fontawesome/fontawesome.css';
  ```
- The `font-awesome` prop. `<CnbIcon>` now detects the mode from the `icon` value.
- The `spin`, `pulse`, `rotate`, `flip` and `circle` props. Pass Font Awesome classes instead, e.g. `class="fas fa-spin"`.

### Is your app affected?

Your app is affected if any of these apply:

- **You pass Font Awesome names to `<CnbIcon icon="…">`.** They still work in v9, but you'll see deprecation warnings. Switch to icon components before v10.
- **You rely on Font Awesome classes (`fa-*`) from `Core.min.css`.** Icons will render blank until you import the Font Awesome stylesheet above or switch to icon components.
- **You pass `font-awesome`, `spin`, `pulse`, `rotate`, `flip` or `circle` to `<CnbIcon>`.** These props are gone. Remove them, or use Font Awesome classes.

If you only pass your own SVGs to `<CnbIcon>`, nothing changes. If one of those SVGs is now in the Roxbury set, consider switching to its icon component.

### How to migrate

| Before (v8)                              | After (v9)                                        |
| ---------------------------------------- | ------------------------------------------------- |
| `<CnbIcon icon="bell" />`                | `<BellIcon />`                                    |
| `<CnbIcon icon="bell" size="large" />`   | `<BellIcon size="large" />`                       |
| `<CnbIcon icon="bell" color="#c00" />`   | `<BellIcon style="--rox-icon-svg-color: #c00" />` |
| `<CnbIcon icon="bell" label="Alerts" />` | `<BellIcon label="Alerts" />`                     |
| `<CnbIcon :icon="MyCustomSvg" />`        | No change                                         |

- **Sizes:** `size` takes the same values as before (`xsmall` to `10x`). Without it, an icon matches the surrounding font size.
- **Colors:** `color` accepts `primary` or `current` (the surrounding text color). For any other color, set the `--rox-icon-svg-color` CSS variable on the icon or on any parent element.
- **Accessibility:** icons without a `label` are hidden from screen readers. Add a `label` when the icon is the only thing conveying meaning, e.g. an icon-only button.
- **Fixed colors:** status icons such as danger, warning and success always keep their own colors.
