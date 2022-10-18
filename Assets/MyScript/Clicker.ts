import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import { Slider, Button } from "UnityEngine.UI";
import { Room } from 'ZEPETO.Multiplay';
import { ZepetoWorldMultiplay } from 'ZEPETO.World';

export default class Clicker extends ZepetoScriptBehaviour {

    private multiplay: ZepetoWorldMultiplay;
    public clickBtn: Button;
    Start() {
        this.clickBtn.onClick.AddListener(() => {
            console.log('btnUI onClick');
            this.OnClickButton();
        });
    }
    OnClickButton(){
        this.multiplay = this.gameObject.GetComponent<ZepetoWorldMultiplay>();
        this.multiplay.Room.Send("Click","ClickBTN");
    }
}
