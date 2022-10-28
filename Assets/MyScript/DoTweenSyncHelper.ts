import {Vector3} from 'UnityEngine';
import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import TransformSyncHelper from './TransformSyncHelper';

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

export default class DoTweenSyncHelper extends ZepetoScriptBehaviour {
    @SerializeField() private syncType: SyncType = SyncType.Sync;
    @SerializeField() private loopType: LoopType = LoopType.circle;
    @SerializeField() private TweenPosition: Vector3[];
    @SerializeField() private moveSpeed: number = 1;

    private _startPosition: Vector3;
    private nowIndex: number = 0;
    private nextIndex: number = 1;

    private straightDir :boolean =  true;

    Awake() {
        this._startPosition = this.transform.position;
    }

    Start() {
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
            }
        }
        this.transform.position = Vector3.MoveTowards(this.transform.position, this.TweenPosition[this.nextIndex], this.moveSpeed * 0.1);
    }
}