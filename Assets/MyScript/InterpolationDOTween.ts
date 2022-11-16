import {Time, Vector3, WaitForSeconds} from 'UnityEngine';
import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import TransformSyncHelper from './TransformSyncHelper';
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {Room, RoomData} from "ZEPETO.Multiplay";
import multiplaySample from './multiplaySample';
import SyncIndexManager from './SyncIndexManager';
import {State, DOTween} from 'ZEPETO.Multiplay.Schema';

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
    masterTimeStamp: number,
}


export default class InterpolationDOTween extends ZepetoScriptBehaviour {

    @SerializeField() private syncType: SyncType = SyncType.Sync;
    @SerializeField() private tweenType: TweenType = TweenType.Circulation;
    @SerializeField() private loopType: LoopType = LoopType.Repeat;
    @SerializeField() private SyncInterpolation: boolean = true;
    @SerializeField() private TweenPosition: Vector3[];
    @SerializeField() private moveSpeed: number = 0.1;

    private Id: string = "";

    private multiplay: ZepetoWorldMultiplay;
    private room: Room;

    private nowIndex: number;
    private nextIndex: number;

    private currentOneWayCount: number;    // 끝 지점 도달당 1씩 카운트, 즉 1번 순회 => currentOneWayCount 2, 
    private isEnd: boolean;

    private Requesting: boolean;
    private RequestTime: number;
    private diffTime: number;

    private DOTween: DOTween;
    private isFirst:boolean;

    private Init() {
        this.transform.position = this.TweenPosition[0];
        this.nowIndex = 0;
        this.nextIndex = 1;
        this.currentOneWayCount = 0;
        this.isEnd = false;
        this.diffTime = 0;
        this.Requesting = true;        
        this.isFirst= true;
    }

