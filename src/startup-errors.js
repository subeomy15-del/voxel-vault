export function startupFailure(error,stage='initialization'){
  const detail=String(error?.message||error||'Unknown error');
  if(/webgl.*(not supported|unsupported|context)|Error creating WebGL context/i.test(detail))return {title:'WebGL is unavailable',hint:'Enable hardware acceleration or try another browser, then reload.',stage,detail};
  if(/shader|compile|renderer/i.test(detail)||stage==='renderer')return {title:'The renderer could not start',hint:'Try reloading. If it continues, update your browser or graphics driver.',stage,detail};
  if(/worker/i.test(detail)||stage==='terrain worker')return {title:'Terrain could not load',hint:'Reload to restart the terrain worker. Check that the game’s worker files are available.',stage,detail};
  if(/fetch|404|module|network/i.test(detail))return {title:'A game file could not load',hint:'Check your connection, then reload the page.',stage,detail};
  if(stage==='save')return {title:'Your world could not be opened',hint:'Your stored data has been kept. Export a backup before starting a replacement world.',stage,detail};
  return {title:'Voxel Vault could not start',hint:'Reload the page. If it happens again, include the details below in your bug report.',stage,detail};
}
export function showStartupFailure(element,error,stage){
  const failure=startupFailure(error,stage);element.hidden=false;element.replaceChildren();
  for(const[tag,text]of[['strong',failure.title],['small',failure.hint],['small',`${failure.stage}: ${failure.detail}`]]){const child=document.createElement(tag);child.textContent=text;element.append(child);}
}
