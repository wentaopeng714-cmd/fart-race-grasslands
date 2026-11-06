export const FOODS = [
 {id:'poop',name:'热乎小面包',base:1,need:0,kind:'roll'},
 {id:'fish',name:'街角热狗',base:2,need:20,kind:'hotdog'},
 {id:'walnut',name:'甜玉米棒',base:3,need:160,kind:'corn'},
 {id:'pepper',name:'彩椒烤串',base:4,need:1280,kind:'skewer'},
 ...[5,10,15,20,25,30].map((base,i)=>({id:`banana${base}`,name:'能量甜甜圈',base,need:3840*(i+1),kind:'donut'})),
 ...[40,50,60,70,80,100].map((base,i)=>({id:`steak${base}`,name:'双层汉堡',base,need:61440*(i+1),kind:'burger'})),
];
export const TOILETS = [
 {id:'none',name:'徒步',cost:0,speed:1,power:1,coins:1,color:0xffffff},
 {id:'white',name:'便携小马桶',cost:100,speed:1.1,power:1.1,coins:1.1,color:0xf1dca8},
 {id:'rocket',name:'汽水双喷座',cost:200,speed:1.12,power:1.3,coins:1.11,color:0x64b7b0},
 {id:'pink',name:'弹簧软垫座',cost:500,speed:1.14,power:1.6,coins:1.12,color:0xec9a9a},
 {id:'noob',name:'滑板马桶',cost:1250,speed:1.16,power:2,coins:1.13,color:0xf0bd51},
 {id:'crab',name:'哑铃训练座',cost:6250,speed:1.2,power:3.2,coins:1.14,color:0x6cabc1},
 {id:'balloon',name:'风筝小座驾',cost:312500,speed:1.24,power:4.5,coins:1.15,color:0xdfac69},
 {id:'octopus',name:'涡轮座驾',cost:625000,speed:1.26,power:6.4,coins:1.16,color:0xa69bc7},
 {id:'bat',name:'社区冠军号',cost:19531250,speed:1.3,power:10,coins:1.19,color:0xe1bc54},
];
export const PETS = [
 {id:'cat',name:'橘子小跑',color:0xedb263,kind:'cat'},
 {id:'dog',name:'豆包小柴',color:0xd7a572,kind:'dog'},
 {id:'bomb',name:'弹力球球',color:0xe6a065,kind:'bomb'},
 {id:'blob',name:'薄荷小团',color:0x76b2a2,kind:'blob'},
 {id:'octo',name:'棉花小云',color:0xeee4cf,kind:'octo'},
];
export const EGGS = [
 {id:0,name:'笑脸蛋',cost:50,color:0xffd442,mults:[1.6,1.9,2.1]},
 {id:1,name:'惊喜蛋',cost:250,color:0x6ae1ec,mults:[2.4,2.7,3.2]},
 {id:2,name:'星光蛋',cost:1250,color:0xb873ed,mults:[4.8,5.4,6.4]},
 {id:3,name:'彩虹蛋',cost:6250,color:0xffa5d4,mults:[9.6,11.2,14.4]},
 {id:4,name:'皇冠蛋',cost:31250,color:0xffc743,mults:[19.2,22.4,28.8]},
];
export const GIFTS = [
 {time:10,coins:450},{time:45,coins:250},{time:90,coins:1000},
 {time:180,coins:3000},{time:300,coins:6250},{time:480,coins:12500},
];
export const NPCS = [
 {id:'npc-bacon',name:'小卷毛',power:50,style:'bacon',toilet:'white'},
 {id:'npc-noob',name:'阿橘',power:400,style:'noob',toilet:'rocket'},
 {id:'npc-pizza',name:'辣椒姐',power:3200,style:'pizza',toilet:'pink'},
 {id:'npc-doge',name:'风筝阿姨',power:38400,style:'doge',toilet:'noob'},
 {id:'npc-shrek',name:'大力叔',power:614400,style:'shrek',toilet:'crab'},
];
export const FOOD = Object.fromEntries(FOODS.map(x=>[x.id,x]));
export const TOILET = Object.fromEntries(TOILETS.map(x=>[x.id,x]));
export const PET = Object.fromEntries(PETS.map(x=>[x.id,x]));
export const fmt = n => {n=Number(n)||0; if(n<1000)return Math.floor(n).toLocaleString('en-US'); for(const [v,s] of [[1e12,'T'],[1e9,'B'],[1e6,'M'],[1e3,'K']])if(n>=v)return (n/v).toFixed(2)+s;};
export function toiletStats(p){const t=TOILET[p.toilet]||TOILETS[0], l=p.levels?.[t.id]||1;return {...t,speed:t.speed*(1+.025*(l-1)),power:t.power*(1+.18*(l-1)),coins:t.coins+.01*(l-1),level:l,upgrade:Math.ceil(t.cost*.5*1.7**(l-1))};}
export function gain(p){const pets=(p.pets||[]).filter(x=>(p.equipped||[]).includes(x.id));const mult=pets.length?pets.reduce((a,x)=>a+x.mult,0):1;return Math.ceil((FOOD[p.food]?.base||1)*toiletStats(p).power*mult*(1+.1*p.rebirth));}
export function reward(d,p){let b=10;for(const [v,r] of [[400,50],[3200,250],[38400,1250],[614400,6250],[1e7,31250],[1e9,156250]])if(d>=v)b=r;return Math.round(b*toiletStats(p).coins);}
export function visualDistance(d){return d<=400?d:400+Math.log(d/400)/Math.log(8)*400;}
export function rebirthCost(p){return Math.ceil(25*1.5**p.rebirth);}
