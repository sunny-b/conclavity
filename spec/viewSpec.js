import View from '../lib/view';
import { JSDOM } from 'jsdom';

const DOM = new JSDOM(`<html>
  <body>
    <div id="conclave" class="hide">
      <div class="text-wrapper">
        <div id="peerId">
          <p class='no-margin-bottom'>Peers:</p>
        </div>
        <div class="editor">
          <div class="header">
            <p class='share-link hide'>
              <a id='myLink' target="_blank">Public Share Link</a>
              <span id="myLinkInput" class="disappear aside"></span>
              <span class="copy-container" data-tooltip="Copy to Clipboard"></span>
              <span class="copy-status">Copied!</span>
            </p>
            <div class="buttons">
              <button id="download" type="button">Save</button>
              <label id="upload" for="file">Upload</label>
              <input id="file" type="file" accept=".txt, .js, .rb, .md, .pug, .py"/>
            </div>
          </div>
          <div class="textarea">
            <textarea row="10" col="20"></textarea>
          </div>
        </div>
      </div>
      <div class="video-modal hide">
        <div class="video-bar"></div>
        <div class="video-container">
          <video></video>
        </div>
      </div>
    </div>
  </body>
</html>`);
global.window = DOM.window;
global.document = DOM.window.document;
global.document.execCommand = () => {};
global.navigator = {browser: 'foo'};
const $ = global.jQuery = require('jquery')(window);

describe('View', () => {
  describe("updateShareLink", () => {
    let view, link;

    beforeEach(() => {
      view = new View({});
      link = document.querySelector("#myLink").href;
    })

    it("changes the link href value", () => {
      const host = 'http://localhost:3000/'
      const id = '123';
      view.updateShareLink(id, host);
      const updatedLink = document.querySelector("#myLink").href;

      expect(link).not.toEqual(updatedLink);
    });

    it("sets the link's href attribute", () => {
      const host = 'http://localhost:3000/'
      const id = '123';
      view.updateShareLink(id, host);
      const href = document.querySelector("#myLink").getAttribute('href');
      expect(href).toEqual(host+"?" + id);
    });

    it("sets the input's value attribute", () => {
      const host = 'http://localhost:3000/'
      const id = '123';
      view.updateShareLink(id, host);
      const value = document.querySelector("#myLinkInput").textContent
      expect(value).toEqual(host+"?" + id);
    });
  });

  describe('enableEditor', () => {
    const view = new View({});

    it('removes hide class from conclave div', () => {
      expect($('#conclave').hasClass('hide')).toBe(true);
      view.enableEditor();
      expect($('#conclave').hasClass('hide')).toBe(false);
    });
  });
});
