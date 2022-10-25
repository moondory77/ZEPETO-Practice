import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class SampleScript extends ZepetoScriptBehaviour {
   
    Start() {    
        console.log("Hello ZEPETO Scriptaaaa");
    }

    Update() {
        this.transform.Rotate(3, 0, 0);
    }
    hi(){
        
    }
}