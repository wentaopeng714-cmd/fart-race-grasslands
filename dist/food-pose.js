import * as T from 'three';
export function foodContactPose(body,head,arm,food){
 body.updateWorldMatrix(true,true);
 // A top/rear surface point makes each food touch with its own silhouette.
 const rayStart=food.localToWorld(new T.Vector3(0,2.0,-.6)),center=food.getWorldPosition(new T.Vector3()),hits=new T.Raycaster(rayStart,center.clone().sub(rayStart).normalize()).intersectObject(food,true);
 const anchor=hits.length?food.worldToLocal(hits[0].point.clone()):new T.Vector3(0,.30,-.10);
 const gripOffset=arm.hand.worldToLocal(food.localToWorld(anchor.clone()));
 const target=new T.Vector3(.025,head.position.y-.228*head.scale.y,.38*head.scale.z).sub(gripOffset),upper=arm.elbow.position.length(),lower=arm.hand.position.length();
 const direction=target.sub(arm.shoulder.position),distance=T.MathUtils.clamp(direction.length(),Math.abs(upper-lower)+.005,upper+lower-.005);direction.normalize();
 const along=(upper*upper-lower*lower+distance*distance)/(2*distance),height=Math.sqrt(Math.max(0,upper*upper-along*along));
 const bend=new T.Vector3(1,-.35,.08);bend.addScaledVector(direction,-bend.dot(direction)).normalize();
 const elbow=direction.clone().multiplyScalar(along).addScaledVector(bend,height),upperDir=elbow.clone().normalize();
 const foreDir=direction.clone().multiplyScalar(distance).sub(elbow).normalize(),z=foreDir.clone().addScaledVector(upperDir,-foreDir.dot(upperDir)).normalize(),y=upperDir.clone().negate(),x=new T.Vector3().crossVectors(y,z).normalize();z.crossVectors(x,y).normalize();
 const rotation=new T.Euler().setFromRotationMatrix(new T.Matrix4().makeBasis(x,y,z),'XYZ');
 const bendAngle=Math.acos(T.MathUtils.clamp((distance*distance-upper*upper-lower*lower)/(2*upper*lower),-1,1));
 return {sx:rotation.x,sy:rotation.y,sz:rotation.z,ex:Math.atan2(arm.hand.position.z,-arm.hand.position.y)-bendAngle};
}

