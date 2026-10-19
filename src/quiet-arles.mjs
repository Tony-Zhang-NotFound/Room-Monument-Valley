import * as THREE from '../vendor/three.module.js';

// Original procedural work. Reference photographs are never loaded by the game.
export const ARLES_PALETTE={wall:'#A6A4C4',wood:'#D6AD58',blanket:'#B9574D',window:'#78927B',floor:'#BB8875',linen:'#EEE6D2',background:'#E5E0EB',woodEdge:'#B78A43',woodLight:'#E3BE72',floorSeam:'#AA7969',cream:'#E5DBC3',ink:'#474554',glass:'#D4DDC9',slate:'#61776D'};
export const ARLES_LAYOUT=[
 {assetId:'bed_01',name:'ArlesBed',position:[4.42,0,1.84],rotationY:0,layer:'Furniture',collision:true,pickable:false,state:'static'},
 {assetId:'table_01',name:'ArlesTable',position:[-3.46,0,-2.19],rotationY:0,layer:'Furniture',collision:true,pickable:false,state:'static'},
 {assetId:'chair_01',name:'ArlesChair',position:[-3.31,0,-.94],rotationY:.18,layer:'Furniture',collision:true,pickable:false,state:'static'},
 {assetId:'window_01',name:'ArlesWindow',position:[-1,3.75,-3.36],rotationY:0,layer:'Architecture',collision:false,pickable:false,state:'static'},
 {assetId:'frame_01',name:'ArlesLandscape',position:[2.75,3.65,-3.23],rotationY:0,layer:'Props',collision:false,pickable:false,state:'static'},
 {assetId:'frame_small',name:'ArlesPortrait',position:[-3.45,2.95,-3.23],rotationY:-.035,layer:'Props',collision:false,pickable:false,state:'static'}
];
export const ARLES_PRESENTATION={name:'Quiet Arles',background:ARLES_PALETTE.background,keyColor:'#FFF1D8',keyIntensity:2.65,keyPosition:[-3,10,-3],sky:'#FFF7E8',ambientGround:'#C5BCD0',ambientIntensity:2.3,exposure:1.02,shadowSize:1024,shadowExtent:8,groundY:-.48,maskName:'灰绿色屏风'};

