declare module "ZEPETO.Multiplay.Schema" {

	import { Schema, MapSchema, ArraySchema } from "@colyseus/schema"; 


	interface State extends Schema {
		players: MapSchema<Player>;
		elapsedTime: number;
		DOTweens: MapSchema<DOTween>;
	}
	class Player extends Schema {
		sessionId: string;
		zepetoHash: string;
		zepetoUserId: string;
		transform: Transform;
		state: number;
	}
	class Transform extends Schema {
		position: Vector3;
		rotation: Vector3;
	}
	class Vector3 extends Schema {
		x: number;
		y: number;
		z: number;
	}
	class DOTween extends Schema {
		Id: string;
		nowIndex: number;
		nextIndex: number;
		sendTime: number;
		currentOneWayCount: number;
		position: Vector3;
		state: number;
	}
}