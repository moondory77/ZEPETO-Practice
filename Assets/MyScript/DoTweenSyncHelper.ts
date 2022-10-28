import {Vector3} from 'UnityEngine';
import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import TransformSyncHelper from './TransformSyncHelper';
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {Room, RoomData} from "ZEPETO.Multiplay";
import multiplaySample from './multiplaySample';
import { transform } from 'typescript';

export enum SyncType {
    Sync = 0,
    NoneSync = 1
}

export enum LoopType {
    //원형 빙빙 1 2 3 4 1 2 3 4
    circle = 0,
    //온길 되돌아가기 1 2 3 4 3 2 1
    straight,
    //루프안함 1 2 3 4 Stop
    NotLoop
}

interface inforTween{
    Id: string,
    position: Vector3,
    nextIndex : number
}
export default class DoTweenSyncHelper extends ZepetoScriptBehaviour {
    @HideInInspector() public isMasterClient: boolean = false;


    @SerializeField() private syncType: SyncType = SyncType.Sync;
    @SerializeField() private loopType: LoopType = LoopType.circle;
    @SerializeField() private TweenPosition: Vector3[];
    @SerializeField() private moveSpeed: number = 1;
    @SerializeField() private Id: string = "";

    private multiplay: ZepetoWorldMultiplay;
    private room: Room;

    private _startPosition: Vector3;
    private nowIndex: number = 0;
    private nextIndex: number = 1;

    private straightDir :boolean =  true;
    private isEndPoint : boolean = false;

    Awake() {
        this._startPosition = this.transform.position;
    }

    Start() {
        if (this.syncType == SyncType.Sync) {
            if (this.Id == "") {
                throw 'Error: You must put ID in Sync Helper.';
            }
            this.multiplay = multiplaySample.instance.multiplay;
            this.SyncInit();
        }
    }
    FixedUpdate() {
        if (this.transform.position == this.TweenPosition[this.nextIndex]) {
            this.nowIndex = this.nextIndex;

            switch (+this.syncType) {
                case SyncType.Sync:
                    console.log("Syncaaa");
                    break;
                case SyncType.NoneSync:
                    console.log("NoneSyncDDD");
                    break;
            }
            switch (+this.loopType) {
                case LoopType.circle:
                    if (this.nextIndex == this.TweenPosition.length - 1) {
                        this.nextIndex = 0;
                    } else
                        this.nextIndex++;
                    break;
                case LoopType.straight:
                    if (this.nextIndex == this.TweenPosition.length - 1) {
                        this.straightDir = false;
                    } else if (this.nextIndex == 0) {
                        this.straightDir = true;
                    }
                    this.nextIndex = this.straightDir ? this.nextIndex + 1 : this.nextIndex - 1;
                    break;
                case LoopType.NotLoop:
                    if(this.nextIndex == this.TweenPosition.length - 1){
                        this.isEndPoint =true;
                    }
                    else{
                        this.nextIndex++;
                        this.isEndPoint =false;
                    }
                    break;
            }
            if(this.isMasterClient && !this.isEndPoint){
                this.SendPoint()
            }
        }
        this.transform.position = Vector3.MoveTowards(this.transform.position, this.TweenPosition[this.nextIndex], this.moveSpeed * 0.1);
    }

    SyncInit(){
        const syncId: string = "SyncTween" + this.Id;
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            this.room.Send("CheckMaster")
            this.room.AddMessageHandler("CheckMaster", (MasterClientSessionId) => {
                if (this.room.SessionId == MasterClientSessionId) {
                    //처음 마스터가 되면
                    if (!this.isMasterClient) {
                        this.isMasterClient = true;
                    }
                    console.log("ImMasterClient");
                    this.SendPoint();
                }
                else{
                    this.room.AddMessageHandler(syncId, (message: inforTween) => {
                        this.transform.position = this.ParseVector3(message.position);
                        this.nextIndex = message.nextIndex;
                    });
                }
            });
        }
    }
    private SendPoint(){
        const data = new RoomData();
        data.Add("Id", this.Id);

        const pos = new RoomData();
        pos.Add("x", this.transform.localPosition.x);
        pos.Add("y", this.transform.localPosition.y);
        pos.Add("z", this.transform.localPosition.z);
        data.Add("position", pos.GetObject());
        data.Add("nextIndex", this.nextIndex);

        this.room.Send("SyncTween", data.GetObject());
    }

    private ParseVector3(vector3: Vector3): Vector3 {
        return new Vector3(vector3.x, vector3.y, vector3.z);
    }
}