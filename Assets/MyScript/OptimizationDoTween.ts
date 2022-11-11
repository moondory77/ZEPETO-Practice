import {Time, Vector3} from 'UnityEngine';
import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import TransformSyncHelper from './TransformSyncHelper';
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {Room, RoomData} from "ZEPETO.Multiplay";
import multiplaySample from './multiplaySample';
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
    Repeat = 0,
    JustOneWay,
    JustOneRoundTrip
}

interface inforTween {
    Id: string,
    position: Vector3,
    nextIndex: number,
    loopCount: number,
    masterTimeStamp :number,
}

interface PlayerTimestamp {
    gameStartTimestamp: number,
    playerJoinTimestamp: number;
}

export default class OptimizationDoTween extends ZepetoScriptBehaviour {

    @SerializeField() private syncType: SyncType = SyncType.Sync;
    @SerializeField() private tweenType: TweenType = TweenType.Circulation;
    @SerializeField() private loopType: LoopType = LoopType.Repeat;
    @SerializeField() private TweenPosition: Vector3[];
    @SerializeField() private moveSpeed: number = 0.1;
    
    private Id: string = "";

    private multiplay: ZepetoWorldMultiplay;
    private room: Room;

    private nowIndex: number;
    private nextIndex: number;

    private loopCountDouble: number;    // 끝 지점 도달당 1씩 카운트, 즉 1번 순회 => loopCountDouble 2, 
    private isEnd: boolean;
    
    private Requesting: boolean;
    private diffTime :number;

    private Init() {
        this.transform.position = this.TweenPosition[0];
        this.nowIndex = 0;
        this.nextIndex = 1;
        this.loopCountDouble = 0;
        this.isEnd = false;
        this.Requesting = true;
        this.diffTime = 0;
    }
    
    private Awake() {
        if (this.TweenPosition.length < 2) {
            throw 'Error: Enter at least two positions in the Twin Position.';
            return;
        }
        this.Init();
    }

    private Start() {
        SyncIndexManager.SyncIndex++;
        this.Id = SyncIndexManager.SyncIndex.toString();
        if (this.syncType == SyncType.Sync) {
            this.multiplay = multiplaySample.instance.multiplay;
            this.SyncInit();
        }
    }

    private FixedUpdate() {
        if (this.transform.position == this.TweenPosition[this.nextIndex]) {
            this.nowIndex = this.nextIndex;
            this.GetNextIndex();
            
            if (!this.isEnd) {
                this.EndCheck();
            }
        }
        if (!this.isEnd) {
            this.transform.position = Vector3.MoveTowards(this.transform.position, this.TweenPosition[this.nextIndex], this.moveSpeed);
        }
    }
    
    private GetNextIndex(){
        switch (+this.tweenType) {
            case TweenType.Circulation:
                if (this.nowIndex == this.TweenPosition.length - 1) {
                    this.nextIndex = 0;
                    this.loopCountDouble++;
                } else if (this.nowIndex == 0) {
                    this.nextIndex++;
                    this.loopCountDouble++;
                } else
                    this.nextIndex++;
                break;
            case TweenType.Linear:
                if (this.nowIndex == this.TweenPosition.length - 1) {
                    this.loopCountDouble++;
                } else if (this.nowIndex == 0) {
                    this.loopCountDouble++;
                }
                this.nextIndex = this.loopCountDouble % 2 == 0 ? this.nowIndex + 1 : this.nowIndex - 1;
                break;
            case TweenType.TeleportFirstPoint:
                if (this.nowIndex == this.TweenPosition.length - 1) {
                    if (this.loopType != LoopType.JustOneWay) {
                        this.transform.position = this.TweenPosition[0];
                        this.loopCountDouble++;
                    }
                    this.nextIndex = 1;
                    this.loopCountDouble++;
                } else {
                    this.nextIndex++;
                }
                break;
        }
    }
    
    private SyncInit() {
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            this.room.Send("CheckServerTimeRequest");
            
            let Time1 = Number(+new Date());
            this.room.AddMessageHandler("CheckServerTimeResponse", (message:number) =>
            {
                let Time2 =  Number(+new Date());
                let latency = (Time2 - Time1)/2
                this.diffTime = Number(message)-Time2 + latency;
                this.room.Send("RequestPosition", this.Id);
            });
            
            const RequestId:string = "RequestPosition" + this.Id;
            this.room.AddMessageHandler(RequestId, (message) => {
                this.SendPoint();
            });

            const ResponseId: string = "ResponsePosition" + this.Id;
            this.room.AddMessageHandler(ResponseId, (message: inforTween) => {
                if (this.Requesting) {
                    this.Requesting = false
                    this.nextIndex = message.nextIndex;
                    this.loopCountDouble = message.loopCount;
                    this.EndCheck();
                    
                    let getPos = this.ParseVector3(message.position);
                    let dir = Vector3.Normalize(this.TweenPosition[this.nextIndex] - getPos);
                    let DiffTime = (this.GetServerTime() - Number(message.masterTimeStamp)) / 1000;
                    console.log("DiffTime:"+DiffTime);
                    if(DiffTime<0){
                        console.log("@@@@@ERROR DiffTime"+DiffTime);
                    }
                    
                    let FPS = 1 / Time.fixedDeltaTime; // 유니티 기본 FixedUpdate: 0.02/sec, FPS : 50
                    let DiffPos = dir * DiffTime * this.moveSpeed * FPS;
                    let InterpolationPos = getPos + DiffPos;

                    this.transform.position = InterpolationPos;
                }
            });

        }
    }

    private EndCheck() {
        if (this.loopType != LoopType.Repeat) {
            if (this.loopCountDouble >= this.loopType) {
                this.isEnd = true;
            }
        }
    }
    
    private bPaused: boolean;
    private OnApplicationPause(pause: boolean) {
        if (pause) {
            this.bPaused = true;
            this.room.Send("PausePlayer");
        } else {
            if (this.bPaused) {
                this.bPaused = false;

                this.room.Send("RequestPosition", this.Id);
                this.Requesting = true;
            }
        }
    }
    private GetServerTime = () => this.diffTime + Number(+new Date());

    private SendPoint() {
        const data = new RoomData();
        data.Add("Id", this.Id);

        const pos = new RoomData();
        pos.Add("x", this.transform.localPosition.x);
        pos.Add("y", this.transform.localPosition.y);
        pos.Add("z", this.transform.localPosition.z);
        data.Add("position", pos.GetObject());

        data.Add("nextIndex", this.nextIndex);
        data.Add("loopCount", this.loopCountDouble);
        data.Add("masterTimeStamp", this.GetServerTime());

        this.room.Send("SyncTweenOptimization", data.GetObject());
    }


    private ParseVector3(vector3: Vector3): Vector3 {
        return new Vector3(vector3.x, vector3.y, vector3.z);
    }
}