import {Sandbox, SandboxOptions, SandboxPlayer} from "ZEPETO.Multiplay";
import {Player} from "ZEPETO.Multiplay.Schema";


export default class extends Sandbox {
    private sessionIdQueue: string[] = [];
    private masterClientSessionId: string;

    onCreate(options: SandboxOptions) {
        this.onMessage("echo", (client, message) => {
            console.log(`Echo onMessage from ${client.sessionId}, -> ${message}`);

            // send current client
            client.send("echo", "echo to sender : " + message);

            // Broadcast all connected client
            this.broadcast("echo", "echo to all : " + message);
        });
        this.onMessage("Click", (client, message) => {
            console.log(`Click ${client.sessionId}, -> ${message}`);

            // send current client
            client.send("Clicks", "echo to sender : " + message);

            // Broadcast all connected client
            this.broadcast("Click", "echo to all : " + message);
        });

        this.onMessage("boxPos", (client, message) => {
            console.log(message);

            this.broadcast("boxPos", "echo to sender : " + message);
        });
    }

    onJoin(client: SandboxPlayer) {
        this.sessionIdQueue.push(client.sessionId.toString());
        this.masterClientSessionId = this.sessionIdQueue[0];
        
        const player = new Player();
        player.sessionId = client.sessionId;
        var players = this.state.players;

        players.set(client.sessionId, player);

        console.log('onJoin!!!!');
    }

    onLeave(client: SandboxPlayer, consented?: boolean) {
        this.sessionIdQueue.splice((this.sessionIdQueue.indexOf(client.sessionId)),1)
        this.masterClientSessionId = this.sessionIdQueue[0];
    }
}