function createWorkshop(){
 const geometries=new Set(),materials=new Set(),cache=new Map(),mats=new Map();let disposed=false;
 const material=(id,privateCopy=false)=>{
  if(!mats.has(id)){const m=new THREE.MeshStandardMaterial({name:'Arles_'+id,color:ARLES_PALETTE[id],roughness:id==='linen'||id==='blanket'?.94:id==='wood'||id==='woodLight'?.82:.9,metalness:0});mats.set(id,m);materials.add(m);}
  const m=mats.get(id);if(!privateCopy)return m;const copy=m.clone();materials.add(copy);return copy;
 };
 const own=g=>{geometries.add(g);return g;};
 const geometry=(key,make)=>{if(!cache.has(key))cache.set(key,own(make()));return cache.get(key);};
 const group=name=>{const g=new THREE.Group();g.name=name;return g;};
 function mesh(parent,name,geo,mat,pos=[0,0,0]){const m=new THREE.Mesh(geo,typeof mat==='string'?material(mat):mat);m.name=name;m.position.set(...pos);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function box(parent,name,size,mat,pos=[0,0,0],radius=.018){
  const [w,h,d]=size,r=Math.min(radius,w/5,h/5,d/5);
  const geo=geometry('box:'+size+':'+r,()=>{
   if(!r)return new THREE.BoxGeometry(w,h,d);
   const s=new THREE.Shape(),x=-w/2+r,y=-h/2+r;
   s.moveTo(x,y);s.lineTo(-x,y);s.lineTo(-x,-y);s.lineTo(x,-y);s.closePath();
   const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,bevelEnabled:true,bevelThickness:r,bevelSize:r,bevelSegments:2,steps:1,curveSegments:2});g.translate(0,0,-(d-2*r)/2);return g;
  });
  return mesh(parent,name,geo,mat,pos);
 }
 function cylinder(parent,name,r,h,mat,pos=[0,0,0],r2=r){return mesh(parent,name,geometry('cylinder:'+r+','+r2+','+h,()=>new THREE.CylinderGeometry(r,r2,h,16)),mat,pos);}
 function ellipsoid(parent,name,size,mat,pos){const m=mesh(parent,name,geometry('sphere',()=>new THREE.SphereGeometry(1,16,10)),mat,pos);m.scale.set(...size);return m;}
 function curvedBoard(parent,name,width,low,high,depth,z,mat){
  const shape=new THREE.Shape();shape.moveTo(-width/2,low);shape.lineTo(width/2,low);shape.lineTo(width/2,high-.08);shape.quadraticCurveTo(width*.26,high+.16,0,high+.02);shape.quadraticCurveTo(-width*.26,high-.07,-width/2,high+.04);shape.closePath();
  const geo=own(new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.022,bevelSize:.022,bevelSegments:2,curveSegments:6}));geo.translate(0,0,-depth/2);return mesh(parent,name,geo,mat,[0,0,z]);
 }
 // Bake the stationary components of one asset per material. Names remain in
 // constructionParts for inventory; animated/pickable gameplay meshes stay separate.
 function bake(root){
  root.updateMatrixWorld(true);const buckets=new Map(),parts=[];
  root.traverse(o=>{if(o.isMesh){parts.push(o.name);const key=o.material;const list=buckets.get(key)||[];list.push(o);buckets.set(key,list);}});
  const merged=group(root.name);merged.userData.constructionParts=parts;
  for(const [mat,meshes]of buckets){
   const buffers={position:[],normal:[],uv:[]};
   for(const m of meshes){let g=m.geometry.index?m.geometry.toNonIndexed():m.geometry.clone();g.applyMatrix4(m.matrixWorld);for(const key of Object.keys(buffers))buffers[key].push(g.attributes[key].array);g.dispose();}
   const geo=own(new THREE.BufferGeometry());
   for(const [key,arrays]of Object.entries(buffers)){const values=new Float32Array(arrays.reduce((n,a)=>n+a.length,0));let offset=0;for(const a of arrays){values.set(a,offset);offset+=a.length;}geo.setAttribute(key,new THREE.BufferAttribute(values,key==='uv'?2:3));}
   geo.computeBoundingBox();geo.computeBoundingSphere();mesh(merged,root.name+'_'+mat.name,geo,mat);
  }
  return merged;
 }
 function bed(){
  const g=group('bed_01');
  for(const x of [-.94,.94])for(const z of [-1.19,1.19])box(g,'BedFoot',[.17,.48,.17],'wood',[x,.24,z],.025);
  for(const x of [-.98,.98])box(g,'BedSideRail',[.13,.24,2.48],'woodEdge',[x,.43,0]);
  box(g,'BedSlattedSupport',[1.9,.12,2.42],'wood',[0,.43,0]);
  box(g,'Mattress',[1.85,.27,2.31],'linen',[0,.65,0],.07);
  const quilt=geometry('quilt',()=>{
   const q=new THREE.BoxGeometry(1.91,.13,1.69,8,1,12),p=q.attributes.position;
   for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,p.getY(i)+.021*Math.sin(z*7+x*.9)+.012*Math.cos(x*8-z*2));}q.computeVertexNormals();return q;
  });mesh(g,'RedQuilt',quilt,'blanket',[0,.83,.31]);
  box(g,'FoldedLinen',[1.87,.11,.28],'linen',[0,.87,-.55],.045);
  ellipsoid(g,'SoftPillow',[.72,.12,.26],'linen',[0,.91,-.91]);
  for(const z of [-1.25,1.25]){
   const high=z<0?1.48:1.08;
   curvedBoard(g,z<0?'Headboard':'Footboard',1.91,.44,high,.105,z,'wood');
   for(const x of [-.98,.98]){box(g,'BedPost',[.18,high+.1,.18],'wood',[x,(high+.1)/2,z],.025);ellipsoid(g,'BedFinial',[.105,.08,.105],'woodLight',[x,high+.1,z]);}
   for(const x of [-.52,0,.52])box(g,'BoardJoin',[.025,high-.52,.012],'woodEdge',[x,(high+.44)/2,z+.065],.003);
  }
  return bake(g);
 }
 function table(){
  const g=group('table_01');box(g,'TableTop',[1.35,.12,.8],'wood',[0,1.12,0],.035);
  for(const x of [-.54,.54])for(const z of [-.27,.27])box(g,'TableLeg',[.095,1.08,.095],'woodEdge',[x,.54,z],.015);
  box(g,'ApronFront',[1.18,.18,.07],'wood',[0,.98,.31]);box(g,'ApronBack',[1.18,.18,.07],'wood',[0,.98,-.31]);
  for(const x of [-.57,.57])box(g,'ApronSide',[.07,.18,.6],'wood',[x,.98,0]);
  // A basin, pitcher and two books: original geometry, no reference image textures.
  cylinder(g,'BasinRim',.24,.045,'linen',[-.13,1.205,0]);cylinder(g,'BasinWater',.19,.012,'glass',[-.13,1.233,0]);
  cylinder(g,'PitcherBody',.095,.21,'linen',[.36,1.29,-.12],.13);cylinder(g,'PitcherNeck',.07,.10,'linen',[.36,1.435,-.12]);
  const handle=mesh(g,'PitcherHandle',geometry('handle',()=>new THREE.TorusGeometry(.075,.018,6,12)),'linen',[.48,1.34,-.12]);handle.rotation.y=Math.PI/2;
  box(g,'ClosedBook',[.29,.055,.19],'window',[-.46,1.205,-.12],.008);box(g,'BookPages',[.26,.025,.18],'linen',[-.46,1.206,-.115],.004);
  return bake(g);
 }
 function chair(){
  const g=group('chair_01');
  for(const x of [-.255,.255])for(const z of [-.25,.25])box(g,'ChairLeg',[.072,z<0?1.16:.56,.072],'wood',[x,(z<0?1.16:.56)/2,z],.012);
  box(g,'SeatFrame',[.61,.10,.6],'wood',[0,.56,0],.025);box(g,'WovenSeat',[.49,.045,.48],'linen',[0,.63,0],.012);
  for(const y of [.9,1.12])box(g,'BackRail',[.54,.09,.07],'wood',[0,y,-.25],.018);
  for(const x of [-.255,.255])box(g,'LegStretcher',[.055,.06,.48],'woodEdge',[x,.22,0]);
  return bake(g);
 }
 function windowFrame(){
  const g=group('window_01');
  for(const x of [-1.03,1.03])box(g,'WindowJamb',[.16,2.2,.27],'window',[x,0,0]);
  for(const y of [-1.02,1.02])box(g,'WindowRail',[2.2,.16,.27],'window',[0,y,0]);
  box(g,'WindowReveal',[1.92,1.89,.035],'glass',[0,0,-.07],0);
  box(g,'WindowMullion',[.10,1.95,.15],'window',[0,0,.04]);
  for(const y of [-.36,.34])box(g,'WindowCrossbar',[1.96,.075,.14],'window',[0,y,.04]);
  box(g,'DeepWindowSill',[2.36,.13,.54],'cream',[0,-1.08,.11],.025);
  for(const side of [-1,1]){
   const shutter=group('Shutter');shutter.position.set(side*1.20,0,.08);shutter.rotation.y=side*-.2;
   box(shutter,'ShutterPanel',[.28,1.94,.09],'window');
   for(const y of [-.72,0,.72])box(shutter,'ShutterBrace',[.25,.07,.035],'slate',[0,y,.06]);g.add(shutter);
  }
  return bake(g);
 }
 function frame(small=false){
  const g=group('frame_01'),w=small?.66:1.28,h=small?.86:.91;
  box(g,'Canvas',[w-.1,h-.1,.04],'linen',[0,0,0],0);
  for(const x of [-w/2,w/2])box(g,'FrameVertical',[.075,h+.07,.09],'wood',[x,0,.025]);
  for(const y of [-h/2,h/2])box(g,'FrameHorizontal',[w,.075,.09],'wood',[0,y,.025]);
  box(g,'PaintedSky',[w-.16,h*.34,.008],'wall',[0,h*.18,.026],0);
  box(g,'PaintedField',[w-.16,h*.23,.009],'window',[0,-h*.18,.027],0);
  const sun=mesh(g,'AbstractSun',geometry('sun',()=>new THREE.CircleGeometry(small?.10:.15,16)),'woodLight',[w*.20,h*.15,.034]);sun.rotation.z=.1;
  return bake(g);
 }
 function floor(){
  const g=group('base_01');box(g,'BeveledPlinth',[10.8,.4,6.8],'cream',[.9,-.28,0],.06);
  box(g,'TerracottaFloor',[10.62,.08,6.62],'floor',[.9,-.04,0],.025);
  for(let z=-2.40;z<3;z+=.92)box(g,'FloorJoint',[10.49,.002,.012],'floorSeam',[.9,.002,z],0);
  for(let row=0;row<7;row++)for(let x=-3.5+(row%2)*1.5;x<5.9;x+=3.1)box(g,'StaggeredJoint',[.012,.002,.89],'floorSeam',[x,.002,-2.86+row*.92],0);
  const b=bake(g);b.name='Base';b.userData.collision='floor y=0';b.traverse(o=>{if(o.isMesh&&o.material===material('floorSeam'))o.castShadow=false;});return b;
 }
 function rearWall(){
  const g=group('RearWall');
  // Actual opening: x -2.1..0.1, y 2.65..4.85. Both cut faces have thickness.
  const shape=new THREE.Shape();shape.moveTo(-4.5,0);shape.lineTo(6.3,0);shape.lineTo(6.3,5.7);shape.lineTo(-4.5,5.7);shape.closePath();
  const hole=new THREE.Path();hole.moveTo(-2.1,2.65);hole.lineTo(-2.1,4.85);hole.lineTo(.1,4.85);hole.lineTo(.1,2.65);hole.closePath();shape.holes.push(hole);
  const geo=own(new THREE.ExtrudeGeometry(shape,{depth:.26,bevelEnabled:true,bevelThickness:.012,bevelSize:.012,bevelSegments:2,steps:1}));geo.translate(0,0,-3.53);
  mesh(g,'WindowCutWall',geo,'wall');
  box(g,'RearSkirting',[10.65,.15,.10],'cream',[.9,.08,-3.20],.012);
  const b=bake(g);b.name='RearWall';return b;
 }
 const build=id=>({bed_01:bed,table_01:table,chair_01:chair,window_01:windowFrame,frame_01:()=>frame(false),frame_small:()=>frame(true),base_01:floor,wall_01:rearWall}[id]||(()=>{throw Error('Unknown Arles asset '+id);}))();
 return {build,material,box,group,bake,own,dispose(){if(disposed)return;disposed=true;for(const g of geometries)g.dispose();for(const m of materials)m.dispose();},stats(){return {geometryResources:geometries.size,materialResources:materials.size,disposed};}};
}

