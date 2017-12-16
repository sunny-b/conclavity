import Peer from 'peerjs_fork_firefox40';
import SimpleMDE from 'simplemde';
import $ from 'jquery';

import Controller from './build/controller';


class Conclave {
  constructor(options) {
    const defaults = {
      peerId: null,
      peer: null,
      shareLink: true,
      icons: true,
      video: true,
      changeUrl: true,
      errorMessage:true,
      showPeers: true,
      peersLeft: true,
      placeholder: 'Share the link to invite collaborators to your room'
    };
    options = Object.assign(defaults, options);


    this.generateConclaveEditor(options);
    this.initializeController(options);
  }

  generateConclaveEditor(options) {
    const editorHTMLStr = `<div class="text-wrapper">
                          <div id="peerId">
                            <p class='no-margin-bottom'>Peers:</p>
                          </div>
                          <div class="editor">
                            <div class="header">
                              <div class="peer-toggle show"></div>
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
                        </div>`;

    const $editor = $(editorHTMLStr);
    $('#conclave').append($editor).addClass('hide');
    if (options.shareLink) $('.share-link').removeClass('hide');
    if (!options.peersLeft) $('.text-wrapper').addClass('reverse');
    if (!options.showPeers) $('#peerId').addClass('disappear');
  }

  initializeController(options) {
    const peerOptions = [{
      host: 'conclavepeerjs.herokuapp.com',
      port: 443,
      secure: true,
      config: {'iceServers':
        [
          { url: 'stun:stun1.l.google.com:19302' },
          { url: 'turn:numb.viagenie.ca',
            credential: 'conclave-rulez',
            username: 'sunnysurvies@gmail.com'
          }
        ]
      },
      debug: 1
    }];

    if (options.peerId) peerOptions.unshift(options.peerId);

    const peer = options.peer || new Peer(...peerOptions);

    const locale = !!location.origin.match(/file:\/\//) ? location.href.split('?')[0] : location.origin;

    this.controller = new Controller(
      (location.search.slice(1) || '0'),
      locale,
      peer,
      new SimpleMDE({
        placeholder: options.placeholder,
        spellChecker: false,
        toolbar: false,
        autofocus: false,
        indentWithTabs: true,
        status: false,
        tabSize: 4,
        indentUnit: 4,
        lineWrapping: false,
        shortCuts: []
      }),
      options
    );

    this.controller.init();
  }
}

export default Conclave;
