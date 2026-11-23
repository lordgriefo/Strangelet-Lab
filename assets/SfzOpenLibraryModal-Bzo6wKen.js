import{c as G,ak as U,r as m,j as e,M as H,X as L,a6 as J,L as $,w as K,T as Q,i as Y,$ as M,p as W}from"./index-CUOsJISj.js";import{E as X}from"./external-link-C6Yd13Q7.js";import{S as V}from"./share-2-CRFM5A5t.js";import{S as ee}from"./search-BZBxh2Zh.js";import{H as te}from"./hard-drive-CGBdWE-K.js";/**
 * @license lucide-react v0.563.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ae=[["path",{d:"M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2",key:"975kel"}],["circle",{cx:"12",cy:"7",r:"4",key:"17ys0d"}]],se=G("user",ae),D="strangelet_sfz_open_library_custom",k=[{id:"sfz-rhodes-1973",name:"1973 Vintage Rhodes Mk I Stage 73",category:"keys",author:"TineAlchemist (Community)",description:"Captured from an authentic 1973 Stage 73 through a vintage Fender Twin Reverb amp. 6 velocity layers per key with genuine mechanical tine release chimes and warm harmonic chime.",sampleCount:88,velocityLayers:6,fileSizeMb:142.5,tags:["Rhodes","Electric Piano","Vintage","Soul","Lo-Fi","Warm"],previewSynthType:"keys",sfzDefinition:`// 1973 Rhodes Mk I Stage 73 SFZ Map
<global>
polyphony=64
volume=0
ampeg_attack=0.001
ampeg_decay=4.5
ampeg_sustain=0.15
ampeg_release=0.45

<group>
group_label=Sustain Tines
cutoff=8500
fil_type=lpf_2p

<region> sample=samples/rhodes_c2_v1.wav lokey=36 hikey=47 lovel=1 hivel=45 pitch_keycenter=36
<region> sample=samples/rhodes_c2_v2.wav lokey=36 hikey=47 lovel=46 hivel=85 pitch_keycenter=36
<region> sample=samples/rhodes_c2_v3.wav lokey=36 hikey=47 lovel=86 hivel=127 pitch_keycenter=36
<region> sample=samples/rhodes_c4_v1.wav lokey=48 hikey=71 lovel=1 hivel=45 pitch_keycenter=60
<region> sample=samples/rhodes_c4_v2.wav lokey=48 hikey=71 lovel=46 hivel=85 pitch_keycenter=60
<region> sample=samples/rhodes_c4_v3.wav lokey=48 hikey=71 lovel=86 hivel=127 pitch_keycenter=60
`},{id:"sfz-juno-106-pad",name:"Juno-106 Analog Saw Chorus Pad",category:"synths",author:"RolandPurist (Tokyo Collective)",description:"Sumptuous stereo analog lushness recorded directly through the coveted BBD analog Chorus II circuit. Rich sub-oscillator reinforcement and filter resonance sweep.",sampleCount:48,velocityLayers:4,fileSizeMb:86.2,tags:["Juno 106","Analog Pad","BBD Chorus","Synthwave","Ambient"],previewSynthType:"pad",sfzDefinition:`// Juno-106 Analog Chorus Pad SFZ Map
<global>
polyphony=32
ampeg_attack=0.45
ampeg_decay=2.8
ampeg_sustain=0.75
ampeg_release=1.8

<group>
group_label=Chorus Saw Pad
pan_curve=2
fil_type=lpf_4p
cutoff=4800

<region> sample=samples/juno_c1.wav lokey=24 hikey=35 lovel=1 hivel=127 pitch_keycenter=24
<region> sample=samples/juno_c2.wav lokey=36 hikey=47 lovel=1 hivel=127 pitch_keycenter=36
<region> sample=samples/juno_c3.wav lokey=48 hikey=59 lovel=1 hivel=127 pitch_keycenter=48
<region> sample=samples/juno_c4.wav lokey=60 hikey=71 lovel=1 hivel=127 pitch_keycenter=60
<region> sample=samples/juno_c5.wav lokey=72 hikey=83 lovel=1 hivel=127 pitch_keycenter=72
`},{id:"sfz-chamber-cello",name:"Spitfire Intimate Chamber Cello",category:"strings",author:"OrchestralHacks (London)",description:"Hyper-expressive solo cello recorded in a resonant stone chapel. Captures delicate rosin friction, slow sul tasto bowing, and impassioned forte vibrato.",sampleCount:64,velocityLayers:5,fileSizeMb:118,tags:["Cello","Strings","Acoustic","Expressive","Cinematic","Folk"],previewSynthType:"pad",sfzDefinition:`// Intimate Chamber Cello SFZ Map
<global>
polyphony=16
ampeg_attack=0.18
ampeg_decay=3.2
ampeg_sustain=0.82
ampeg_release=0.95

<group>
group_label=Solo Sul Tasto Cello
<region> sample=samples/cello_c2_pp.wav lokey=36 hikey=42 lovel=1 hivel=60 pitch_keycenter=36
<region> sample=samples/cello_c2_ff.wav lokey=36 hikey=42 lovel=61 hivel=127 pitch_keycenter=36
<region> sample=samples/cello_g2_pp.wav lokey=43 hikey=50 lovel=1 hivel=60 pitch_keycenter=43
<region> sample=samples/cello_g2_ff.wav lokey=43 hikey=50 lovel=61 hivel=127 pitch_keycenter=43
`},{id:"sfz-moog-model-d",name:"Model D Moog Sub 3-Osc Bass",category:"bass",author:"TransistorLab (Detroit)",description:"Triple-oscillator discrete transistor ladder filter bass from a 1974 Minimoog. Delivers the undeniable low-end authority that anchors West Coast hip-hop and funk.",sampleCount:36,velocityLayers:4,fileSizeMb:52.4,tags:["Minimoog","Analog Bass","Ladder Filter","Sub","Funk","808"],previewSynthType:"bass",sfzDefinition:`// Model D Moog Sub Bass SFZ Map
<global>
polyphony=1
ampeg_attack=0.005
ampeg_decay=1.2
ampeg_sustain=0.4
ampeg_release=0.15

<group>
group_label=Ladder Filter Sub
cutoff=1800
resonance=8.5

<region> sample=samples/moog_c1.wav lokey=24 hikey=35 lovel=1 hivel=127 pitch_keycenter=24
<region> sample=samples/moog_c2.wav lokey=36 hikey=47 lovel=1 hivel=127 pitch_keycenter=36
<region> sample=samples/moog_c3.wav lokey=48 hikey=59 lovel=1 hivel=127 pitch_keycenter=48
`},{id:"sfz-strat-plucks",name:"Clean Acoustic Stratocaster Plucks",category:"guitars",author:"NashvilleStemGuild",description:"1962 Reissue Stratocaster clean neck pickup played with natural fingerstyle attack. Features round-robin note variations and palm-muted staccato layers.",sampleCount:72,velocityLayers:4,fileSizeMb:94.3,tags:["Guitar","Stratocaster","Fingerstyle","Organic","Acoustic","Clean"],previewSynthType:"pluck",sfzDefinition:`// Clean Stratocaster Plucks SFZ Map
<global>
polyphony=24
ampeg_attack=0.002
ampeg_decay=2.1
ampeg_sustain=0.1
ampeg_release=0.25

<group>
group_label=Neck Pickup Fingerstyle
<region> sample=samples/strat_e2.wav lokey=40 hikey=46 lovel=1 hivel=127 pitch_keycenter=40
<region> sample=samples/strat_a2.wav lokey=47 hikey=52 lovel=1 hivel=127 pitch_keycenter=47
<region> sample=samples/strat_d3.wav lokey=53 hikey=58 lovel=1 hivel=127 pitch_keycenter=53
<region> sample=samples/strat_g3.wav lokey=59 hikey=64 lovel=1 hivel=127 pitch_keycenter=59
`},{id:"sfz-linndrum-tape",name:"LinnDrum LM-1 Authentic Tape Chops",category:"drums",author:"PrinceVaultTribute",description:"The definitive sound of 1980s Minneapolis funk: punchy LM-1 eprom chips tracked directly through a revox A77 tape recorder with variable speed pitch detuning.",sampleCount:32,velocityLayers:4,fileSizeMb:38.6,tags:["LinnDrum","LM1","80s Drums","Prince","Tape Punch","Vintage"],previewSynthType:"lead",sfzDefinition:`// LinnDrum LM-1 Tape Chops SFZ Map
<global>
polyphony=16

<group>
group_label=LM1 Tape Drums
<region> sample=samples/lm1_kick.wav key=36 lovel=1 hivel=127
<region> sample=samples/lm1_snare.wav key=38 lovel=1 hivel=127
<region> sample=samples/lm1_sidestick.wav key=37 lovel=1 hivel=127
<region> sample=samples/lm1_hihat_cl.wav key=42 lovel=1 hivel=127
<region> sample=samples/lm1_hihat_op.wav key=46 lovel=1 hivel=127
<region> sample=samples/lm1_tom_hi.wav key=50 lovel=1 hivel=127
<region> sample=samples/lm1_tom_low.wav key=45 lovel=1 hivel=127
<region> sample=samples/lm1_cowbell.wav key=56 lovel=1 hivel=127
<region> sample=samples/lm1_conga.wav key=64 lovel=1 hivel=127
`},{id:"sfz-devine-granular-shards",name:"Devine Machine Granular Tape Shards",category:"experimental",author:"StrangeletCoreLab",description:"Burroughsian permutational tape cut-ups, micro-stutters, bit-crushed resonant chirps, and reversed tape tails from the legendary Devine Machine VST lineage.",sampleCount:54,velocityLayers:3,fileSizeMb:68,tags:["Devine Machine","Glitch","Granular","IDM","Reel Cut-Up","Burroughs"],previewSynthType:"bell",sfzDefinition:`// Devine Machine Granular Tape Shards SFZ Map
<global>
polyphony=32
ampeg_attack=0.01
ampeg_decay=1.8
ampeg_sustain=0.2
ampeg_release=0.4

<group>
group_label=Granular Glitch Chops
<region> sample=samples/shard_slice_1.wav key=60 lovel=1 hivel=127
<region> sample=samples/shard_slice_2.wav key=61 lovel=1 hivel=127
<region> sample=samples/shard_slice_rev.wav key=62 lovel=1 hivel=127
`}];function g(){try{const l=localStorage.getItem(D);if(!l)return k;const s=JSON.parse(l);return Array.isArray(s)&&s.length>0?s:k}catch{return k}}function F(l){try{localStorage.setItem(D,JSON.stringify(l))}catch(s){console.warn("Failed to save SFZ library to localStorage:",s)}}function le(l){const s=g(),d={...l,id:`sfz-custom-${Date.now()}`,isCommunityShared:!0},u=[d,...s];return F(u),d}function re(l){const d=g().filter(u=>u.id!==l);F(d)}function oe(l){try{const s=U();s.state==="suspended"&&s.resume();const d=s.currentTime;[{f:261.63,t:0,d:.35},{f:329.63,t:.3,d:.35},{f:392,t:.6,d:.4},{f:523.25,t:.9,d:.7}].forEach(({f:p,t:h,d:c})=>{const a=d+h,n=s.createOscillator(),i=s.createOscillator(),o=s.createGain(),r=s.createBiquadFilter();l==="keys"?(n.type="sine",i.type="triangle",n.frequency.setValueAtTime(p,a),i.frequency.setValueAtTime(p*2,a),r.type="lowpass",r.frequency.setValueAtTime(2400,a),r.frequency.exponentialRampToValueAtTime(600,a+c),o.gain.setValueAtTime(0,a),o.gain.linearRampToValueAtTime(.18,a+.005),o.gain.exponentialRampToValueAtTime(.001,a+c)):l==="bass"?(n.type="sawtooth",i.type="square",n.frequency.setValueAtTime(p*.5,a),i.frequency.setValueAtTime(p*.505,a),r.type="lowpass",r.frequency.setValueAtTime(800,a),r.frequency.exponentialRampToValueAtTime(140,a+c),r.Q.setValueAtTime(5.5,a),o.gain.setValueAtTime(0,a),o.gain.linearRampToValueAtTime(.25,a+.01),o.gain.exponentialRampToValueAtTime(.001,a+c)):l==="pad"?(n.type="sawtooth",i.type="sawtooth",n.frequency.setValueAtTime(p,a),i.frequency.setValueAtTime(p*1.004,a),r.type="lowpass",r.frequency.setValueAtTime(3200,a),o.gain.setValueAtTime(0,a),o.gain.linearRampToValueAtTime(.14,a+.08),o.gain.exponentialRampToValueAtTime(.001,a+c+.2)):l==="pluck"?(n.type="triangle",i.type="sawtooth",n.frequency.setValueAtTime(p,a),i.frequency.setValueAtTime(p*2,a),r.type="lowpass",r.frequency.setValueAtTime(4500,a),r.frequency.exponentialRampToValueAtTime(400,a+c),o.gain.setValueAtTime(0,a),o.gain.linearRampToValueAtTime(.2,a+.003),o.gain.exponentialRampToValueAtTime(.001,a+c)):(n.type="sine",i.type="sine",n.frequency.setValueAtTime(p,a),i.frequency.setValueAtTime(p*2.76,a),r.type="bandpass",r.frequency.setValueAtTime(p*2,a),o.gain.setValueAtTime(0,a),o.gain.linearRampToValueAtTime(.16,a+.002),o.gain.exponentialRampToValueAtTime(.001,a+c)),n.connect(r),i.connect(r),r.connect(o),o.connect(s.destination),n.start(a),i.start(a),n.stop(a+c+.2),i.stop(a+c+.2)})}catch(s){console.warn("Audio audition error:",s)}}function ne(l){const s=new Blob([l.sfzDefinition],{type:"text/plain;charset=utf-8"}),d=URL.createObjectURL(s),u=document.createElement("a");u.href=d,u.download=`${l.name.toLowerCase().replace(/[^a-z0-9]/g,"_")}.sfz`,document.body.appendChild(u),u.click(),document.body.removeChild(u),URL.revokeObjectURL(d)}const ue=({isOpen:l,onClose:s,onLoadInstrumentToTrack:d,onOpenSfzBuilder:u})=>{const[p,h]=m.useState([]),[c,a]=m.useState("all"),[n,i]=m.useState(""),[o,r]=m.useState(null),[B,x]=m.useState(!1),[v,_]=m.useState(""),[b,R]=m.useState("keys"),[j,S]=m.useState(""),[C,A]=m.useState(""),[T,N]=m.useState(""),[f,z]=m.useState("");if(m.useEffect(()=>{l&&h(g())},[l]),!l)return null;const I=[{id:"all",label:"All Instruments"},{id:"keys",label:"Keys & Pianos"},{id:"synths",label:"Analog Synths"},{id:"strings",label:"Orchestral Strings"},{id:"bass",label:"Bass & Sub"},{id:"guitars",label:"Guitars"},{id:"drums",label:"Drums & Percussion"},{id:"experimental",label:"Glitch & Cut-Up"}],E=p.filter(t=>{const y=c==="all"||t.category===c,w=t.name.toLowerCase().includes(n.toLowerCase())||t.description.toLowerCase().includes(n.toLowerCase())||t.tags.some(Z=>Z.toLowerCase().includes(n.toLowerCase()));return y&&w}),q=t=>{W("laser_select"),r(t.id),oe(t.previewSynthType),setTimeout(()=>{r(null)},1500)},P=t=>{t.preventDefault(),!(!v.trim()||!f.trim())&&(le({name:v.trim(),category:b,author:j.trim()||"Local Producer",description:C.trim()||"Custom community multisample instrument map",sampleCount:16,velocityLayers:4,fileSizeMb:42,tags:T.split(",").map(y=>y.trim()).filter(Boolean),previewSynthType:b==="bass"?"bass":b==="synths"?"pad":"keys",sfzDefinition:f.trim()}),h(g()),x(!1),M(),_(""),S(""),A(""),N(""),z(""))},O=t=>{re(t),h(g())};return e.jsx("div",{className:"fixed inset-0 z-[120] bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-mono",children:e.jsxs("div",{className:"bg-[#0A0D17] border border-[#212B45] w-full max-w-5xl h-[88vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden shadow-cyan-950/40",children:[e.jsxs("div",{className:"flex items-center justify-between px-6 py-4 border-b border-[#1A2238] bg-gradient-to-r from-[#0E1528] to-[#0A0D17]",children:[e.jsxs("div",{className:"flex items-center gap-3",children:[e.jsx("div",{className:"w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25",children:e.jsx(H,{size:22})}),e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("h2",{className:"text-base font-bold text-white tracking-wide",children:"SFZ Open Library & Community Sample Exchange"}),e.jsx("span",{className:"text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800",children:"OPEN FORMAT"})]}),e.jsx("p",{className:"text-xs text-[#7E8B9B]",children:"Open-source sample maps, multi-velocity instruments, and community sample sharing"})]})]}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsxs("a",{href:"https://sfzinstruments.github.io/",target:"_blank",rel:"noreferrer",className:"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/70 hover:bg-emerald-900/80 border border-emerald-500/50 text-emerald-300 text-xs font-bold transition-all shadow-md shadow-emerald-950/40",title:"Explore 200+ free open-source SFZ instruments at sfzinstruments.github.io",children:[e.jsx(X,{size:13}),e.jsx("span",{className:"hidden sm:inline",children:"sfzinstruments.github.io"}),e.jsx("span",{className:"sm:hidden",children:"SFZ Hub"})]}),e.jsxs("button",{onClick:()=>x(!0),className:"flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-950/40",children:[e.jsx(V,{size:13}),e.jsx("span",{children:"Share My Sample / SFZ"})]}),e.jsx("button",{onClick:s,className:"p-1.5 rounded-lg text-[#7E8B9B] hover:text-white hover:bg-[#1A233A] transition-colors",children:e.jsx(L,{size:18})})]})]}),e.jsxs("div",{className:"px-6 py-3 border-b border-[#1A2238] bg-[#080B14] flex flex-wrap items-center justify-between gap-3",children:[e.jsx("div",{className:"flex items-center gap-1.5 overflow-x-auto scrollbar-none py-1",children:I.map(t=>e.jsx("button",{onClick:()=>a(t.id),className:`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex-shrink-0 ${c===t.id?"bg-cyan-950 text-cyan-300 border border-cyan-700 shadow-sm":"text-[#7A86A1] hover:text-white hover:bg-[#121729]"}`,children:t.label},t.id))}),e.jsxs("div",{className:"relative w-64",children:[e.jsx(ee,{size:14,className:"absolute left-2.5 top-2.5 text-[#5A6680]"}),e.jsx("input",{type:"text",placeholder:"Search library...",value:n,onChange:t=>i(t.target.value),className:"w-full bg-[#12172A] border border-[#212A45] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#5A6680] focus:outline-none focus:border-cyan-500"})]})]}),e.jsx("div",{className:"flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-[#090C16]",children:E.map(t=>e.jsxs("div",{className:"p-5 rounded-2xl bg-[#0E1324] border border-[#1F273E] hover:border-cyan-500/40 transition-all flex flex-col justify-between space-y-4 group shadow-md",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-start justify-between gap-2 mb-1.5",children:[e.jsxs("div",{children:[e.jsxs("div",{className:"flex items-center gap-2 mb-1",children:[e.jsx("span",{className:"text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-800",children:t.category}),t.isCommunityShared&&e.jsx("span",{className:"text-[10px] px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800",children:"Community Upload"})]}),e.jsx("h3",{className:"text-sm font-bold text-white group-hover:text-cyan-300 transition-colors",children:t.name})]}),e.jsx("button",{onClick:()=>q(t),className:`p-2 rounded-xl border flex items-center justify-center transition-all ${o===t.id?"bg-cyan-500 text-black border-cyan-400 animate-pulse shadow-[0_0_15px_rgba(6,182,212,0.6)]":"bg-[#151C30] text-cyan-300 border-[#2A3657] hover:border-cyan-400 hover:bg-[#1E2744]"}`,title:"Audition Instrument Audio Preview",children:e.jsx(J,{size:16})})]}),e.jsx("p",{className:"text-xs text-[#8B98B2] leading-relaxed mb-3",children:t.description}),e.jsxs("div",{className:"flex flex-wrap items-center gap-2 text-[10px] text-[#7885A0]",children:[e.jsxs("span",{className:"flex items-center gap-1 bg-[#12182B] px-2 py-0.5 rounded border border-[#1F2942]",children:[e.jsx($,{size:11}),e.jsxs("span",{children:[t.velocityLayers," Velocity Layers"]})]}),e.jsxs("span",{className:"flex items-center gap-1 bg-[#12182B] px-2 py-0.5 rounded border border-[#1F2942]",children:[e.jsx(te,{size:11}),e.jsxs("span",{children:[t.fileSizeMb," MB"]})]}),e.jsxs("span",{className:"flex items-center gap-1 bg-[#12182B] px-2 py-0.5 rounded border border-[#1F2942]",children:[e.jsx(se,{size:11}),e.jsx("span",{children:t.author})]})]})]}),e.jsxs("div",{className:"pt-3 border-t border-[#1B2338] flex items-center justify-between gap-2",children:[e.jsx("div",{className:"flex items-center gap-1.5",children:t.tags.slice(0,3).map((y,w)=>e.jsxs("span",{className:"text-[9px] px-1.5 py-0.5 rounded bg-[#101526] text-[#717E9C]",children:["#",y]},w))}),e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx("button",{onClick:()=>ne(t),className:"p-1.5 rounded-lg text-[#7E8B9B] hover:text-white hover:bg-[#1A243B] transition-colors",title:"Download .sfz format definition",children:e.jsx(K,{size:14})}),t.isCommunityShared&&e.jsx("button",{onClick:()=>O(t.id),className:"p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-950/40 transition-colors",title:"Delete custom shared instrument",children:e.jsx(Q,{size:14})}),d&&e.jsxs("button",{onClick:()=>{M(),d(t),s()},className:"px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md active:scale-95 flex items-center gap-1.5",children:[e.jsx(Y,{size:13}),e.jsx("span",{children:"Load to Track"})]})]})]})]},t.id))}),B&&e.jsx("div",{className:"fixed inset-0 z-[130] bg-black/80 backdrop-blur-md flex items-center justify-center p-4",children:e.jsxs("div",{className:"bg-[#0E1324] border border-[#263252] w-full max-w-xl rounded-2xl p-6 space-y-4 shadow-2xl",children:[e.jsxs("div",{className:"flex items-center justify-between border-b border-[#212A45] pb-3",children:[e.jsxs("h3",{className:"text-sm font-bold text-white flex items-center gap-2",children:[e.jsx(V,{size:16,className:"text-cyan-400"}),e.jsx("span",{children:"Share / Publish Custom SFZ Instrument"})]}),e.jsx("button",{onClick:()=>x(!1),className:"p-1 text-[#7885A0] hover:text-white",children:e.jsx(L,{size:16})})]}),e.jsxs("form",{onSubmit:P,className:"space-y-3 text-xs",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[11px] font-bold text-[#A2ACC5] mb-1",children:"Instrument Name:"}),e.jsx("input",{type:"text",required:!0,placeholder:"e.g. Vintage 1968 Farfisa Compact Organ",value:v,onChange:t=>_(t.target.value),className:"w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"})]}),e.jsxs("div",{className:"grid grid-cols-2 gap-3",children:[e.jsxs("div",{children:[e.jsx("label",{className:"block text-[11px] font-bold text-[#A2ACC5] mb-1",children:"Category:"}),e.jsxs("select",{value:b,onChange:t=>R(t.target.value),className:"w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400",children:[e.jsx("option",{value:"keys",children:"Keys & Pianos"}),e.jsx("option",{value:"synths",children:"Analog Synths"}),e.jsx("option",{value:"strings",children:"Orchestral Strings"}),e.jsx("option",{value:"bass",children:"Bass & Sub"}),e.jsx("option",{value:"guitars",children:"Guitars"}),e.jsx("option",{value:"drums",children:"Drums & Percussion"}),e.jsx("option",{value:"experimental",children:"Glitch & Cut-Up"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[11px] font-bold text-[#A2ACC5] mb-1",children:"Author / Creator:"}),e.jsx("input",{type:"text",placeholder:"Your Producer Name",value:j,onChange:t=>S(t.target.value),className:"w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"})]})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[11px] font-bold text-[#A2ACC5] mb-1",children:"Description & Sample Details:"}),e.jsx("input",{type:"text",placeholder:"Microphone chain, vintage gear provenance, velocity range...",value:C,onChange:t=>A(t.target.value),className:"w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[11px] font-bold text-[#A2ACC5] mb-1",children:"Tags (comma separated):"}),e.jsx("input",{type:"text",placeholder:"organ, vintage, 60s, tape, combo",value:T,onChange:t=>N(t.target.value),className:"w-full bg-[#151C30] border border-[#283556] rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-400"})]}),e.jsxs("div",{children:[e.jsx("label",{className:"block text-[11px] font-bold text-[#A2ACC5] mb-1",children:"SFZ Definition File Text:"}),e.jsx("textarea",{rows:4,required:!0,placeholder:`<global>
polyphony=32
<group>
<region> sample=sample.wav lokey=36 hikey=48 pitch_keycenter=36`,value:f,onChange:t=>z(t.target.value),className:"w-full bg-[#151C30] border border-[#283556] rounded-lg p-2.5 font-mono text-[11px] text-cyan-200 focus:outline-none focus:border-cyan-400"})]}),e.jsxs("div",{className:"pt-2 flex justify-end gap-2",children:[e.jsx("button",{type:"button",onClick:()=>x(!1),className:"px-3 py-1.5 rounded-lg text-[#8895B2] hover:text-white",children:"Cancel"}),e.jsx("button",{type:"submit",className:"px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all shadow-md shadow-cyan-900/40",children:"Publish to SFZ Open Library"})]})]})]})})]})})};export{ue as SfzOpenLibraryModal};
