import {Transform, Vector3, WaitForSeconds, Quaternion} from "UnityEngine";
import {ZepetoScriptBehaviour} from "ZEPETO.Script";
import multiplaySample from "./multiplaySample";
import {Room, RoomData} from "ZEPETO.Multiplay";
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {ZepetoPlayers} from "ZEPETO.Character.Controller";
import SyncIndexManager from "./SyncIndexManager";

interface tf {
    Id: string,
    position: Vector3,
    rotation: Vector3,
    scale: Vector3
}

export default class TransformSyncHelper extends ZepetoScriptBehaviour {
    @HideInInspector() public isMasterClient: boolean = false;
    @HideInInspector() public isSync: boolean = false;

    @SerializeField() private SyncPosition: boolean = true;
    @SerializeField() private SyncRotation: boolean = true;
    @SerializeField() private SyncScale: boolean = true;

    private multiplay: ZepetoWorldMultiplay;
    private room: Room;
    private Id: string="";

    Start() {
        SyncIndexManager.SyncIndex++;
        this.Id = SyncIndexManager.SyncIndex.toString();
        //하나라도 동기화 하면
        if (this.SyncPosition || this.SyncRotation || this.SyncScale) {
            this.isSync = true;
        }

        if (this.isSync) {
            this.multiplay = multiplaySample.instance.multiplay;
            this.SyncTransform();
        }
        else{
            this.isMasterClient = true;
        }
    }

    SyncTransform() {
        const syncId: string = "SyncTransform" + this.Id;

        this.multiplay.RoomJoined += (room: Room) => {

            this.room = room;
            this.room.Send("CheckMaster")
            
            this.room.AddMessageHandler("CheckMaster", (MasterClientSessionId) => {
                if (this.room.SessionId == MasterClientSessionId) {
                    //처음 마스터가 되면
                    if(!this.isMasterClient) {
                        this.isMasterClient = true;
                        this.StartCoroutine(this.CheckChangeTransform(0.04));
                    }
                    this.SendTransform(this.transform);
                    console.log("ImMasterClient");
                }
                else
                    this.room.AddMessageHandler(syncId, (message: tf) => {
                        if (this.SyncPosition) {
                            const tempPos: Vector3 = this.ParseVector3(message.position);
                            if (tempPos != this.transform.position)
                                this.transform.position = tempPos;
                        }
                        if (this.SyncRotation) {
                            const tempRot: Vector3 = this.ParseVector3(message.rotation);
                            if (tempRot != this.transform.rotation.eulerAngles)
                                this.transform.rotation = Quaternion.Euler(tempRot);
                        }
                        if (this.SyncScale) {
                            const tempScale: Vector3 = this.ParseVector3(message.scale);
                            if (tempScale != this.transform.localScale)
                                this.transform.localScale = tempScale;
                        }
                    });
            });
        };
    }

    //트랜스폼 변경 확인
    * CheckChangeTransform(tick: number) {
        let pastPos: Vector3 = this.transform.position;
        let pastRot: Vector3 = this.transform.rotation.eulerAngles;
        let pastScale: Vector3 = this.transform.localScale;
        let syncNowFrame : boolean = false;
        
        while (true) {
            if (this.SyncPosition) {
                if (pastPos != this.transform.position) {
                    pastPos = this.transform.position;
                    syncNowFrame = true;
                }
            }
            if (this.SyncRotation) {
                if (pastRot != this.transform.rotation.eulerAngles) {
                    pastRot = this.transform.rotation.eulerAngles
                    syncNowFrame = true;
                }
            }
            if (this.SyncScale) {
                if (pastScale != this.transform.localScale) {
                    pastScale = this.transform.localScale
                    syncNowFrame = true;
                }
            }
            //변한 값이 있으면 전송
            if(syncNowFrame) {
                this.SendTransform(this.transform);
                syncNowFrame = false;
            }
                
            yield new WaitForSeconds(tick);
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
