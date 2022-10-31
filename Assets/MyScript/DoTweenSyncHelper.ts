import {Vector3} from 'UnityEngine';
import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import TransformSyncHelper from './TransformSyncHelper';
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {Room, RoomData} from "ZEPETO.Multiplay";
import multiplaySample from './multiplaySample';
import { transform } from 'typescript';
import SyncIndexManager from './SyncIndexManager';

export enum SyncType {
    Sync = 0,
    NoneSync = 1
}

export enum TweenType {
    //원형 빙빙 1 2 3 4 1 2 3 4
    Circulation = 0,
    //온길 되돌아가기 1 2 3 4 3 2 1
    Linear,
    //4도착시 1로 텔레포트 1 2 3 4 1(순간이동)
    TeleportFirstPoint
}

export enum LoopType {
    Repeat =0,
    
    JustOneWay,
    JustOneRoundTrip
}

interface inforTween{
    Id: string,
    position: Vector3,
    nextIndex : number
}
export default class DoTweenSyncHelper extends ZepetoScriptBehaviour {
    @HideInInspector() public isMasterClient: boolean = false;

    @SerializeField() private syncType: SyncType = SyncType.Sync;
    @SerializeField() private tweenType: TweenType = TweenType.Circulation;
    @SerializeField() private loopType: LoopType = LoopType.Repeat;
    @SerializeField() private TweenPosition: Vector3[];
    @SerializeField() private moveSpeed: number = 1;

    private multiplay: ZepetoWorldMultiplay;
    private room: Room;
    private Id: string = "";

    private nowIndex: number;
    private nextIndex: number;

    private straightDir :boolean =  true;
    
    private loopCount:number;
    private isEnd : boolean;

    Awake() {
        if(this.TweenPosition.length<2){
            throw 'Error: Enter at least two positions in the Twin Position.';
            return;
        }
        this.nowIndex = 0;
        this.nextIndex =1;
        this.loopCount =0;
        this.isEnd = false;
    }

    Start() {
        SyncIndexManager.SyncIndex++;
        this.Id = SyncIndexManager.SyncIndex.toString();
        if (this.syncType == SyncType.Sync) {
            this.multiplay = multiplaySample.instance.multiplay;
            this.SyncInit();
        }
    }
    FixedUpdate() {
        if (this.transform.position == this.TweenPosition[this.nextIndex]) {
            this.nowIndex = this.nextIndex;

            switch (+this.tweenType) {
                case TweenType.Circulation:
                    if (this.nextIndex == this.TweenPosition.length - 1) {
                        this.nextIndex = 0;
                        this.loopCount++;
                    } else
                        this.nextIndex++;
                    break;
                case TweenType.Linear:
                    if (this.nextIndex == this.TweenPosition.length - 1) {
                        this.straightDir = false;
                        this.loopCount++;
                    } else if (this.nextIndex == 0) {
                        this.straightDir = true;
                    }
                    this.nextIndex = this.straightDir ? this.nextIndex + 1 : this.nextIndex - 1;
                    break;
                case TweenType.TeleportFirstPoint:
                    if(this.nextIndex == this.TweenPosition.length - 1){
                        this.transform.position = this.TweenPosition[0];
                        this.nextIndex = 1 ;
                        this.loopCount++;
                    }
                    else{
                        this.nextIndex++;
                    }
                    break;
            }
            if(this.isMasterClient && !this.isEnd){
                this.SendPoint();
            }
            if(!this.isEnd){
                if(this.loopType != LoopType.Repeat){
                    if(this.loopCount >= this.loopType){
                        this.isEnd = true;
                    }
                }
            }
        }
        if(!this.isEnd)
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