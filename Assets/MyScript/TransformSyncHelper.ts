import {Transform, Vector3, WaitForSeconds, Quaternion} from "UnityEngine";
import {ZepetoScriptBehaviour} from "ZEPETO.Script";
import multiplaySample from "./multiplaySample";
import {Room, RoomData} from "ZEPETO.Multiplay";
import {ZepetoWorldMultiplay} from "ZEPETO.World";

interface tf {
    Id: string,
    position: Vector3,
    rotation: Vector3,
    scale: Vector3
}

export default class TransformSyncHelper extends ZepetoScriptBehaviour {
    @HideInInspector() public isMasterClient: boolean = false;
    @HideInInspector() public isSync: boolean = false;

    @SerializeField() private Id: string = "";
    @SerializeField() private SyncPosition: boolean = true;
    @SerializeField() private SyncRotation: boolean = true;
    @SerializeField() private SyncScale: boolean = true;

    private multiplay: ZepetoWorldMultiplay;
    private room: Room;

    Start() {
        //하나라도 동기화 하면
        if (this.SyncPosition || this.SyncRotation || this.SyncScale) {
            this.isSync = true;
        }

        if (this.isSync) {
            if (this.Id == "") {
                throw 'Error: You must put ID in Sync Helper.';
            }
            this.multiplay = multiplaySample.instance.multiplay;
            this.SyncTransform();
        }
        //동기화 하지 않음
        else
            return;
    }

    SyncTransform() {
        const syncId:string = "SyncTransform" + this.Id;
        this.multiplay.RoomJoined += (room: Room) => {
            this.room = room;
            this.room.Send("CheckMaster")
            this.room.AddMessageHandler("CheckMaster", (message) => {
                if (this.room.SessionId == message) {
                    this.isMasterClient = true;
                    console.log("ImMasterClient");
                }

                if (this.isMasterClient)
                    this.StartCoroutine(this.SyncPositionSend(0.4));
                else
                    this.room.AddMessageHandler(syncId, (message: tf) => {
                        if (this.SyncPosition)
                            this.transform.position = this.ParseVector3(message.position);
                        if (this.SyncRotation)
                            this.transform.rotation = Quaternion.Euler(this.ParseVector3(message.rotation));
                        if (this.SyncScale)
                            this.transform.localScale = this.ParseVector3(message.scale);
                    });
            });
        };
    }

    //일정 시간마다 서버로 현재 위치를 보냄
    * SyncPositionSend(tick: number) {
        while (true) {
            yield new WaitForSeconds(tick);
            let boxPos: Vector3 = this.transform.position;
            this.SendTransform(this.transform);
        }
    }

    private SendTransform(transform: Transform) {
        const data = new RoomData();
        data.Add("Id", this.Id);

        const pos = new RoomData();
        pos.Add("x", transform.localPosition.x);
        pos.Add("y", transform.localPosition.y);
        pos.Add("z", transform.localPosition.z);
        data.Add("position", pos.GetObject());

        const rot = new RoomData();
        rot.Add("x", transform.localEulerAngles.x);
        rot.Add("y", transform.localEulerAngles.y);
        rot.Add("z", transform.localEulerAngles.z);
        data.Add("rotation", rot.GetObject());

        const scale = new RoomData();
        scale.Add("x", transform.localScale.x);
        scale.Add("y", transform.localScale.y);
        scale.Add("z", transform.localScale.z);
        data.Add("scale", scale.GetObject());
        this.room.Send("SyncTransform", data.GetObject());
    }

    private ParseVector3(vector3: Vector3): Vector3 {
        return new Vector3(vector3.x, vector3.y, vector3.z);
    }
}
