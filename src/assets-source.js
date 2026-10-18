import * as THREE from '../vendor/three.module.js';

// Canonical procedural source. Metres, right handed, Y up. No texture dependencies.
export const palette={chalk:'#E6E5DF',mist:'#B9BDBB',slate:'#727C7D',charcoal:'#363E42',teal:'#658F88',red:'#A15D59',ochre:'#C4A15D'};
const mats=Object.fromEntries(Object.entries(palette).map(([k,v])=>[k,new THREE.MeshStandardMaterial({name:'MAT_'+k,color:v,roughness:1,metalness:0})]));
const g=(name)=>{const o=new THREE.Group();o.name=name;return o;};
function mesh(parent,name,geo,color,pos){const m=new THREE.Mesh(geo,mats[color]);m.name=name;m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function box(p,n,s,c='chalk',xyz=[0,0,0]){return mesh(p,n,new THREE.BoxGeometry(...s),c,xyz);}
function cyl(p,n,r,h,c='chalk',xyz=[0,0,0]){return mesh(p,n,new THREE.CylinderGeometry(r,r,h,32),c,xyz);}
function stairs(p,n,count=8,c='chalk'){for(let i=0;i<count;i++)box(p,n+'_'+i,[.25,(i+1)*.25,1.2],c,[i*.25+.125,(i+1)*.125,0]);}
export const catalog=[
 ['floor_4','地板 · 4 m','shell'],['wall_4','墙片 · 4 × 3 m','shell'],['portal','门洞','shell'],['column','方柱','shell'],
 ['platform_2','平台 · 2 m','path'],['stair_8','直梯 · 8 级','path'],['stair_4','短梯 · 4 级','path'],['bridge_3','桥板 · 3 m','mechanism'],
 ['rotator','旋转梯组','mechanism'],['slider','平移平台','mechanism'],['occluder','遮挡墙','mechanism'],['door','目标门','story'],
 ['marker','安全停靠点','path'],['plinth','底座','shell'],['desk','书桌','story'],['bench','长凳','story'],['shelf','书架','story'],
 ['skylight','天窗框','story'],['traveler','旅人占位体','character'],['illusion_pair','错觉端点测试件','test'],
 ['room_01','01 · 错层居所','scene'],['room_02','02 · 悬梯中庭','scene'],['room_03','03 · 叠合庭院','scene']
].map(([id,label,category])=>({id,label,category}));
export function build(id,accent='teal'){
 const root=g(id);root.userData={assetId:id,version:'0.1.0',units:'metres',upAxis:'Y',stage:'greybox',pivot:[0,0,0]};
 const add=(asset,name,pos,rot=0,scale=[1,1,1],color=accent)=>{const a=build(asset,color);a.name=name;a.position.set(...pos);a.rotation.y=rot;a.scale.set(...scale);root.add(a);return a;};
 switch(id){
 case 'floor_4':box(root,'Slab',[4,.2,4],'chalk',[0,-.1,0]);break;
 case 'wall_4':box(root,'Wall',[4,3,.2],'chalk',[0,1.5,0]);break;
 case 'portal':box(root,'LeftPier',[.35,2.8,.45],'chalk',[-.825,1.4,0]);box(root,'RightPier',[.35,2.8,.45],'chalk',[.825,1.4,0]);box(root,'Lintel',[2,.4,.45],'chalk',[0,2.6,0]);break;
 case 'column':box(root,'Column',[.4,3,.4],'mist',[0,1.5,0]);break;
 case 'platform_2':box(root,'Platform',[2,.3,2],'chalk',[0,-.15,0]);break;
 case 'stair_8':stairs(root,'Step',8,accent);break;
 case 'stair_4':stairs(root,'Step',4,accent);break;
 case 'bridge_3':box(root,'Bridge',[3,.22,.95],accent,[1.5,-.11,0]);break;
 case 'rotator':{
  cyl(root,'FixedBase',.6,.1,'charcoal',[0,.05,0]);const rotor=g('Rotator');rotor.userData={motion:'rotateY',snapDegrees:90,safeRadius:2.7};root.add(rotor);cyl(rotor,'Hub',.46,.2,accent,[0,.15,0]);stairs(rotor,'Step',8,accent);box(rotor,'TopLanding',[.65,.25,1.2],accent,[2.325,1.875,0]);break;}
 case 'slider':{
  box(root,'Track',[4,.12,.3],'charcoal',[0,-.35,0]);const slide=g('Slider');slide.userData={motion:'translateX',stops:[-1,0,1]};root.add(slide);box(slide,'Deck',[1.5,.25,1.5],accent,[0,-.125,0]);break;}
 case 'occluder':box(root,'Occluder',[.45,3,2],'mist',[0,1.5,0]);root.userData.role='depth-transition-mask-candidate';break;
 case 'door':box(root,'Door',[.9,1.9,.12],accent,[0,.95,0]);box(root,'Inset',[.055,.34,.04],'chalk',[.28,1,.08]);break;
 case 'marker':cyl(root,'Disc',.3,.05,'charcoal',[0,.025,0]);cyl(root,'Center',.11,.06,'chalk',[0,.03,0]);break;
 case 'plinth':box(root,'Plinth',[6,.45,6],'mist',[0,-.225,0]);break;
 case 'desk':box(root,'Top',[1.5,.12,.7],'chalk',[0,.78,0]);for(const x of [-.6,.6])box(root,'Leg'+x,[.12,.72,.5],'slate',[x,.36,0]);break;
 case 'bench':box(root,'Seat',[1.8,.18,.55],'mist',[0,.48,0]);for(const x of [-.65,.65])box(root,'Foot'+x,[.18,.4,.4],'slate',[x,.2,0]);break;
 case 'shelf':box(root,'Back',[1.6,2.2,.16],'mist',[0,1.1,-.16]);for(const y of [.1,.8,1.5,2.15])box(root,'Shelf'+y,[1.6,.1,.45],'chalk',[0,y,0]);for(let i=0;i<7;i++)box(root,'Book'+i,[.12,.4,.25],i%2?'slate':'chalk',[-.6+i*.2,1.05,0]);break;
 case 'skylight':for(const x of [-1.15,1.15])box(root,'Side'+x,[.3,.2,2.6],'chalk',[x,0,0]);for(const z of [-1.15,1.15])box(root,'End'+z,[2,.2,.3],'chalk',[0,0,z]);break;
 case 'traveler':cyl(root,'Body',.15,.62,'chalk',[0,.65,0]);mesh(root,'Head',new THREE.SphereGeometry(.18,16,12),'chalk',[0,1.12,0]);for(const x of [-.08,.08])box(root,'Foot'+x,[.12,.34,.16],'charcoal',[x,.17,0]);break;
 case 'illusion_pair':{
  box(root,'NearPath',[2,.2,.75],accent,[-1,.9,0]);box(root,'FarPath',[2,.2,.75],accent,[3,2.5,2]);
  for(const [n,p] of [['Endpoint_A',[0,1,0]],['Endpoint_B',[2,2.6,2]]]){const a=g(n);a.position.set(...p);a.userData={role:'authored-endpoint',pair:'E01'};root.add(a);}
  box(root,'NearSupport',[.35,.8,.35],'mist',[-1.7,.4,0]);box(root,'FarSupport',[.35,2.4,.35],'mist',[3.7,1.2,2]);root.userData.connection={id:'E01',cameraPose:'C_ALIGN',moduleState:'settled',walkable:false,status:'projection-only'};break;}
 case 'room_01':{
  add('plinth','Base',[0,0,0],0,[1.35,1,1]);box(root,'RearWall',[8,5.4,.25],'chalk',[0,2.7,-2.85]);box(root,'LeftWall',[.25,3,4],'chalk',[-3.9,1.5,-.8]);
  box(root,'UpperRoom',[2.7,.3,3],'chalk',[2.5,2.85,-1.1]);box(root,'MidLanding',[2.1,.3,2],'mist',[-2.8,1.85,-1.7]);
  add('stair_4','EntrySteps',[-3,0,1],-Math.PI/2,[1,1,1],'mist');add('rotator','M01_Rotator',[-1.5,1,-.2]);
  add('shelf','Books',[2.8,3,-2.5]);add('desk','Desk',[1.4,3,-1.8]);add('bench','Bench',[-2,0,1.9]);add('door','Goal',[1.35,3,-2.66]);add('marker','Safe',[-2.3,0,.3]);add('traveler','Traveler',[-2.3,0,.3]);break;}
 case 'room_02':{
  accent='red';add('plinth','Base',[0,0,0]);box(root,'BackWall',[6,6.2,.25],'chalk',[0,3.1,-2.8]);box(root,'LeftWall',[.25,5.6,5.5],'chalk',[-2.85,2.8,-.15]);
  box(root,'MidFloor',[2.5,.3,4.7],'mist',[-1.55,2.85,-.3]);box(root,'TopFloor',[5.5,.3,1.5],'chalk',[0,5.55,-2]);
  box(root,'Landing',[1,.25,1.6],'chalk',[2.6,1.875,.1]);add('rotator','M01_Rotator',[-.55,0,.1],0,[1,1,1],'red');
  add('stair_8','UpperFlight',[2.2,2,-.6],Math.PI/2,[1,1,1],'red');box(root,'UpperLanding',[1.5,.25,1.4],'red',[2,3.875,-2.1]);
  add('slider','M02_Slider',[.2,4,-2.1],0,[.85,1,.8],'red');add('portal','GoalFrame',[-1.4,3,-2.52]);add('door','Goal',[-1.4,3,-2.54],0,[1,1,1],'red');
  add('marker','Safe',[-1.4,0,1.65]);add('traveler','Traveler',[-1.4,0,1.65]);add('bench','Bench',[-1.8,0,-1.8]);break;}
 case 'room_03':{
  accent='ochre';add('plinth','Base',[0,0,0]);box(root,'BackWall',[6,6,.25],'chalk',[0,3,-2.8]);box(root,'LeftWall',[.25,4.5,4.8],'chalk',[-2.8,2.25,-.4]);
  box(root,'FirstFloor',[2.7,.3,3.2],'mist',[-1.35,1.85,-1.2]);box(root,'Garden',[2.5,.3,2.7],'ochre',[1.5,3.85,-1.4]);
  add('stair_8','EntryStair',[-2.4,0,1.8],0,[1,1,1],'mist');add('stair_8','RearStair',[-2.4,2,-.4],-Math.PI/2,[1,1,1],'chalk');
  const pivot=g('M01_Bridge');pivot.position.set(-1,4,-1.4);const arm=build('bridge_3','slate');arm.name='Rotator';pivot.add(arm);root.add(pivot);arm.userData={motion:'rotateY',snapDegrees:90};
  add('skylight','RoofLight',[1.5,6.4,-1.4]);add('bench','GardenBench',[1.5,4,-2.3]);add('door','Goal',[2.1,4,-2.64],0,[1,1,1],'ochre');
  add('portal','Entry',[1.4,0,2.4]);add('marker','Safe',[1.4,0,1.9]);add('traveler','Traveler',[1.4,0,1.9]);add('desk','Desk',[-1.5,0,-1.7]);break;}
 default:throw new Error('Unknown asset '+id);
 }
 root.updateMatrixWorld(true);return root;
}
export function stats(root){const bounds=new THREE.Box3().setFromObject(root);let triangles=0,meshes=0;root.traverse(o=>{if(o.isMesh){meshes++;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return {triangles,meshes,bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},size:bounds.getSize(new THREE.Vector3()).toArray()};}
