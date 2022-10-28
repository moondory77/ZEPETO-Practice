import {ZepetoScriptBehaviour} from 'ZEPETO.Script'
import {WaitForSeconds, Random, Vector3} from "UnityEngine";
import TransformSyncHelper from './TransformSyncHelper';

export default class randomTransformChanger extends ZepetoScriptBehaviour {

    @SerializeField() private transformSyncHelper: TransformSyncHelper;

    Start() {
        this.transformSyncHelper = this.GetComponent<TransformSyncHelper>();
        this.StartCoroutine(this.RandomAnyThings());
    }

    GetRandomInt(max: number) {
        return Math.floor(Math.random() * max);
    }

    * RandomAnyThings() {
        while (true) {
            if (this.transformSyncHelper.isMasterClient) {
                const randType: number = this.GetRandomInt(2);
                const randNum: int = this.GetRandomInt(6);
                switch (randType) {
                    case 0:
                        switch (randNum) {
                            case 0:
                                this.transform.position += Vector3.forward;
                                break;
                            case 1:
                                this.transform.position += Vector3.up;
                                break;
                            case 2:
                                this.transform.position += Vector3.right;
                                break;
                            case 3:
                                this.transform.position -= Vector3.forward;
                                break;
                            case 4:
                                this.transform.position -= Vector3.up;
                                break;
                            case 5:
                                this.transform.position -= Vector3.right;
                                break;
                        }
                        break;
                    case 1:
                        switch (randNum) {
                            case 0:
                                this.transform.localScale += Vector3.forward * 0.2;
                                break;
                            case 1:
                                this.transform.localScale += Vector3.up * 0.2;
                                break;
                            case 2:
                                this.transform.localScale += Vector3.right * 0.2;
                                break;
                            case 3:
                                this.transform.localScale -= Vector3.forward * 0.2;
                                break;
                            case 4:
                                this.transform.localScale -= Vector3.up * 0.2;
                                break;
                            case 5:
                                this.transform.localScale -= Vector3.right * 0.2;
                                break;
                        }
                        break;
                }
            }
            yield new WaitForSeconds(1);
        }
    }
}