export function applyQuietArles(parts){
 const workshop=createWorkshop(),world=parts.world,originalGeometries=new Set(),originalPrivateMaterials=new Set(Object.values(parts.material));
 world.name='Quiet_Arles_01';
 world.traverse(o=>{if(o.isMesh)originalGeometries.add(o.geometry);});
 for(const m of Object.values(parts.markers))originalPrivateMaterials.add(m.material);
 for(const m of Object.values(parts.endPoints))originalPrivateMaterials.add(m.material);
 try{
 const registry=[];
 const register=(object,config)=>{const ids=new Set();object.traverse(o=>{if(o.isMesh)ids.add(o.material.name);});object.userData={...object.userData,...config,source:config.layer==='Gameplay'?'src/assets-source.js + Quiet Arles material override':'src/quiet-arles.mjs#createWorkshop',parent:object.parent?.name,materialId:config.materialId||'arles-palette',materialIds:[...ids],castShadow:true,receiveShadow:true,releaseOwner:'quiet-arles scene',reuse:'shared workshop geometry/material caches; baked static components',transform:{position:object.position.toArray(),rotationY:object.rotation.y,scale:object.scale.toArray()}};registry.push({name:object.name,...object.userData});};
 // Retain exact playable solids, anchors and rotor dimensions. Only their materials change.
 world.traverse(o=>{
  if(!o.isMesh||o.name.startsWith('Endpoint_'))return;
  const parent=o.parent.name;
  let id='cream';
  if(o.name.startsWith('Step')||o.name==='Hub'||o.name==='TopLanding')id='blanket';
  else if(o.name==='FixedBase'||o.name.startsWith('Foot')||o.name==='Disc')id='ink';
  else if(o.name==='TransitionMask')id='window';
  else if(o.name.startsWith('MaskFoot'))id='woodEdge';
  else if(o.name.startsWith('FarSupport'))id='cream';
  else if(o.name==='FarPlatform')id='linen';
  else if(o.name==='LeftWall'||o.name==='RearWall')id='wall';
  else if(o.name.startsWith('Target_'))id='wood';
  else if(parent==='GoalDoor')id=o.name==='Inset'?'woodLight':'window';
  else if(parent==='GoalFrame')id='cream';
  o.material=workshop.material(id,parent==='GoalDoor');
 });
 for(const name of ['Base','RearWall','RearShelf']){const old=world.getObjectByName(name);old?.removeFromParent();}
 const base=workshop.build('base_01'),wall=workshop.build('wall_01');world.add(base,wall);
 register(base,{assetId:'base_01+floor_01',layer:'Architecture',pickable:false,collision:'walkable floor y=0',state:'static'});
 register(wall,{assetId:'wall_01',layer:'Architecture',pickable:false,collision:true,state:'static'});
 const left=world.getObjectByName('LeftWall');left.userData.layer='Architecture';
 const skirt=workshop.group('LeftSkirting');workshop.box(skirt,'LeftSkirting',[.12,.15,5.65],'cream',[.15,-1.67,0]);left.add(skirt);
 for(const config of ARLES_LAYOUT){const object=workshop.build(config.assetId);object.name=config.name;object.position.set(...config.position);object.rotation.y=config.rotationY;world.add(object);register(object,config);}
 // The opaque transfer plane remains identical. Trim is attached, never pickable.
 const trim=workshop.group('ScreenFrame');
 for(const x of [-.50,.50])workshop.box(trim,'ScreenStile',[.045,1.72,.21],'wood',[x,0,0],.008);
 for(const y of [-.825,.825])workshop.box(trim,'ScreenRail',[1.04,.045,.21],'wood',[0,y,0],.008);
 parts.mask.add(workshop.bake(trim));
 // Decoration is intentionally excluded by a raycast layer, not an invisible blocker.
 for(const r of registry){const object=world.getObjectByName(r.name);object.traverse(o=>o.layers.set(1));}
 const shelf=world.getObjectByName('LeftSkirting');shelf?.traverse(o=>o.layers.set(1));
 parts.mask.children.forEach(o=>o.traverse(child=>child.layers.set(1)));
 register(world.getObjectByName('M01'),{assetId:'rotator',layer:'Gameplay',pickable:true,collision:'existing 2.73 m sweep exclusion',state:'turn0..3'});
 register(parts.door,{assetId:'door_01',layer:'Gameplay',pickable:false,collision:'existing goal anchor G',state:'won emissive only; private material'});
 register(parts.mask,{assetId:'occluder',layer:'Gameplay',pickable:false,collision:'existing transfer occlusion plane',state:'static'});
 // The measured animation regression was dominated by additional draw calls.
 // Reuse the existing bake helper across stationary decorations. Keep the
 // source groups for inventory/bounds tests, but render only this one batch.
 const sources=registry.filter(a=>a.layer!=='Gameplay').map(a=>world.getObjectByName(a.name));
 const staging=workshop.group('StaticArtBatch');let sourceMeshes=0;
 for(const object of sources){staging.add(object.clone(true));object.traverse(o=>{if(o.isMesh){o.visible=false;sourceMeshes++;}});}
 const batch=workshop.bake(staging);batch.userData.renderBatchOnly=true;batch.userData.sourceAssets=sources.map(o=>o.name);batch.layers.set(1);
 batch.traverse(o=>{o.layers.set(1);if(o.isMesh&&o.material.name==='Arles_floorSeam')o.castShadow=false;});world.add(batch);
 parts.batching={sourceMeshes,renderMeshes:batch.children.length,sourceAssets:batch.userData.sourceAssets};
 parts.style='quiet-arles';parts.presentation=ARLES_PRESENTATION;parts.assets=registry;parts.resourceStats=()=>workshop.stats();
 let disposed=false;
 parts.dispose=()=>{if(disposed)return;disposed=true;workshop.dispose();for(const g of originalGeometries)g.dispose();for(const m of originalPrivateMaterials)m.dispose();};
 parts.world.updateMatrixWorld(true);return parts;
 }catch(error){workshop.dispose();for(const g of originalGeometries)g.dispose();for(const m of originalPrivateMaterials)m.dispose();throw error;}
}
