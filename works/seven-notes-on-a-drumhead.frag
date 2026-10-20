// Seven Notes on a Drumhead
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
const float PI=3.141592653589793;
const float ROOT01=2.4048255577;
vec2 besselPair(float x,int m){
 if(x<0.0001)return m==0?vec2(1.0,0.0):vec2(0.0);
 int top=int(max(float(m+1),x))+18;
 float b=1e-20,c=0.0,sum=0.0,jm=0.0,jp=0.0;
 // Bessel recurrence
 for(int i=0;i<56;i++){
  int k=top-i;
  if(k<1)break;
  float v=2.0*float(k)*b/x-c;
  if(abs(v)>1e12){
   v*=1e-12;
   b*=1e-12;
   sum*=1e-12;
   jm*=1e-12;
   jp*=1e-12;
  }
  int o=k-1;
  if(o==m)jm=v;
  if(o==m+1)jp=v;
  if(mod(float(o),2.0)<0.5)sum+=o==0?v:2.0*v;
  c=b;
  b=v;
 }
 return vec2(jm,jp)/sum;
}
float rootGuess(int m,int n){
 float mf=float(m),nf=float(n);
 // Zero estimate
 if(m>0&&nf<=1.0+floor(mf*0.5)){
  float h=pow(mf*0.5,1.0/3.0);
  float t=3.0*PI*(4.0*nf-1.0)/8.0;
  float a=pow(t,2.0/3.0)*(1.0+5.0/(48.0*t*t));
  return mf+a*h+0.15*a*a/h;
 }
 float beta=(nf+mf*0.5-0.25)*PI;
 float mu=4.0*mf*mf;
 return beta-(mu-1.0)/(8.0*beta)-(mu-1.0)*(7.0*mu-31.0)/(384.0*beta*beta*beta);
}
float noteFrequency(int i){
 int key=62;
 if(i==1)key=65;
 if(i==2)key=76;
 if(i==3)key=79;
 if(i==4)key=82;
 if(i==5)key=83;
 if(i==6)key=84;
 return 440.0*pow(2.0,(float(key)-69.0)/12.0);
}
// Modal amplitude
vec2 amplitude(float q,float drive,float coupling,float norm){
 float r=q*q-drive*drive;
 float im=0.02*q*drive;
 float sc=coupling/(norm*(r*r+im*im));
 return vec2(r,-im)*sc;
}
void main(){
 float H=u_resolution.y;
 vec2 p=(gl_FragCoord.xy-0.5*u_resolution)/H;
 float rho=length(p)/0.45;
 bool disk=rho<1.0;
 float rx=min(abs(gl_FragCoord.x-0.28*H),abs(gl_FragCoord.x-(u_resolution.x-0.28*H)));
 bool ruler=u_resolution.x>=1.56*H&&rx<0.024*H;
 if(!disk&&!ruler){
  float d=(rho-1.0)*0.45*H;
  float rim=d<3.0?0.30*exp(-d*d/1.44):0.0;
  gl_FragColor=vec4(vec3(rim),1.0);
  return;
 }
 float cycle=mod(u_time,45.5);
 int current=int(floor(cycle/6.5));
 int next=current==6?0:current+1;
 float lt=cycle-6.5*float(current);
 // Crossfade
 float s=smoothstep(5.0,6.5,lt);
 float w1=cos(0.5*PI*s);
 float w2=sin(0.5*PI*s);
 float f1=noteFrequency(current);
 float f2=noteFrequency(next);
 float q1=f1/110.0;
 float q2=f2/110.0;
 float hz=ruler?1200.0:1.3*f1;
 if(disk&&w2>0.00001)hz=max(hz,1.3*f2);
 float limit=hz*ROOT01/110.0;
 vec2 u1=vec2(0.0),u2=vec2(0.0);
 float rms1=0.0,rms2=0.0,ticks=0.0;
 float angle=atan(p.y,p.x);
 for(int m=0;m<25;m++){
  float angular=disk?cos(float(m)*angle):0.0;
  for(int n=1;n<=9;n++){
   float alpha=rootGuess(m,n);
   if(alpha>limit+1.5)break;
   float nb=0.0;
   for(int step=0;step<2;step++){
    vec2 pair=besselPair(alpha,m);
    nb=pair.y;
    alpha-=pair.x/(float(m)*pair.x/alpha-pair.y);
   }
   if(alpha>limit)break;
   float q=alpha/ROOT01;
   float fm=110.0*q;
   // Rulers
   if(ruler&&fm>=100.0&&fm<=1200.0){
    float ty=H*(0.1+0.8*log(fm/100.0)/log(12.0));
    float hx=1.0-smoothstep(0.021*H,0.023*H,rx);
    float vy=1.0-smoothstep(0.35,1.2,abs(gl_FragCoord.y-ty));
    float val=clamp(0.85*pow(110.0/fm,0.45),0.12,0.85);
    ticks=max(ticks,val*hx*vy);
   }
   if(!disk)continue;
   bool use1=fm<=1.3*f1;
   bool use2=w2>0.00001&&fm<=1.3*f2;
   if(!use1&&!use2)continue;
   float norm=nb*nb*(m==0?1.0:0.5);
   float coupling=besselPair(alpha*0.417,m).x;
   float shape=besselPair(alpha*rho,m).x*angular;
   if(use1){
    vec2 a1=amplitude(q,q1,coupling,norm);
    u1+=a1*shape;
    rms1+=dot(a1,a1)*norm;
   }
   if(use2){
    vec2 a2=amplitude(q,q2,coupling,norm);
    u2+=a2*shape;
    rms2+=dot(a2,a2)*norm;
   }
  }
 }
 float light=0.0;
 if(disk){
  float v2=w1*w1*dot(u1,u1)/(6.76*max(rms1,1e-20));
  if(w2>0.00001)v2+=w2*w2*dot(u2,u2)/(6.76*max(rms2,1e-20));
  float filaments=exp(-100.0*v2);
  float glow=0.35*exp(-16.0*v2);
  light=(filaments+glow)*smoothstep(0.0,0.008,1.0-rho);
 }
 float rp=(rho-1.0)*0.45*H;
 light=max(light,0.30*exp(-rp*rp/1.44));
 if(ruler){
  float axis=0.15*(1.0-smoothstep(0.2,1.2,rx));
  light=max(light,max(axis,ticks));
  float mx=1.0-smoothstep(0.028*H,0.032*H,rx);
  float y1=H*(0.1+0.8*log(f1/100.0)/log(12.0));
  float y2=H*(0.1+0.8*log(f2/100.0)/log(12.0));
  float mark1=w1*exp(-pow((gl_FragCoord.y-y1)/1.4,2.0));
  float mark2=w2*exp(-pow((gl_FragCoord.y-y2)/1.4,2.0));
  light=max(light,mx*max(mark1,mark2));
 }
 gl_FragColor=vec4(vec3(clamp(light,0.0,1.0)),1.0);
}
