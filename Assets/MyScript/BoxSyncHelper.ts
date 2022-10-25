import { Vector3, WaitForSeconds } from "UnityEngine";
import { ZepetoScriptBehaviour } from "ZEPETO.Script";
import multiplaySample from "./multiplaySample";

export const enum UpdateAuthority {
  "NoneSync" = 0,
  "Sync",
}

export default class BoxSyncHelper extends ZepetoScriptBehaviour {
  public SyncSet: UpdateAuthority;
  public multiplay: multiplaySample;
  Start() {
    //동기화 하지 않음
    if (this.SyncSet == UpdateAuthority.NoneSync) {
      console.log(this.name);
    }
    // 동기화 함
    else if (this.SyncSet == UpdateAuthority.Sync) {
      console.log(this.name);
      this.StartCoroutine(this.SyncPostionReceive());
      this.StartCoroutine(this.SyncPositionSend());
    }
  }

  //일정 시간마다 서버로 현재 위치를 보냄
  *SyncPositionSend() {
    while (true) {
      yield new WaitForSeconds(2);
      this.multiplay = multiplaySample.GetInstance();
      if (this.multiplay != null) {
        let boxPos: Vector3 = this.transform.position;
        this.multiplay.room.Send("boxPos", boxPos);
      }
    }
  }

  //서버로부터 받은 위치로 동기화
  *SyncPostionReceive() {
    yield new WaitForSeconds(2);
    this.multiplay = multiplaySample.GetInstance();
    if (this.multiplay != null) {
    this.multiplay.room.AddMessageHandler("boxPos", (message) => {
        // print server message
        console.log(message);
    });
    }
  }
  

  private ParseVector3(vector3: Vector3): Vector3 {
    return new Vector3(vector3.x, vector3.y, vector3.z);
  }
}
