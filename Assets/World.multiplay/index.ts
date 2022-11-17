import {Sandbox, SandboxOptions, SandboxPlayer} from "ZEPETO.Multiplay";
import {Player, Vector3, DOTween, SyncTransform} from "ZEPETO.Multiplay.Schema";

interface tf {
    Id: string,
    position: Vector3,
    rotation: Vector3,
    scale: Vector3
}

interface inforTweenOptimization {
    Id: string,
    position: Vector3,
    nextIndex: number,
    loopCount: number,
    masterTimeStamp: number,
}


export default class extends Sandbox {
    private sessionIdQueue: string[] = [];
    private masterClientSessionId: string;
    private masterClient = () => this.loadPlayer(this.masterClientSessionId);

    onCreate(options: SandboxOptions) {
        for(let i=0; i<10; i++) {
            let syncTransform = new SyncTransform();
            this.state.SyncTransforms.set(i.toString(), syncTransform);
        }
            
        this.onMessage("onChangedDOTween", (client, message) => {
            const tween = this.state.DOTweens.get(message.Id);

            const position = new Vector3();
            position.x = message.position.x;
            position.y = message.position.y;
            position.z = message.position.z;

            tween.position = position;
            tween.sendTime = message.sendTime;
        });

        this.onMessage("onChangedTweenState", (client, message) => {
            let tween: DOTween;
            if (!this.state.DOTweens.has(message.Id)) {
                tween = new DOTween();
                this.state.DOTweens.set(message.Id, tween);
            } else {
                tween = this.state.DOTweens.get(message.Id);
            }
            tween.state = message.state;
            tween.nowIndex = message.nowIndex;
            tween.nextIndex = message.nextIndex;
            tween.currentOneWayCount = message.currentOneWayCount;
        });

        this.onMessage("SyncTransform", (client, message: tf) => {
            let syncTransform : SyncTransform;
            if (this.state.SyncTransforms.has(message.Id)) {
                syncTransform = this.state.SyncTransforms.get(message.Id);
            } else {
                syncTransform = new SyncTransform();
                this.state.SyncTransforms.set(message.Id, syncTransform);
            }
            syncTransform.Id = message.Id;
            
            syncTransform.position = new Vector3();
            syncTransform.position.x = message.position.x;
            syncTransform.position.y = message.position.y;
            syncTransform.position.z = message.position.z;
            
            syncTransform.rotation = new Vector3();
            syncTransform.rotation.x = message.rotation.x;
            syncTransform.rotation.y = message.rotation.y;
            syncTransform.rotation.z = message.rotation.z;
            
            syncTransform.scale = new Vector3();
            syncTransform.scale.x = message.scale.x;
            syncTransform.scale.y = message.scale.y;
            syncTransform.scale.z = message.scale.z;
            
            console.log(syncTransform.Id);
        });

        this.onMessage("RequestPosition", (client, message: string) => {
            this.masterClient().send("RequestPosition" + message, "");
        });

        this.onMessage("SyncTweenOptimization", (client, message: inforTweenOptimization) => {
            let syncTween: inforTweenOptimization = {
                Id: message.Id,
                position: message.position,
                nextIndex: message.nextIndex,
                loopCount: message.loopCount,
                masterTimeStamp: message.masterTimeStamp,
            };
            this.broadcast("ResponsePosition" + message.Id, syncTween, {except: this.masterClient()});
            /*setTimeout(() => {
                this.broadcast("ResponsePosition" + message.Id, syncTween, {except: this.masterClient()});
            }, 1000);*/
        });

        this.onMessage("CheckServerTimeRequest", (client, message) => {
            let Timestamp = +new Date();
            client.send("CheckServerTimeResponse", Timestamp);
        });

        this.onMessage("CheckMaster", (client, message) => {
            if (this.masterClientSessionId != this.sessionIdQueue[0]) {
                this.masterClientSessionId = this.sessionIdQueue[0];
                console.log("master->", this.masterClientSessionId)
            }
            this.broadcast("CheckMaster", this.masterClientSessionId);
        });

        this.onMessage("PausePlayer", (client) => {
            this.sessionIdQueue.splice((this.sessionIdQueue.indexOf(client.sessionId)), 1)
            this.sessionIdQueue.push(client.sessionId.toString());
            if (this.masterClientSessionId != this.sessionIdQueue[0]) {
                this.masterClientSessionId = this.sessionIdQueue[0];
                this.broadcast("CheckMaster", this.masterClientSessionId);
                console.log("master->", this.masterClientSessionId)
            }
        });
    }

    onJoin(client: SandboxPlayer) {
        this.sessionIdQueue.push(client.sessionId.toString());
        if (this.masterClientSessionId != this.sessionIdQueue[0]) {
            this.masterClientSessionId = this.sessionIdQueue[0];
        }
        console.log("join");

        const player = new Player();
        player.sessionId = client.sessionId;
        var players = this.state.players;

        players.set(client.sessionId, player);
    }

    onLeave(client: SandboxPlayer, consented?: boolean) {
        this.sessionIdQueue.splice((this.sessionIdQueue.indexOf(client.sessionId)), 1)
        if (this.masterClientSessionId != this.sessionIdQueue[0]) {
            this.masterClientSessionId = this.sessionIdQueue[0];
            this.broadcast("CheckMaster", this.masterClientSessionId);
            console.log("master->", this.masterClientSessionId)
        }

    }
}