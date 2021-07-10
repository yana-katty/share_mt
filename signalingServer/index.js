const server = require("ws").Server;
const s = new server({ port: 8100 });
let connections = new Map() //全てのコネクションを管理するmap。二重 Map で管理する。 1 つ目のkeyはuserid 、2 つめのkeyは ws と subscribeUserStateChangeTarget;
let subscribeUserStateMap = new Map();//key が userid,value が set 。このsetに存在するuseridに通知する。

s.on("connection", (ws, req) => {
    console.log("[connecting] coonect ip:", req.socket.remoteAddress, ", port:", req.socket.remotePort, ", x-forwarded-for", req.headers['x-forwarded-for']);
    console.log("[connecting] request url: ",req.url);
    const userid = new URLSearchParams(req.url.split("/")[1]).get("userid");
    console.log("[connecting] userid:",userid);
    if (userid == null || userid == 'server') {//server はこちらからのメッセージと識別するために予約しておく
        console.log("[connecting] userid is none. close websocket")
        ws.close(4000, "userid is none");//reason code は適当
        return;
    }

    if (connections.has(userid)) {
        //すでに userid のコネクションがが存在していたら一応クローズ処理
        console.log("[connecting] reset", userid, "connection");
        connections.get(userid).get('ws').close(4100, "same userid try connect");//reason code は適当
        connections.delete(userid);//既存のものは削除
    }
    connections.set(userid, new Map());
    connections.get(userid).set('ws', ws);
    connections.get(userid).set('subscribeUserStateChangeTarget', new Set());

    // ここから subscribeUserStateChange している userid に通知
    if (subscribeUserStateMap.has(userid)) {
        for (const notifyUserid of subscribeUserStateMap.get(userid)) {
            if (connections.has(notifyUserid)) {
                connections.get(notifyUserid).get('ws').send(JSON.stringify({ from: 'server', eventType: 'UserStateChange', data: { userId: userid, state:"connecting"} }));
            }
        }
    }


    ws.on("message", message => {
        console.log("[message] message comming. userid:", userid, ",message", message);
    
        let messageObject
        try{
            messageObject = JSON.parse(message);
        } catch (e) {
            console.log("[message] failed JSON parse");
            return
        }

        const sendToUserid = messageObject['sendToUserid'];
        if (!sendToUserid) {
            console.log("[message] message does not contain sendToUserid");
            return;
        }
        // sendToUserid が server の場合は server イベントを実施し終了させる
        if (sendToUserid == 'server') {
            processingEvent(messageObject, userid, ws);
            return;
        }

        // ここから 他のuser に送信イベント
        if (!connections.has(sendToUserid)) {
            console.log("[message] sendToUserid does not exsit");
            // クライアントに存在しないことを通知
            ws.send(JSON.stringify({ from: 'server', eventType: 'notExistUser', sendToUserid: sendToUserid}));
            return;
        }
        messageObject['from'] = userid;
        connections.get(sendToUserid).get('ws').send(JSON.stringify(messageObject));
    });

    // 接続が切れた場合
    ws.on('close', () => {
        console.log('[close] lost a client. userid:', userid);
        
        //subscribeUserStateMap から登録しているものを削除処理
        if ((connections.has(userid)) && connections.get(userid).has('subscribeUserStateChangeTarget')) {
            let subscribeUserSet = connections.get(userid).get('subscribeUserStateChangeTarget');
            for (const subscribeUserId of subscribeUserSet) {
                subscribeUserStateMap.get(subscribeUserId).delete(userid);
            }
        }

        // todo :disconnecting ステートを送信する実装

        connections.delete(userid);//切断済みのuseridの ws が残らないようにするため
    });
});

processingEvent = (messageObject, myUserid,ws) => {
    switch (messageObject['eventType']) {
        case 'subscribeUserStateChange':
            subscribeUserStateChange(messageObject, myUserid);
            return;
        case 'unSubscribeUserState':
            // todo : 実装
            return;
        case 'getUserState':
            getUserState(messageObject, myUserid, ws);
            return;
    }
}

subscribeUserStateChange = (messageObject, myUserid) => {
    let subscribeUserId = messageObject['data']['userId'];
    if (!subscribeUserStateMap.has(subscribeUserId)) {//subscribeConnectUserMap に値を追加するのが初めての場合、setを初期化する
        subscribeUserStateMap.set(subscribeUserId, new Set())
    }
    subscribeUserStateMap.get(subscribeUserId).add(myUserid);
    //自身からもサブスライブしているユーザがわかるように登録していく
    connections.get(myUserid).get('subscribeUserStateChangeTarget').add(subscribeUserId);
    return;
}

getUserState = (messageObject, myUserid, ws) => {
    let subscribeUserId = messageObject['data']['userId'];

    //今は State は connecting と disconnecting のみ
    if (connections.has(subscribeUserId)) {
        ws.send(JSON.stringify({ from: 'server', eventType: 'getUserState', data: { userId: subscribeUserId, state: "connecting" } }));
    } else {
        ws.send(JSON.stringify({ from: 'server', eventType: 'getUserState', data: { userId: subscribeUserId, state: "disconnecting" } }));
    }
    return;
}