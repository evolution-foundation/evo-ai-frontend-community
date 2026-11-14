import type { PipelineItem, CardConfiguration } from '../../src/types/analytics/pipelines';
import {createRoot} from 'react-dom/client';
import {MemoryRouter} from 'react-router-dom';
import ConfiguredDealCard from '../../src/pages/Customer/Pipelines/ConfiguredDealCard';
import {defaultConfiguration,nativeFields} from '../../src/pages/Customer/Pipelines/cardConfiguration';
import '../../src/styles/globals.css';
const config=defaultConfiguration();config.fields.find(f=>f.id==='contact')!.visible=false;
const photo='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60"><rect width="60" height="60" fill="#55768A"/><circle cx="30" cy="21" r="11" fill="#f2c6a0"/><path d="M10 60 Q10 35 30 35 Q50 35 50 60" fill="#1A4F4F"/></svg>');
createRoot(document.getElementById('root')!).render(<MemoryRouter><main style={{padding:32,display:'flex',gap:24}}>{['comfortable','compact'].map(density=><section style={{width:304,flexShrink:0}} key={density}><h2>{density}</h2>{[photo,undefined,'/missing-photo.png'].map((avatar_url,i)=><div className="deal-card-shell" style={{position:'relative',marginBottom:12}} key={i}><div className="m1-actions absolute top-2 right-2 flex items-center gap-0.5 opacity-100"><button style={{padding:4,width:24,height:24}}>⇄</button><button style={{padding:4,width:24,height:24}}>⋮</button></div><ConfiguredDealCard item={{id:String(i),pipeline_id:'synthetic',title:'Contato Sintético | Tráfego Pago e Marketing com título longo',value:0,primary_contact:{id:String(i),name:'Contato Sintético',avatar_url}} as PipelineItem} configuration={{...config,density} as CardConfiguration} definitions={nativeFields}/></div>)}</section>)}</main></MemoryRouter>);
