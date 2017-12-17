# Conclavity

## Demo

![Conclavity demo](/dist/img/conclavity.gif)

## Summary

Conclavity is a dependency-free, embeddable, real-time, collaborative text editor for the browser.

This library is inspired by the [Conclave](https://conclave-team.github.io/conclave-site) editor created by the  [Conclave-Team](https://github.com/conclave-team).

---
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
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/conclavity/dist/conclavity.css" />
```

### 4. Create a new instance of Conclavity

```javascript
// script.js
import Conclavity from 'conclavity';

new Conclavity();
```

You can then use [Browserify](http://browserify.org/) -- or any other bundling library -- to modularize the script file.

---
## Usage

Conclavity provides an API with options for configurability.

### `Conclavity(options = {})`

Option         | Default     | Description
---------------|-------------|---------------------------------------------
`peerId`       | `null`      | You can provide your own peerId to the Peer Server
`peer`         | `null`      | Allows you to create your own instance of Peer Server. If left blank, Conclavity uses a default instance of Peer Server
`shareLink`    | `true`      | Provides a link to share with other users to collaborate
`icons`        | `true`      | If set to `true`, phone icons will appear next to users' name to indicate they can be called
`video`        | `true`      | Allows the ability for users to do one-on-one video chat
`changeUrl`    | `true`      | Changes the current URL so if user refreshes page, they will remain in collaboration session with other users
`errorMessage` | `true`      | Provides an error message when user gets disconnected from signaling server
`showPeers`    | `true`      | Show the other peers that are user is collaborating with
`peersLeft`    | `true`      | The peer lists appear to the left of document if `true`, otherwise to the right.
`placeholder`  | message     | Specify the placeholder message that will appear in the document. Defaults to `Share the link to invite collaborators to your room`

**Example**

```js
// script.js
import Peer from 'peerjs_fork_firefox40';
import Conclavity from 'conclavity';

const peer = new Peer({
  host: location.hostname,
  port: location.port || (location.protocol === 'https:' ? 443 : 80),
  path: '/peerjs',
  debug: 3
});

const demo = new Conclavity({
  peer: peer,
  shareLink: false,
  icons: false,
  video: false,
  changeUrl: false,
  placeholder: 'This is an example!'
});
```

---
## Debug

If you have cloned the repository, made changes and want to see how those changes look. You can run

```shell
npm run debug
```

and open up the `debug.html` file listed under the `example` folder. You should be able to see any changes you've made.

---
## License

MIT
