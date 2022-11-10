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
    loopCount: number
}

interface PlayerTimestamp {
    gameStartTimestamp: number,
    playerJoinTimestamp: number;
}

export default class OptimizationDoTween extends ZepetoScriptBehaviour {
    @HideInInspector() public isMasterClient: boolean = false;

    @SerializeField() private syncType: SyncType = SyncType.Sync;
    @SerializeField() private tweenType: TweenType = TweenType.Circulation;
    @SerializeField() private loopType: LoopType = LoopType.Repeat;
    @SerializeField() private TweenPosition: Vector3[];
    @SerializeField() private moveSpeed: number = 0.1;

    private gameStartTimestampFromServer: number = 0;
    private diffTimestamp: number = 0;

    private multiplay: ZepetoWorldMultiplay;
    private room: Room;
    private Id: string = "";

    private nowIndex: number;
    private nextIndex: number;

    private straightDir: boolean;

    private loopCountDouble: number;    // 끝 지점 도달당 1씩 카운트, 즉 1번 순회 => loopCountDouble 2, 
    private isEnd: boolean;
    
    private ReceiveRequest: boolean;
    private RequestTime :number;

    private Init() {
        this.transform.position = this.TweenPosition[0];
        this.nowIndex = 0;
        this.nextIndex = 1;
        this.loopCountDouble = 0;
        this.isEnd = false;
        this.straightDir = true;
        this.ReceiveRequest = true;
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
            // 매 포인트 마다 동기화?
            if (this.isMasterClient && !this.isEnd) {
                // this.SendPoint();
            }
            if (!this.isEnd) {
                this.EndCheck();
            }
        }
        if (!this.isEnd) {
            this.transform.position = Vector3.MoveTowards(this.transform.position, this.TweenPosition[this.nextIndex], this.moveSpeed);
        }
    }

    private SyncInit() {
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            
            this.room.Send("CheckMaster");
            this.room.AddMessageHandler("CheckMaster", (MasterClientSessionId) => {
                if (this.room.SessionId == MasterClientSessionId) {
                    //처음 마스터가 되면
                    if (!this.isMasterClient) {
                        this.isMasterClient = true;
                    }
                    console.log("ImMasterClient");
                } else {
                }
            });

            this.room.Send("RequestPosition", this.Id);
            this.RequestTime = Number(+new Date());
            const RequestId:string = "RequestPosition" + this.Id;
            this.room.AddMessageHandler(RequestId, (message) => {
                if (this.isMasterClient) {
                    this.SendPoint();
                }
            });

            const syncId: string = "ResponsePosition" + this.Id;
            this.room.AddMessageHandler(syncId, (message: inforTween) => {
                if (!this.isMasterClient && this.ReceiveRequest) {
                    this.ReceiveRequest = false
                    this.nextIndex = message.nextIndex;
                    this.loopCountDouble = message.loopCount;
                    this.EndCheck();

                    let getPos = this.ParseVector3(message.position);
                    let dir = Vector3.Normalize(this.TweenPosition[this.nextIndex] - getPos);

                    let curClientTimeStamp = +new Date();
                    
                    //let DiffTime = (Number(curClientTimeStamp) - Number(message.masterTimeStemp)) / 1000;
                    //Requset후 Response 받은 시간 / 2 
                    let DiffTime = (Number(curClientTimeStamp) - Number(this.RequestTime)) / 2000;
                    console.log("DiffTime:"+DiffTime);
                    let FPS = 1 / Time.fixedDeltaTime; // 유니티 기본 FixedUpdate: 0.02/sec, FPS : 50
                    
                    let DiffPos = dir * DiffTime * this.moveSpeed * FPS;
                    let InterpolationPos = getPos + DiffPos;

                    //받은 위치
                    console.log("get:"+getPos.x);
                    //보간된 위치
                    console.log("Interpolation:"+InterpolationPos.x);

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
            //방장이 퍼즈하면? => 방장 넘겨주기
            if(this.isMasterClient)
                this.room.Send("PauseMaster");
        } else {
            if (this.bPaused) {
                this.bPaused = false;

                this.room.Send("RequestPosition", this.Id);
                this.ReceiveRequest = true;
                this.RequestTime = Number(+new Date());
            }
        }
    }

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

        this.room.Send("SyncTweenOptimization", data.GetObject());
    }


    private ParseVector3(vector3: Vector3): Vector3 {
        return new Vector3(vector3.x, vector3.y, vector3.z);
    }
}