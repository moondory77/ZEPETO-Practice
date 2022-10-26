import { ZepetoScriptBehaviour } from "ZEPETO.Script";
import { ZepetoWorldMultiplay } from "ZEPETO.World";
import { Room} from "ZEPETO.Multiplay";
import { GameObject } from "UnityEngine";

export default class multiplaySample extends ZepetoScriptBehaviour {
  public multiplay: ZepetoWorldMultiplay;
  public room: Room;

  private static Instance: multiplaySample;
  /* Singleton */
  public static GetInstance(): multiplaySample {
    if (!multiplaySample.Instance) {
        multiplaySample.Instance = this.Instance;
    }
    return multiplaySample.Instance;
  }
  Start() {
    //multiplaySample.GetInstance();
    this.multiplay.RoomJoined += (room: Room) => {
      this.room = room;
      console.log(`RoomCreated, my session id is ${room.SessionId}`);

      // send message to server
      room.Send("echo", "hello ZEPETO Multiplay");

      // add server message listener
      room.AddMessageHandler("echo", (message) => {
        // print server message
        console.log(message);
      });
    };
  }
  
}
