import Feather from 'feather-icons';
import EventEmitter from 'eventemitter3';
import DetectRTC from 'detectrtc';
import $ from 'jquery';

class View extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.icons = Feather.icons;
    this.calling = [];
  }

  enableEditor() {
    document.getElementById('conclave').classList.remove('hide');
  }

  copyToClipboard(element) {
    const $temp = $("<input>");
    $("body").append($temp);
    $temp.val($(element).text()).select();
    document.execCommand("copy");
    $temp.remove();

    this.showCopiedStatus();
  }

  showCopiedStatus() {
    $('.copy-status').addClass('copied');

    setTimeout(() => $('.copy-status').removeClass('copied'), 1000);
  }

  displayWrongBrowser() {
    alert(
      `This browser is incompatible with WebRTC.
      Please user a newest version of Chrome/Firefox.`
    );
  }

  displayServerError() {
    document.querySelector('.server-error').classList.remove('disappear');
  }

  updateShareLink(id, host) {
    const shareLink = host + '?' + id;
    const aTag = document.querySelector('#myLink');
    const pTag = document.querySelector('#myLinkInput');

    aTag.setAttribute('href', shareLink);
    pTag.textContent = shareLink;
  }

  updateUrl(id, host) {
    const newURL = host + '?' + id;
    window.history.pushState({}, '', newURL);
  }

  getPeerElemById(peerId) {
    return document.getElementById(peerId);
  }

  getPeerFlagById(peerId) {
    return document.getElementById(peerId).children[0];
  }

  addBeingCalledClass(peerId) {
    const peerLi = document.getElementById(peerId);

    peerLi.classList.add('beingCalled');
  }

  addCallingClass(peerId) {
    const peerLi = document.getElementById(peerId);

    peerLi.classList.add('calling');
  }

  makeOwnName(name, color) {
    const $listItem = $('<li></li>');
    const $node = $('<span></span>');

    $node.text(name);
    $node.css('background-color', color);
    $node.addClass('peer');

    $listItem.append($node, '(You)');
    $('#peerId').append($listItem);
  }

  addToListOfPeers(peerId, color, name) {
    const $listItem = $('<li></li>');
    const $node = $('<span></span>');

    $node.text(name);
    $node.css('background-color', color);
    $node.addClass('peer');

    if (this.options.video) this.attachVideoEvent(peerId, $listItem.get(0));

    $listItem.attr('id', peerId);
    $listItem.append($node);
    $('#peerId').append($listItem);

    if (this.options.icons) {
      const phone = this.icons.phone.toSvg({ class: 'phone' });
      const phoneIn = this.icons['phone-incoming'].toSvg({ class: 'phone-in' });
      const phoneOut = this.icons['phone-outgoing'].toSvg({ class: 'phone-out' });
      const phoneCall = this.icons['phone-call'].toSvg({ class: 'phone-call' });

      $listItem.append(phone, phoneIn, phoneOut, phoneCall);
    }
  }

  removeFromListOfPeers(peerId) {
    document.getElementById(peerId).remove();
  }

  bindViewEvents() {
    this.addIcons();
    this.bindCopyEvent();
    this.attachModalEvents();
    this.checkBrowser();

    if (this.options.errorMessage) {
      this.attachErrorMessage();
    }
  }

  checkBrowser() {
    if (!DetectRTC.isWebRTCSupported) {
      this.displayWrongBrowser();
    }
  }

  attachErrorMessage() {
    const $errMsg = $(
      `<div class="server-error disappear">
        <p>Lost connection. Don't panic, you can still talk to peers. Please refresh to reconnect.</p>
        <span class="x">
          ${this.icons.x.toSvg({class: 'server-msg-x', 'stroke-width': 2, color: 'black'})}
        </span>
      </div>`
    );

    $('.textarea').append($errMsg);
    $('.server-msg-x').click(() => $('.server-error').addClass('disappear'));
  }

  bindCopyEvent() {
    $('.copy-container').click(() => this.copyToClipboard('#myLinkInput'));
  }

  addIcons() {
    const minimize = this.icons.minus.toSvg({ 'stroke-width': 3, color: 'white', class: 'minimize' });
    const exit = this.icons.x.toSvg({ 'stroke-width': 3, color: 'white', class: 'exit' });
    const copy = this.icons.copy.toSvg({ color: 'rgb(17, 117, 232)', class: 'copy-link' });

    $('.video-bar').append(minimize, exit);
    $('.copy-container').append(copy);
  }

  answerCall(peerId) {
    const peerLi = document.getElementById(peerId);

    if (peerLi) {
      peerLi.classList.remove('calling');
      peerLi.classList.remove('beingCalled');
      peerLi.classList.add('answered');
    }
  }

  videoCall(callObj) {
    const peerFlag = this.getPeerElemById(callObj.peer);
    this.addBeingCalledClass(callObj.peer);

    navigator.mediaDevices.getUserMedia({audio: true, video: true})
    .then(ms => {
      peerFlag.onclick = () => {
        this.answerCall(callObj.peer);
        this.emit('answerCall', callObj, ms);
      };
    });
  }

  streamVideo(stream, callObj) {
    const peerFlag = this.getPeerFlagById(callObj.peer);
    const peerClone = peerFlag.cloneNode(true);
    const modal = document.querySelector('.video-modal');
    const vidContainer = document.querySelector('.video-container');
    const vid = document.querySelector('.video-modal video');

    this.answerCall(callObj.peer);
    peerClone.style.backgroundColor = peerClone.style.backgroundColor.replace('0.5', '1');

    modal.classList.remove('hide');
    vidContainer.appendChild(peerClone);
    vid.srcObject = stream;
    vid.play();

    this.bindVideoEvents(callObj);
  }

  attachVideoEvent(peerId, node) {
    node.onclick = () => {
      if (!this.calling.includes(peerId)) {
        navigator.mediaDevices.getUserMedia({audio: true, video: true})
        .then(ms => {
          this.addCallingClass(peerId);
          this.calling.push(peerId);
          this.emit('videoCall', peerId, ms);
        });
      }
    }
  }

  closeVideo(peerId) {
    const modal = document.querySelector('.video-modal');
    const peerLi = this.getPeerElemById(peerId);

    modal.classList.add('hide');
    peerLi.classList.remove('answered', 'calling', 'beingCalled');
    this.calling = this.calling.filter(id => id !== peerId);
    document.querySelector('.video-container span').remove();

    this.attachVideoEvent(peerId, peerLi);
  }

  bindVideoEvents(callObj) {
    const exit = document.querySelector('.exit');
    const minimize = document.querySelector('.minimize');
    const modal = document.querySelector('.video-modal');
    const bar = document.querySelector('.video-bar');
    const vid = document.querySelector('.video-modal .video-container');

    minimize.onclick = () => {
      bar.classList.toggle('mini');
      vid.classList.toggle('hide');
    };
    exit.onclick = () => {
      modal.classList.add('hide');
      callObj.close()
    };
  }

  attachModalEvents() {
    let xPos = 0;
    let yPos = 0;
    const modal = document.querySelector('.video-modal');
    const dragModal = e => {
      xPos = e.clientX - modal.offsetLeft;
      yPos = e.clientY - modal.offsetTop;
      window.addEventListener('mousemove', modalMove, true);
    }
    const setModal = () => { window.removeEventListener('mousemove', modalMove, true); }
    const modalMove = e => {
      modal.style.position = 'absolute';
      modal.style.top = (e.clientY - yPos) + 'px';
      modal.style.left = (e.clientX - xPos) + 'px';
    };

    document.querySelector('.video-modal').addEventListener('mousedown', dragModal, false);
    window.addEventListener('mouseup', setModal, false);
  }
}

export default View;
