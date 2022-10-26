import {Transform, Vector3, WaitForSeconds ,Quaternion} from "UnityEngine";
import { ZepetoScriptBehaviour } from "ZEPETO.Script";
import multiplaySample from "./multiplaySample";
import {Room, RoomData} from "ZEPETO.Multiplay";
import {ZepetoWorldMultiplay} from "ZEPETO.World";

export const enum UpdateAuthority {
  "NoneSync" = 0,
  "Sync",
}
interface tf{
  Id:string,
  position:Vector3,
  rotation:Vector3,
  scale:Vector3
}
export default class BoxSyncHelper extends ZepetoScriptBehaviour {
  @SerializeField() private SyncSet: UpdateAuthority = UpdateAuthority.Sync;
  @SerializeField() private SyncPosition: boolean = true;
  @SerializeField() private SyncRotation: boolean = true;
  @SerializeField() private SyncScale: boolean = true;
  @SerializeField() private Id: string = "";
  
  private multiplay: ZepetoWorldMultiplay;
  private room: Room;
  private isMasterClient:boolean = false;
  
  Start() {
    //동기화 하지 않음
    this.multiplay = multiplaySample.instance.multiplay;
    if (this.SyncSet == UpdateAuthority.NoneSync) {
      console.log(this.name);
    }
    
    // 동기화 함
    else if (this.SyncSet == UpdateAuthority.Sync) {
      this.multiplay.RoomJoined += (room: Room) => {
        this.room = room;
        this.room.Send("CheckMaster")
        this.room.AddMessageHandler("CheckMaster", (message) => {
          // print server message
          if(this.room.SessionId == message) {
            this.isMasterClient = true;
            console.log("ImMasterClient");
          }
          
          if(this.isMasterClient)
            this.StartCoroutine(this.SyncPositionSend(0.04));
          else
            this.room.AddMessageHandler("SyncTransform", (message:tf) => {
              if(this.Id == message.Id) {
                if (this.SyncPosition)
                  this.transform.position = this.ParseVector3(message.position);
                if (this.SyncRotation)
                  this.transform.rotation = Quaternion.Euler(this.ParseVector3(message.rotation));
                if (this.SyncRotation)
                  if (this.SyncScale)
                    this.transform.localScale = this.ParseVector3(message.scale);
              }
            });
        });
      };
    }
  }

  //일정 시간마다 서버로 현재 위치를 보냄
  *SyncPositionSend(tick: number) {
    while (true) {
      yield new WaitForSeconds(tick);
      let boxPos: Vector3 = this.transform.position;
      this.SendTransform(this.transform);
    }
  }

  private SendTransform(transform: Transform) {
    const data = new RoomData();
    data.Add("Id",this.Id);
    
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