    private Start() {
        if (this.TweenPosition.length < 2) {
            throw new Error('Error: Enter at least two positions in the Twin Position.');
            return;
        }
        this.Init();

        SyncIndexManager.SyncIndex++;
        this.Id = SyncIndexManager.SyncIndex.toString();

        if (this.syncType == SyncType.Sync) {
            this.multiplay = multiplaySample.instance.multiplay;
            this.multiplay.RoomJoined += (room: Room) => {
                this.room = room;
                this.SyncInit();
                
            };
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

    private GetNextIndex() {
        switch (+this.tweenType) {
            case TweenType.Circulation:
                if (this.nowIndex == this.TweenPosition.length - 1) {
                    this.nextIndex = 0;
                    this.currentOneWayCount++;
                } else if (this.nowIndex == 0) {
                    this.nextIndex++;
                    this.currentOneWayCount++;
                } else
                    this.nextIndex++;
                break;
            case TweenType.Linear:
                if (this.nowIndex == this.TweenPosition.length - 1) {
                    this.currentOneWayCount++;
                } else if (this.nowIndex == 0) {
                    this.currentOneWayCount++;
                }
                this.nextIndex = this.currentOneWayCount % 2 == 0 ? this.nowIndex + 1 : this.nowIndex - 1;
                break;
            case TweenType.TeleportFirstPoint:
                if (this.nowIndex == this.TweenPosition.length - 1) {
                    if (this.loopType != LoopType.JustOneWay) {
                        this.transform.position = this.TweenPosition[0];
                        this.currentOneWayCount++;
                    }
                    this.nextIndex = 1;
                    this.currentOneWayCount++;
                } else {
                    this.nextIndex++;
                }
                break;
        }
    }

    private SyncInit() {
        this.room.Send("CheckServerTimeRequest");
        this.RequestTime = Number(+new Date());
        
        this.room.OnStateChange += this.OnStateChange;

        this.room.AddMessageHandler("CheckServerTimeResponse", (message: number) => {
            let ResponseTime = Number(+new Date());
            let latency = (ResponseTime - this.RequestTime) / 2
            this.diffTime = Number(message) - ResponseTime + latency;
            this.room.Send("RequestPosition", this.Id);
        });

        const RequestId: string = "RequestPosition" + this.Id;
        this.room.AddMessageHandler(RequestId, (message) => {
            if(this.isFirst) {
                console.log("isFirst");
                this.StartCoroutine(this.SendMessageLoop(0.04));
                this.isFirst = false; 
            }
        });

        const ResponseId: string = "ResponsePosition" + this.Id;
        this.room.AddMessageHandler(ResponseId, (message: inforTween) => {
            if (this.Requesting) {
                let TmpNextIndex = message.nextIndex;
                let getPos = this.ParseVector3(message.position);
                let dir = Vector3.Normalize(this.TweenPosition[TmpNextIndex] - getPos);
                let latency = (this.GetServerTime() - Number(message.masterTimeStamp)) / 1000;
                let FPS = 1 / Time.fixedDeltaTime; // 유니티 기본 FixedUpdate: 0.02/sec, FPS : 50

                let DiffPos = dir * latency * this.moveSpeed * FPS;
                let InterpolationPos = getPos + DiffPos;

                let MoveSize = Vector3.SqrMagnitude(this.TweenPosition[TmpNextIndex] - getPos);
                let InterpolationPosSize = Vector3.SqrMagnitude(InterpolationPos - getPos);
                console.log("latency=" + latency);
                // 허용범위 초과시 다시 포지션 Request
                if (InterpolationPosSize >= MoveSize || latency < 0) {
                    console.log("Re Request....");
                    //위치 재 확인
                    this.room.Send("CheckServerTimeRequest");
                    this.RequestTime = Number(+new Date());
                } else {
                    this.nextIndex = message.nextIndex;
                    this.currentOneWayCount = message.loopCount;
                    this.EndCheck();
                    this.Requesting = false;
                    if (!this.SyncInterpolation) {
                        this.transform.position = getPos;
                    } else
                        this.transform.position = InterpolationPos;
                }
            }
        });
    }

    private EndCheck() {
        if (this.loopType != LoopType.Repeat) {
            if (this.currentOneWayCount >= this.loopType) {
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

                this.room.Send("CheckServerTimeRequest");
                this.RequestTime = Number(+new Date());

                this.Requesting = true;
            }
        }
    }

    private OnStateChange(state: State, isFirst: boolean) {
        if(isFirst) {
            this.DOTween = state.DOTweens.get_Item(this.Id);
            console.log(this.DOTween.nowIndex);
            //this.DOTween.OnChange += (changeValues) => this.OnUpdateTween();
        }
    }
    private OnUpdateTween(){
        console.log(this.DOTween.nowIndex);
    }
    
    private GetServerTime = () => this.diffTime + Number(+new Date());

    private* SendMessageLoop(tick: number) {
        while (true) {
            yield new WaitForSeconds(tick);
            if (this.room != null && this.room.IsConnected) {                
                this.SendState();
                this.SendPoint();
            }
        }
    }

    private SendPoint() {
        const data = new RoomData();
        data.Add("Id", this.Id);

        const pos = new RoomData();
        pos.Add("x", this.transform.position.x);
        pos.Add("y", this.transform.position.y);
        pos.Add("z", this.transform.position.z);
        data.Add("position", pos.GetObject());
        data.Add("sendTime", this.GetServerTime());

        this.room.Send("onChangedDOTween", data.GetObject());
    }

    private SendState() {
        const data = new RoomData();
        data.Add("Id", this.Id);
        data.Add("state", 0);
        data.Add("nowIndex", this.nowIndex);
        data.Add("nextIndex", this.nextIndex);
        data.Add("currentOneWayCount", this.currentOneWayCount);

        this.room.Send("onChangedTweenState", data.GetObject());
    }

    private ParseVector3(vector3: Vector3): Vector3 {
        return new Vector3(vector3.x, vector3.y, vector3.z);
    }
}