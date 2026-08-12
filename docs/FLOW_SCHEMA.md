# Flow Schema

Tracy uses a strictly typed YAML schema to define end-to-end browser automation flows. 
Each file consists of metadata (frontmatter) and a list of step actions.

## Basic Structure

```yaml
# My Test Flow
url: https://example.com
---
- navigate: /login
- fill: john@example.com
  selector: '#email'
- fill: password123
  selector: '#password'
- leftClick: true
  selector: button[type="submit"]
- waitFor: networkIdle
```

## Supported Actions

The primary actions (CommandTypes) available in Tracy are:

| Action | Description | Key Attributes |
|---|---|---|
| `navigate` | Navigate to a specific URL path. | `path` or inline value. |
| `leftClick` | Performs a standard left-click on an element. | `selector` |
| `rightClick`| Performs a context-menu right-click on an element. | `selector` |
| `hover` | Hovers the mouse over an element. | `selector` |
| `scroll` | Scrolls the page by pixels or to an element. | `direction`, `distance`, `selector` |
| `tap` | Performs a mobile tap on an element. | `selector` |
| `twoFingersTap` | Performs a two-finger mobile tap. | `selector` |
| `press` | Simulates a keyboard key press. | `key` |
| `fill` | Types text into an input field. | `selector`, `text` (or inline value) |
| `waitFor` | Pauses execution until a condition is met. | `state` ('networkIdle', 'load', time in ms) |

## Attributes

Attributes define *how* or *where* an action occurs.

- `selector`: CSS or XPath selector targeting an element.
- `text`: Text string to fill into inputs.
- `key`: Keyboard key (e.g., 'Enter', 'Escape').
- `timeout`: Maximum time in milliseconds to wait for the action to complete.

## AI Autocomplete

Tracy's YamlEditor is aware of this schema. When editing a YAML file, press `Ctrl+Space` to trigger the AI-assisted autocomplete menu, which will intelligently suggest Actions or Attributes based on your current cursor indentation!
