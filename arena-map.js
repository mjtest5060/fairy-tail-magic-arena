'use strict';
// Server-authoritative 3,600px arena: one-way platforms, collectibles, fixed map bounds.
const WORLD={width:3600,height:1024,floor:852,gravity:1730,jumpSpeed:735,playerHalfWidth:30};
const PLATFORMS=Object.freeze([
 {id:'west-low',x:265,y:726,w:390,h:30,style:'stone'},
 {id:'west-mid',x:700,y:598,w:340,h:30,style:'wood'},
 {id:'west-high',x:1090,y:468,w:270,h:26,style:'stone'},
 {id:'center-low',x:1170,y:736,w:410,h:28,style:'stone'},
 {id:'center-mid',x:1480,y:602,w:390,h:30,style:'wood'},
 {id:'center-high',x:1810,y:478,w:280,h:28,style:'stone'},
 {id:'east-low',x:2100,y:728,w:370,h:30,style:'stone'},
 {id:'east-mid',x:2470,y:594,w:390,h:28,style:'wood'},
 {id:'east-high',x:2800,y:470,w:290,h:28,style:'stone'},
 {id:'far-east',x:3010,y:726,w:350,h:28,style:'stone'}
]);
const PICKUP_SPAWNS=Object.freeze([
 {x:450,y:694},{x:873,y:565},{x:1280,y:704},{x:1700,y:570},
 {x:1950,y:446},{x:2250,y:696},{x:2680,y:562},{x:3190,y:694},
 {x:1830,y:810},{x:1025,y:810},{x:2950,y:810}
]);
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
function supportAt(x,footY,prevFootY,dropThrough=false){
 if(dropThrough)return null;
 let landed=null;
 for(const p of PLATFORMS){
  if(x+WORLD.playerHalfWidth<p.x+8||x-WORLD.playerHalfWidth>p.x+p.w-8)continue;
  if(prevFootY>p.y+8||footY<p.y)continue;
  if(!landed||p.y<landed.y)landed=p;
 }
 return landed;
}
module.exports={WORLD,PLATFORMS,PICKUP_SPAWNS,supportAt,clamp};
