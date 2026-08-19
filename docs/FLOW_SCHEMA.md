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

## Multi-Browser Matrix & Step Conditionals

Tracy supports running test flows across multiple browser engines (`chromium`, `firefox`, `webkit`) in parallel, along with step-level browser filtering.

### Frontmatter Configuration

```yaml
# Flow configured for cross-browser matrix execution
url: https://example.com
browsers:
  - chromium
  - firefox
  - webkit
matrix:
  browsers: [chromium, firefox, webkit]
  workers: 4
  stopOnFirstFailure: false
---
- navigate: /login
- fill: test@example.com
  selector: '#email'
```

### Step Conditionals (`when` and `skip_if`)

Steps can conditionally execute or skip based on the active browser engine:

```yaml
# Step only runs on Chromium
- leftClick: true
  selector: button.chrome-only-feature
  when:
    browser: chromium

# Step runs on Chromium and Firefox, but skipped on WebKit
- assertVisible: true
  selector: .modern-dialog
  when:
    browser: [chromium, firefox]

# Step skipped on Firefox
- hover: true
  selector: .firefox-unsupported-element
  skip_if:
    browser: firefox
```

## Declarative Network Mocking & HAR Replay

Tracy allows mocking network requests and replaying HAR recordings directly in flow frontmatter or via inline flow steps.

### Frontmatter Configuration

```yaml
# Flow with declarative network mocks & HAR replay
url: https://example.com
mocks:
  - url: "**/api/v1/user"
    method: GET
    status: 200
    headers:
      content-type: application/json
    body:
      id: 42
      name: "Mocked User"
      role: "admin"
  - url: "**/api/v1/slow-endpoint"
    delayMs: 500
    status: 204
  - url: "**/api/v1/flake"
    abort: connectionreset
  - url: "**/api/v1/items"
    fixture: fixtures/items.json
har:
  path: fixtures/session.har
  notFound: fallback
---
- navigate: /dashboard
- waitFor: networkIdle
```

### Inline Network Commands

| Action | Description | Key Attributes |
|---|---|---|
| `mockRoute` | Dynamically register a route mock rule. | `url`, `method`, `status`, `body`, `headers`, `fixture`, `delayMs`, `abort`, `times` |
| `unmockRoute` | Remove an active route mock rule by ID or URL. | `id` or `url` |
| `recordHar` | Start recording network traffic to a HAR file. | `path`, `urlFilter` |
| `replayHar` | Route network traffic from an existing HAR file. | `path`, `notFound`, `url` |
| `assertRequest` | Assert intercepted HTTP requests matching criteria. | `url`, `method`, `count`, `minCount`, `maxCount`, `queryParams`, `bodyPattern` |

#### Example Inline Mock & Assert Step

```yaml
- mockRoute: true
  url: "**/api/checkout"
  method: POST
  status: 200
  body:
    orderId: "ORD-9999"
    status: "confirmed"

- leftClick: true
  selector: button#checkout-btn

- assertRequest: true
  url: "**/api/checkout"
  method: POST
  count: 1
  bodyPattern:
    sku: "ITEM-101"
```

## AI Autocomplete

Tracy's YamlEditor is aware of this schema. When editing a YAML file, press `Ctrl+Space` to trigger the AI-assisted autocomplete menu, which will intelligently suggest Actions or Attributes based on your current cursor indentation!
