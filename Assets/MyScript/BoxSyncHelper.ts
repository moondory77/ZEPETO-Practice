import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export const enum UpdateAuthority{
    "NoneSync"=0,
    "Sync"
}

export default class BoxSyncHelper extends ZepetoScriptBehaviour {
    public SyncSet : UpdateAuthority;
    Start() {    
        //동기화 하지 않음
        if(this.SyncSet==UpdateAuthority.NoneSync){
            console.log(this.name)
        }
        // 동기화 함
        else if(this.SyncSet==UpdateAuthority.Sync){
            console.log(this.name)
        }
    }


}