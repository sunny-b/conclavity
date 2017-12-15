![Conclave Logo](/dist/img/conclave-mask-small.ico)

# Conclavity

## Demo

![Conclavity demo](/dist/img/conclavity-demo.gif)

## Summary

Conclavity is a dependency-free, embeddable, real-time, collaborative text editor for the browser.

This library is inspired by the [Conclave](https://conclave-team.github.io/conclave-site) editor created by the  [Conclave-Team](https://github.com/conclave-team).

----
## Install

Installing this editor is as easy as:

### 1. Install the NPM package

```shell
npm install --save conclavity
```

![Conclavity install](/dist/img/conclavity-shell.gif)

### 2. Create an empty div with an ID of "Conclave"

```html
<html>
  <head>
  </head>
  <body>
    <div id="conclave"></div>
  </body>
</html>
```

### 3. Include the CSS file

```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/conclavity@latest/dist/conclavity.css" />
```

### 4. Create a new instance of Conclavity

```javascript
// script.js
import Conclavity from 'conclavity';

new Conclavity();
```
----
## Usage

Conclavity provides an API with options for configurability.

### `Conclave(options)`

Option         | Default  | Description
---------------|----------|---------------------------------------------
`shareLink`    | `true`   | Provides a link to share with other users to collaborate
`icons`        | `true`   | If set to `true`, phone icons will appear next to users' name to indicate they can be called
`video`        | `true`   | Allows the ability for users to do one-on-one video chat
`changeUrl`    | `true`   | Changes the current URL so if user refreshes page, they will remain in collaboration session with other users
`errorMessage` | `true`   | Provides an error message when user gets disconnected from signaling server
`showPeers`    | `true`   | Show the other peers that are user is collaborating with
`peersLeft`    | `true`   | The peer lists appear to the left of document if `true`, otherwise to the right.
`placeholder`  | message  | Specify the placeholder message that will appear in the document. Defaults to `Share the link to invite collaborators to your room`

----
## License

MIT
