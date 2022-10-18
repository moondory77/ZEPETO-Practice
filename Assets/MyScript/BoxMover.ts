import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class BoxMover extends ZepetoScriptBehaviour {
    private moveSpeed:number = 1;
    Start() {    

    }
    Update() {
        if(this.transform.position.z<-10)
            this.moveSpeed = 1;
        if(this.transform.position.z>10)
            this.moveSpeed = -1;
        this.transform.Translate(0, 0, 1*this.moveSpeed);
    }
}