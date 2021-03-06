let io = require('socket.io');

const ip = require('ip');

const http = require('http');

class Server {

    constructor(store) {

        this.store = store;

        this.joinedSockets = [];

        this.http = http;

        this.connected = false;

        this.io;

    }

    create(port = 2020) {

        return new Promise((resolve, reject) => {

            //create a server object:
            this.http = this.http.createServer();

            this.isServer = true;

            this.io = io(this.http);

            // Make the connection state connected
            this.store.dispatch({type:'CONNECTION_RESOLVED'});

            this.io.on('connection', (client) => {

                this.joinedSockets.push(client)

                this.handle(client)

            });

            this.http.listen(port);

            // Let's set the port

            this.store.dispatch({
                type: 'PORT_CHANGED',
                port
            })

            // Let's set the admin class

            this.store.dispatch({
                type: 'IS_SERVER',
                ip: ip.address()
            });

            resolve();

        })

    }

    handle(socket) {

        // Handles socket

        console.log("Joined");

        socket.on('join', (data) => {

            this.store.dispatch({
                type: 'JOIN',
                userName: data,
                socket
            });
        });

        socket.on('disconnect', () => {
            console.log(socket,'disconnected')
            this.store.dispatch({type:'USER_DISCONNECT',socket})
        })
   

        socket.on('letsSync', ()=>{
            this.sync(socket)
        });

        socket.on("contentChange", (data) => {
            for (let change of data.changes) {
                window.mainEditor.executeEdits("", [{
                    range: new monaco.Range(change.range.startLineNumber,
                        change.range.startColumn,
                        change.range.endLineNumber,
                        change.range.endColumn),
                    text: change.text
                }]);
            }

        });

        socket.on("cursorChange", (data) => {

            // console.log(data)

            // console.log(monaco)

            let selections = [];

            for (let selection of data.selections) {
                selections.push(new monaco.Selection(
                    selection.startLineNumber,
                    selection.startColumn,
                    selection.endLineNumber,
                    selection.endColumn
                ));
            }

            window.mainEditor.setSelections(selections);

        });

        socket.on("scrollChange", (data) => {

            // console.log(data)

            window.mainEditor.setScrollTop(data.scrollTop);

            window.mainEditor.setScrollLeft(data.scrollLeft);

        });
        // Let's send them current data
     
     
        
        this.sync(socket)

    }

    disConnect() {

        this.io.close(()=>{console.log("Server Closed!")});

    }

    emit(event, data) {
        this.io.emit(event, data);
    }

    sync(socket){

        socket.emit("data", window.mainEditor.getValue());

        socket.emit("languageChanged", this.store.getState().selectedLanguage);

        socket.emit("cursorChange", {
            selections: window.mainEditor.getSelections()
        });

        socket.emit("scrollChange", {
            scrollLeft: window.mainEditor.getScrollLeft(),
            scrollTop: window.mainEditor.getScrollTop()
        });
    }

}

module.exports = Server;