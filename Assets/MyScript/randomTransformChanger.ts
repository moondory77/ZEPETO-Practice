import { ZepetoScriptBehaviour } from 'ZEPETO.Script'
import {WaitForSeconds} from "UnityEngine";
import TransformSyncHelper from './TransformSyncHelper';

export default class randomTransformChanger extends ZepetoScriptBehaviour {

    @SerializeField() private transformSyncHelper:TransformSyncHelper;
    
    Start() {
        this.transformSyncHelper = this.GetComponent<TransformSyncHelper>();
        this.StartCoroutine(this.RandomAnyThings());
    }
    *RandomAnyThings(){
        //트랜스폼 변경하는거 암거나 싹다 랜덤
        //ex) rotate 30도
        //ex) pos 옆으로 3만큼
        //ex) x사이즈 1.2배
        
        // 시간도 0~2초사이 아무때나
        yield new WaitForSeconds(1);
    }
}