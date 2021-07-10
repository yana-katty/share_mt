var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { html, css, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
let Maessage = class Maessage extends LitElement {
    constructor() {
        super();
        this.defaultSignalingEndpoint = 'ws://defaultSignalingEndpoint';
        this.defaultSendUserId = 'myswitch';
        this.canTryConnect = true; //接続可能な状態か管理
        this.connected = false;
        this.localMessages = '';
        this.defaultMyUserId = Math.random().toString(32).substring(2);
        this.nowSignaling = false; //相手とシグナリング可能な状態か
        this.myUserID = '';
        this.sendUserID = '';
        this.wsOnMessage = (event) => {
            console.log("message", event);
            let eventData = JSON.parse(event.data);
            console.log("eventData", eventData);
            // 以下の処理を別関数で分割させたいな
            if (eventData.from == "server") { //server からのイベント
                if (eventData.eventType == "getUserState") {
                    if (eventData.data.userId == this.sendUserID) {
                        if (eventData.data.state == "connecting" && this.nowSignaling == false) {
                            //接続処理 RTCPeerConnection.signalingState が同時に have-local-offer へ遷移する問題のため、現在は getUserState を実行した後者側から、offer を送り始める協定で
                            // https://developer.mozilla.org/en-US/docs/Web/API/RTCPeerConnection/signalingState
                            console.log("userID:", eventData.data.userId, "is connecting signaling point. start signaling");
                            this.initLocalOffer();
                        }
                    }
                }
            }
            else if (eventData.from == this.sendUserID) {
                if (eventData.eventType == "sendLocalOffer") {
                    console.log("get LocalOffer from ", this.sendUserID);
                    this.initRemoteAnswer(eventData.data.localOffer);
                }
                else if (eventData.eventType == "sendRemoteAnswer") {
                    console.log("get remoteAnswer from", this.sendUserID);
                    this.webRTCConnection.setRemoteDescription(eventData.data.remoteAnswer);
                }
                else if (eventData.eventType == "sendICECandidate") {
                    console.log("get remote ICECandidate from", this.sendUserID);
                    this.webRTCConnection.addIceCandidate(eventData.data.ICECandidate);
                }
            }
        };
        this.wsOnClose = (event) => {
            console.log("close", event);
            this.canTryConnect = true;
        };
        window.addEventListener('keydown', async (event) => {
            if (this.connected && event.code) {
                this.keyDownEvent(event.code);
            }
        });
    }
    //ws部
    wsConnect(url) {
        return new Promise((resolve, reject) => {
            let ws = new WebSocket(url);
            ws.onopen = (event) => {
                console.log("connected", event);
                resolve(ws);
            };
            ws.onerror = (event) => {
                console.log("error", event);
                reject(event);
            };
        });
    }
    //webrtc 部
    disconnect() {
        this.webRTCConnection.close();
    }
    async connect() {
        console.log('connect!だよんね');
        // webrtc RTCPeerConnection の初期設定
        this.webRTCConnection = new RTCPeerConnection({
            iceServers: [
                {
                    urls: "stun:stun.l.google.com:19302"
                }
            ]
        });
        this.webRTCConnection.addEventListener('icecandidate', async (e) => {
            console.log('local connection ICE candidate: ', e.candidate);
            //
            if (e.candidate) {
                let message = { sendToUserid: this.sendUserID, eventType: "sendICECandidate", data: { ICECandidate: e.candidate } };
                this.ws.send(JSON.stringify(message));
            }
        });
        this.webRTCConnection.addEventListener('datachannel', this._onRemoteDataChannel.bind(this));
        // シグナリングのための websocket 接続
        this.myUserID = this.InputMyUserIdElement.value.trim(); // input からユーザidの取得
        this.canTryConnect = false; //false にすることで、input を編集できなく、再度connectできないようにする
        console.log('my user id', this.myUserID);
        let signalingEndpoint = this.InputsignalingEndpointElement.value.trim(); // input からユーザidの取得
        this.ws = await this.wsConnect(signalingEndpoint + "/?userid=" + this.myUserID); // / の有無を判定できるように URL インターフェイスを使いたい
        this.ws.onmessage = this.wsOnMessage;
        this.ws.onclose = this.wsOnClose;
        this.sendUserID = this.InputSendUserIdElement.value.trim(); // input からユーザidの取得
        // webSocket 接続処理
        let message = { sendToUserid: 'server', eventType: "getUserState", data: { userId: this.sendUserID } };
        this.ws.send(JSON.stringify(message));
        message = { sendToUserid: 'server', eventType: "subscribeUserStateChange", data: { userId: this.sendUserID } };
        this.ws.send(JSON.stringify(message));
        //あとは、wsOnMessage で相手が connecting になった時に処理をする
    }
    _onLocalMessageReceived(event) {
        console.log(`Remote message received by: ${event.data}`);
        this.localMessages += event.data + '\n';
    }
    _onRemoteDataChannel(event) {
        console.log(`onRemoteDataChannel: ${JSON.stringify(event)}`);
        this.remoteChannel = event.channel;
        this.remoteChannel.binaryType = 'arraybuffer';
        this.remoteChannel.addEventListener('message', this._onLocalMessageReceived.bind(this));
        this.remoteChannel.addEventListener('close', () => {
            console.log('Remote channel closed!');
            this.connected = false;
        });
    }
    async initLocalOffer() {
        //init 側が datachanel を作成する
        const dataChannelParams = { ordered: true };
        this.webRTCChannel = this.webRTCConnection
            .createDataChannel('messaging-channel', dataChannelParams);
        this.webRTCChannel.binaryType = 'arraybuffer';
        this.webRTCChannel.addEventListener('open', () => {
            console.log('channel open!');
            this.connected = true;
            this.webRTCChannel.send("hi you!");
        });
        this.webRTCChannel.addEventListener('close', () => {
            console.log('channel closed!');
            this.connected = false;
            //this.canTryConnect = true;//遷移ロジック未実装
        });
        this.webRTCChannel.addEventListener('message', this._onLocalMessageReceived.bind(this));
        //localoffer を作成
        const localOffer = await this.webRTCConnection.createOffer();
        console.log(`Got local offer ${JSON.stringify(localOffer)} and send to ${this.sendUserID}`);
        //localoffer を送信
        let message = { sendToUserid: this.sendUserID, eventType: "sendLocalOffer", data: { localOffer: localOffer } };
        this.ws.send(JSON.stringify(message));
        await this.webRTCConnection.setLocalDescription(localOffer);
    }
    ;
    async initRemoteAnswer(localOffer) {
        await this.webRTCConnection.setRemoteDescription(localOffer);
        const remoteAnswer = await this.webRTCConnection.createAnswer();
        console.log(`Got remote answer ${JSON.stringify(remoteAnswer)} and send to ${this.sendUserID}`);
        //remoteAnswer を送信
        let message = { sendToUserid: this.sendUserID, eventType: "sendRemoteAnswer", data: { remoteAnswer: remoteAnswer } };
        this.ws.send(JSON.stringify(message));
        await this.webRTCConnection.setLocalDescription(remoteAnswer);
    }
    ;
    async sendCommandbyWebrtc(command) {
        console.log(`send command: ${command}`);
        let message = { eventType: "sendCommand", data: { command: command } };
        this.webRTCChannel.send(JSON.stringify(message));
    }
    render() {
        return html `
            <p>remote switch beta!</p>
            <section>
             <div>
        signaling endpoint
        <input type="text" id='signalingEndpoint' ?disabled=${!this.canTryConnect} value=${this.defaultSignalingEndpoint} />
      </div>
        <div>
        My userid
        <input type="text" id='InputMyUserId' ?disabled=${!this.canTryConnect} value=${this.defaultMyUserId} />
      </div>
       <div>
        Send userid
        <input type="text" id='InputSendUserId' ?disabled=${!this.canTryConnect} value=${this.defaultSendUserId} />
      </div>
  
            <div>
      <button ?disabled="${this.connected || !this.canTryConnect}" @click="${this.connect.bind(this)}">Connect</button>
      <button ?disabled="${!this.connected}" @click="${this.disconnect.bind(this)}">Disconnect</button>
  </div>
  <br/>
   <div>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("Left"); }}">←</button>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("Up"); }}">↑</button>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("Down"); }}">↓</button>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("Right"); }}">→</button>
<a>　　　</a>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("A"); }}">A</button>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("B"); }}">B</button>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("X"); }}">X</button>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("Y"); }}">Y</button>
   </div>
   <br/>
    <div>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("L"); }}">L</button>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("R"); }}">R</button>
   </div>
    <br/>
    <div>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("Plus"); }}">Plus</button>
   <button ?disabled="${!this.connected}" @click="${() => { this.sendCommandbyWebrtc("Minus"); }}">Minus</button>
   </div>


</section>`;
    }
    async keyDownEvent(code) {
        switch (code) {
            case 'KeyA':
                this.sendCommandbyWebrtc("Left");
                break;
            case 'KeyW':
                this.sendCommandbyWebrtc("Up");
                break;
            case 'KeyS':
                this.sendCommandbyWebrtc("Down");
                break;
            case 'KeyD':
                this.sendCommandbyWebrtc("Right");
                break;
            case 'Enter':
                this.sendCommandbyWebrtc("A");
                break;
            case 'Space':
                this.sendCommandbyWebrtc("B");
                break;
            case 'Period':
                this.sendCommandbyWebrtc("X");
                break;
            case 'Slash':
                this.sendCommandbyWebrtc("Y");
                break;
            case 'KeyG':
                this.sendCommandbyWebrtc("Plus");
                break;
            case 'KeyF':
                this.sendCommandbyWebrtc("Minus");
                break;
        }
    }
};
Maessage.styles = css `p { color: blue }`;
__decorate([
    property()
], Maessage.prototype, "canTryConnect", void 0);
__decorate([
    property()
], Maessage.prototype, "connected", void 0);
__decorate([
    property()
], Maessage.prototype, "localMessages", void 0);
__decorate([
    property()
], Maessage.prototype, "defaultMyUserId", void 0);
__decorate([
    query('#InputMyUserId', true)
], Maessage.prototype, "InputMyUserIdElement", void 0);
__decorate([
    query('#InputSendUserId', true)
], Maessage.prototype, "InputSendUserIdElement", void 0);
__decorate([
    query('#signalingEndpoint', true)
], Maessage.prototype, "InputsignalingEndpointElement", void 0);
__decorate([
    property()
], Maessage.prototype, "nowSignaling", void 0);
Maessage = __decorate([
    customElement('message-test')
], Maessage);
export { Maessage };
//# sourceMappingURL=message.js.map