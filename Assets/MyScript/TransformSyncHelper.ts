import {Transform, Vector3, WaitForSeconds, Quaternion, Time, Rigidbody} from "UnityEngine";
import {ZepetoScriptBehaviour} from "ZEPETO.Script";
import multiplaySample from "./multiplaySample";
import {Room, RoomData} from "ZEPETO.Multiplay";
import {ZepetoWorldMultiplay} from "ZEPETO.World";
import {ZepetoPlayers} from "ZEPETO.Character.Controller";
import SyncIndexManager from "./SyncIndexManager";
import { State, SyncTransform } from "ZEPETO.Multiplay.Schema";

interface tf {
    Id: string,
    position: Vector3,
    rotation: Vector3,
    scale: Vector3
}

export default class TransformSyncHelper extends ZepetoScriptBehaviour {
    @HideInInspector() public isMasterClient: boolean = false;

    @SerializeField() private SyncPosition: boolean = true;
    @SerializeField() private SyncRotation: boolean = true;
    @SerializeField() private SyncScale: boolean = true;

    private multiplay: ZepetoWorldMultiplay;
    private room: Room;
    private Id: string="";

    private syncTransform: SyncTransform;
    
    Start() {
        SyncIndexManager.SyncIndex++;
        this.Id = SyncIndexManager.SyncIndex.toString();
        //하나라도 동기화 하면
        if (this.SyncPosition || this.SyncRotation || this.SyncScale) {
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
                        console.log("ImMasterClient");
                        this.isMasterClient = true;
                        this.StartCoroutine(this.CheckChangeTransform(0.04));
                    }
                }
            });


            this.room.OnStateChange += this.OnStateChange;
        };
    }
    private OnStateChange(state: State, isFirst: boolean){
        if (isFirst) {
            this.syncTransform = state?.SyncTransforms?.get_Item(this.Id);
        }
        
    }
    private FixedUpdate(){
        if(this.isMasterClient){
            return;
        }
        
        if(!this.isMasterClient && null!=this.syncTransform) {
            if (this.SyncPosition) {
                const tempPos: Vector3 = new Vector3(this.syncTransform.position.x,this.syncTransform.position.y,this.syncTransform.position.z);
                if (tempPos != this.transform.position){
                    this.transform.position = Vector3.MoveTowards(this.transform.position, tempPos, 10);
                }
            }
            if (this.SyncRotation) {
                const tempRot: Vector3 = new Vector3(this.syncTransform.rotation.x,this.syncTransform.rotation.y,this.syncTransform.rotation.z);
                if (tempRot != this.transform.rotation.eulerAngles)
                    this.transform.rotation = Quaternion.Euler(Vector3.MoveTowards(this.transform.eulerAngles, tempRot, 10));
            }
            if (this.SyncScale) {
                const tempScale: Vector3 = new Vector3(this.syncTransform.scale.x,this.syncTransform.scale.y,this.syncTransform.scale.z);
                if (tempScale != this.transform.localScale)
                    this.transform.localScale = Vector3.MoveTowards(this.transform.localScale, tempScale, 10);
            }
        }
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
                this.SendTransform();
                syncNowFrame = false;
            }
                
            yield new WaitForSeconds(tick);
        }
    }

    private SendTransform() {
        const data = new RoomData();
        data.Add("Id", this.Id);

        const pos = new RoomData();
        pos.Add("x", this.transform.localPosition.x);
        pos.Add("y", this.transform.localPosition.y);
        pos.Add("z", this.transform.localPosition.z);
        data.Add("position", pos.GetObject());

        const rot = new RoomData();
        rot.Add("x", this.transform.localEulerAngles.x);
        rot.Add("y", this.transform.localEulerAngles.y);
        rot.Add("z", this.transform.localEulerAngles.z);
        data.Add("rotation", rot.GetObject());

        const scale = new RoomData();
        scale.Add("x", this.transform.localScale.x);
        scale.Add("y", this.transform.localScale.y);
        scale.Add("z", this.transform.localScale.z);
        data.Add("scale", scale.GetObject());
        this.room.Send("SyncTransform", data.GetObject());
    }

    private ParseVector3(vector3: Vector3): Vector3 {
        return new Vector3(vector3.x, vector3.y, vector3.z);
    }
}
