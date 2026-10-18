"""Deterministic CPU model renders and contact sheet. numpy + Pillow; no AI images.
The shading is an inspection approximation, not a pixel match to the WebGL viewer.
"""
import json, math, os, io
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
ROOT=Path(__file__).resolve().parents[1]
SCENES=json.loads((ROOT/'src/render-geometry.json').read_text())
FONT=os.environ.get('ROOM_FONT','/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc')
def font(s):
    try:return ImageFont.truetype(FONT,s)
    except OSError:return ImageFont.truetype('DejaVuSans.ttf',s)
def save_png(image,path):
    buffer=io.BytesIO();image.save(buffer,format='PNG');temp=path.with_suffix('.pending')
    with temp.open('wb') as f:f.write(buffer.getvalue());f.flush();os.fsync(f.fileno())
    temp.replace(path)
def basis(direction):
    d=np.array(direction,dtype=float);d/=np.linalg.norm(d)
    r=np.cross([0,1,0],d);r/=np.linalg.norm(r);u=np.cross(d,r)
    return np.array([r,u,d])
def raster(vertices,faces,colors,normals,axes,center,scale,w,h,full=True):
    q=(vertices-center)@axes.T
    p=np.stack([q[:,0]*scale+w/2,-q[:,1]*scale+h/2,q[:,2]],axis=1)
    depth=np.full((h,w),-1e8,dtype=np.float32)
    rgb=np.zeros((h,w,3),dtype=np.float32) if full else None
    xyz=np.zeros((h,w,3),dtype=np.float32) if full else None
    nn=np.zeros((h,w,3),dtype=np.float32) if full else None
    for k,ids in enumerate(faces):
        if np.dot(normals[k],axes[2])<=0:continue
        a,b,c=p[ids];xmin=max(0,int(np.floor(min(a[0],b[0],c[0]))));xmax=min(w-1,int(np.ceil(max(a[0],b[0],c[0]))))
        ymin=max(0,int(np.floor(min(a[1],b[1],c[1]))));ymax=min(h-1,int(np.ceil(max(a[1],b[1],c[1]))))
        if xmax<xmin or ymax<ymin:continue
        den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1])
        if abs(den)<1e-8:continue
        yy,xx=np.mgrid[ymin:ymax+1,xmin:xmax+1];xx=xx+.5;yy=yy+.5
        w0=((b[1]-c[1])*(xx-c[0])+(c[0]-b[0])*(yy-c[1]))/den
        w1=((c[1]-a[1])*(xx-c[0])+(a[0]-c[0])*(yy-c[1]))/den;w2=1-w0-w1
        z=w0*a[2]+w1*b[2]+w2*c[2];region=depth[ymin:ymax+1,xmin:xmax+1]
        keep=(w0>=-1e-5)&(w1>=-1e-5)&(w2>=-1e-5)&(z>region)
        region[keep]=z[keep]
        if full:
            rgb[ymin:ymax+1,xmin:xmax+1][keep]=colors[k]
            nn[ymin:ymax+1,xmin:xmax+1][keep]=normals[k]
            wp=w0[...,None]*vertices[ids[0]]+w1[...,None]*vertices[ids[1]]+w2[...,None]*vertices[ids[2]]
            xyz[ymin:ymax+1,xmin:xmax+1][keep]=wp[keep]
    return depth,rgb,xyz,nn
def render(sc,direction=(1,.8,1),w=1100,h=900):
    vertices=[];faces=[];colors=[];normals=[]
    for m in sc['meshes']:
        offset=len(vertices);vertices.extend(m['positions']);idx=np.array(m['indices']).reshape(-1,3)
        ns=np.array(m['normals']);pn=np.array(m['positions'])
        for tri in idx:
            n=ns[tri].mean(axis=0);n/=np.linalg.norm(n)
            faces.append(tri+offset);colors.append(m['color']);normals.append(n)
    v=np.array(vertices);low=v.min(axis=0);high=v.max(axis=0);center=(low+high)/2
    view=basis(direction);q=(v-center)@view.T
    scale=min(w*.76/max(np.ptp(q[:,0]),.5),h*.76/max(np.ptp(q[:,1]),.5))
    span=max(high-low);y=low[1]-.025;off=len(vertices)
    vertices.extend([[-30,y,-30],[30,y,-30],[30,y,30],[-30,y,30]])
    faces.extend([[off,off+2,off+1],[off,off+3,off+2]]);colors.extend([[.89,.90,.87]]*2);normals.extend([[0,1,0]]*2)
    v=np.array(vertices);f=np.array(faces);co=np.array(colors);n=np.array(normals)
    light=basis([-3,8,5]);shadowSize=1200;shadowScale=shadowSize/(max(span,2)*2.5)
    sd,*_=raster(v,f[:-2],co[:-2],n[:-2],light,center,shadowScale,shadowSize,shadowSize,False)
    depth,rgb,xyz,nn=raster(v,f,co,n,view,center,scale,w,h)
    lq=(xyz-center)@light.T;lx=np.clip((lq[:,:,0]*shadowScale+shadowSize/2).astype(int),0,shadowSize-1);ly=np.clip((-lq[:,:,1]*shadowScale+shadowSize/2).astype(int),0,shadowSize-1)
    mask=(sd[ly,lx]>lq[:,:,2]+max(span*.003,.013)).astype(np.uint8)*255
    soft=np.array(Image.fromarray(mask).filter(ImageFilter.GaussianBlur(2.4)))/255
    diffuse=np.maximum(0,nn@light[2]);shade=.58+.46*diffuse*(1-.68*soft)
    image=np.clip(rgb*shade[...,None],0,1)
    return Image.fromarray(np.uint8(image*255))

for sc in SCENES:
    save_png(render(sc,sc['camera'],1200,950),ROOT/'previews'/f"{sc['id']}.png")
board=Image.new('RGB',(1800,1900),'#eeeee7');d=ImageDraw.Draw(board)
d.text((65,48),'ROOM / 悬梯之间',font=font(48),fill='#303d3b')
d.text((68,118),'G2  可操作路径研究 · 旋转 / 对齐 / 遮挡 / 抵达',font=font(24),fill='#67766e')
for i,sc in enumerate(SCENES):
    x=45+(i%2)*880;y=205+(i//2)*780
    img=Image.open(ROOT/'previews'/f"{sc['id']}.png");img.thumbnail((840,665))
    board.paste(img,(x,y))
    d.text((x+22,y+675),sc['label'],font=font(28),fill='#303d3b')
d.text((68,1800),'实际场景几何的 CPU 渲染；不代表浏览器画质或性能验收。',font=font(23),fill='#67766e')
d.text((68,1840),'v0.2 / 黑白灰 + 暗红机关 + 赭黄目标 · 可回退的短路径实验',font=font(23),fill='#67766e')
save_png(board,ROOT/'previews/G2_SEQUENCE.png')

