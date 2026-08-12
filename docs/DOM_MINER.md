# DOM Miner

Tracy utilizes a specialized engine called the `dom-miner` to process large web pages before feeding them into our AI models.

## The Token Problem

Modern web pages are incredibly complex. A typical React or Angular application might generate a DOM tree with 5,000+ nodes, inline SVG data, enormous base64 images, and deeply nested `div` structures used strictly for layout. 

If we pass raw HTML to an AI model to ask it "Click the submit button", the model will consume tens of thousands of tokens, run slowly, cost a lot of money, and often hallucinate selectors due to the sheer noise.

## The Solution: DOM Mining

The `dom-miner` acts as an intelligent compression algorithm for the DOM. 

When you click "Mine DOM" in Tracy, the engine executes a script inside the Playwright context that traverses the page and strips out:
- Layout `div`s and `span`s that have no semantic meaning.
- Hidden elements (`display: none`, `visibility: hidden`).
- `<script>`, `<style>`, `<svg>`, and `<path>` tags.

It retains and emphasizes:
- Interactive elements (`<button>`, `<a>`, `<input>`).
- Text holders (`<h1>`, `<p>`, labels).
- Crucial attributes (`id`, `data-testid`, `name`, `aria-labels`).

### The Output (Syntax Tree)

The result is a drastically minified "Syntax Tree" that looks similar to HTML but is roughly **90% smaller** in token size. 

Example Output:
```html
<main id="content">
  <h1 text="Login to Tracy"></h1>
  <form>
    <input type="email" id="email-input" placeholder="Email" />
    <input type="password" id="password-input" />
    <button type="submit" text="Log In"></button>
  </form>
</main>
```

When this minified tree is passed to the AI Copilot, the AI can instantly locate the elements and output highly reliable, robust CSS selectors for the YAML flow!
