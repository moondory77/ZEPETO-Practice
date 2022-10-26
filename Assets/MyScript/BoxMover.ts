import { Vector3 } from 'UnityEngine';
import { ZepetoScriptBehaviour } from 'ZEPETO.Script'

export default class BoxMover extends ZepetoScriptBehaviour {
    @SerializeField() private TweenPosition1:Vector3;
    @SerializeField() private TweenPosition2:Vector3;
    @SerializeField() private moveSpeed:number = 0.1;
    
    private _gotoPosition:Vector3;
    
    private _pos1:Vector3;
    private _pos2:Vector3;
    
    Start() {
        this._gotoPosition = this.TweenPosition2;
        
        this._pos1 = this.transform.position + this.TweenPosition1;
        this._pos2 = this.transform.position + this.TweenPosition2;
    }
    FixedUpdate() {
        if(this.transform.position == this._pos1)
            this._gotoPosition = this._pos2;
        if(this.transform.position == this._pos2)
            this._gotoPosition = this._pos1;
        this.transform.position = Vector3.MoveTowards(this.transform.position,this._gotoPosition,this.moveSpeed);
    }
}