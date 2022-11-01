import {Sandbox, SandboxOptions, SandboxPlayer} from "ZEPETO.Multiplay";
import {Player, Vector3} from "ZEPETO.Multiplay.Schema";
interface tf{
    Id:string,
    position:Vector3,
    rotation:Vector3,
    scale:Vector3
}

interface inforTween{
    Id: string,
    position: Vector3,
    nextIndex : number,
    loopCount:number
}

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

        this.onMessage("SyncTransform", (client, message:tf) => {
            let syncTransform:tf = {
                Id :message.Id,
                position :message.position,
                rotation : message.rotation,
                scale :message.scale
            };
            this.broadcast("SyncTransform"+message.Id, syncTransform);
        });

        this.onMessage("SyncTween", (client, message:inforTween) => {
            let syncTween:inforTween = {
                Id :message.Id,
                position :message.position,
                nextIndex : message.nextIndex,
                loopCount :message.loopCount
            };
            this.broadcast("SyncTween"+message.Id, syncTween);
        });
        this.onMessage("CheckMaster", (client, message) => {
            if(this.masterClientSessionId != this.sessionIdQueue[0]) {
                this.masterClientSessionId = this.sessionIdQueue[0];
                console.log("master->", this.masterClientSessionId)
            }
            this.broadcast("CheckMaster", this.masterClientSessionId);
        });

    }

    onJoin(client: SandboxPlayer) {
        this.sessionIdQueue.push(client.sessionId.toString());
        if(this.masterClientSessionId != this.sessionIdQueue[0]) {
            this.masterClientSessionId = this.sessionIdQueue[0];
            console.log("master->", this.masterClientSessionId)
        }
        console.log("join");
        
        const player = new Player();
        player.sessionId = client.sessionId;
        var players = this.state.players;

        players.set(client.sessionId, player);
    }

    onLeave(client: SandboxPlayer, consented?: boolean) {
        this.sessionIdQueue.splice((this.sessionIdQueue.indexOf(client.sessionId)),1)
        if(this.masterClientSessionId != this.sessionIdQueue[0]) {
            this.masterClientSessionId = this.sessionIdQueue[0];
            this.broadcast("CheckMaster", this.masterClientSessionId);
            console.log("master->", this.masterClientSessionId)
        }
    }
}