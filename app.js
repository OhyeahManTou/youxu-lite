(() => {
 'use strict';
 const M=Youxu, $=id=>document.getElementById(id), E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const CACHE='youxu-lite.project.v1';
 let project=M.demo(),dirty=false,lastExport='',revision='',cacheDisabled=false,storageIssue='',badCache='',toastTimer,returnFocus=null;
 const ui={tab:'overview',query:'',collapsed:new Set(),start:M.addDays(M.today(),-5),days:14,filter:''};
 try{
   const raw=localStorage.getItem(CACHE);
   if(raw){try{const saved=JSON.parse(raw);project=M.validate(saved.project);dirty=saved.dirty===true;lastExport=typeof saved.lastExport==='string'?saved.lastExport:'';revision=typeof saved.revision==='string'?saved.revision:'';}catch{badCache=raw;cacheDisabled=true;storageIssue='浏览器暂存无法读取，原内容仍保留。请打开已保存的项目文件恢复。';}}
 }catch{cacheDisabled=true;storageIssue='当前浏览器不允许暂存。仍可使用，请及时保存项目文件，关闭页面后不会自动恢复。';}
 const notify=text=>{clearTimeout(toastTimer);$('toast').textContent=text;$('toast').classList.add('show');toastTimer=setTimeout(()=>$('toast').classList.remove('show'),3800);};
 const req=id=>project.requirements.find(r=>r.id===id), task=id=>project.tasks.find(t=>t.id===id);
 const ts=id=>M.tasksFor(project,id);
 const pill=s=>`<span class="pill ${s}">${M.status[s]}</span>`;
 const date=v=>v?E(v):'<span style="color:#97a39d">待排期</span>';
 const owner=name=>name?`<span class="owner"><span class="avatar" aria-hidden="true">${E([...name][0])}</span>${E(name)}</span>`:'<span style="color:#97a39d">待分配</span>';
 function persist(next, nextDirty, force=false){
   if(cacheDisabled)return;
   try{
     const raw=localStorage.getItem(CACHE);let current=null;
     if(raw){try{current=JSON.parse(raw);}catch{throw new Error('缓存内容在其他窗口发生变化，请先保存项目文件再刷新。');}}
     if(!force && current?.revision && current.revision!==revision){const err=new Error('另一个页面已更新此项目。请先保存当前副本，再刷新或打开最新项目，避免覆盖。');err.conflict=true;throw err;}
     const stamp=M.uid();localStorage.setItem(CACHE,JSON.stringify({project:next,dirty:nextDirty,lastExport,revision:stamp}));revision=stamp;
   }catch(e){if(e.conflict)throw e;cacheDisabled=true;storageIssue='浏览器暂存失败，当前修改仍在页面中。请保存项目文件后再关闭。';}
 }
 function apply(next,message){
   next=M.validate(next);persist(next,true);project=next;dirty=true;render();if(message)notify(message);
 }
 function updateStateLabel(){
   $('save-state').textContent=dirty?(cacheDisabled?'有未保存修改 · 暂存不可用':'有未保存修改 · 已在浏览器暂存'):(lastExport?'项目文件已生成 · '+lastExport:'示例/当前项目尚未保存为文件');
   $('storage-warning').hidden=!storageIssue;
   $('storage-warning').innerHTML=storageIssue?`<span>${E(storageIssue)}</span>${badCache?'<button class="text-btn" data-action="recover-cache">下载原始暂存</button>':''}`:'';
   $('sample-notice').hidden=!project.sample||ui.dismissSample;
   document.title='有序 · 轻量排期';
 }
 const matching=r=>!ui.query || [r.title,r.owner,r.note,r.content,...ts(r.id).flatMap(t=>[t.title,t.owner,t.note])].join('\n').toLowerCase().includes(ui.query.toLowerCase());
 function emptyView(){return `<div class="empty-state"><span class="empty-mark" aria-hidden="true">▤</span><h2>从一个需求开始</h2><p>写下需求，再拆成任务，排期会自动生成。</p><button class="btn primary" data-action="new-requirement">＋ 新增需求</button></div>`;}
 function overview(rows){
  return `<div class="table-wrap"><table class="data-table"><colgroup><col style="width:25%"><col style="width:12%"><col style="width:12%"><col style="width:12%"><col style="width:23%"><col style="width:16%"></colgroup><thead><tr><th>需求名字</th><th>负责人</th><th>预计开始</th><th>预计结束</th><th>需求内容</th><th>操作</th></tr></thead><tbody>${rows.map(r=>{const tasks=ts(r.id),done=M.completed(project,r.id),chars=[...r.content.replace(/\s+/g,' ').trim()],preview=chars.slice(0,60).join('')+(chars.length>60?'...':'');return `<tr class="${done?'complete':''}" data-requirement-row="${E(r.id)}"><td><button class="title-btn" data-action="detail" data-id="${E(r.id)}">${E(r.title)}</button><small>${done?'✓ 已完成':tasks.length?`${tasks.filter(t=>t.status==='done').length} / ${tasks.length} 项任务完成`:'待拆分'} · ${r.content?'点击查看需求内容':'点击补充需求内容'}</small></td><td>${owner(r.owner)}</td><td class="date-text">${date(r.start)}</td><td class="date-text">${date(r.end)}</td><td><button class="content-preview" data-action="detail" data-id="${E(r.id)}" aria-label="查看 ${E(r.title)} 的需求内容">${E(preview)||'点击填写需求内容'}</button></td><td><div class="row-actions"><button data-action="go-tasks" data-id="${E(r.id)}">${done?'查看任务':'拆分任务'}</button><button data-action="edit-requirement" data-id="${E(r.id)}">编辑</button></div></td></tr>`;}).join('')}</tbody></table></div>`;
 }
 function breakdown(rows){
   return `<div class="gantt-toolbar"><span class="form-help">新增需求会自动出现在这里。点击状态可快速修改；延期任务整行标红。</span><select class="compact-filter" id="task-filter" aria-label="筛选任务状态"><option value="">全部状态</option>${Object.entries(M.status).map(([k,v])=>`<option value="${k}" ${ui.filter===k?'selected':''}>${v}</option>`).join('')}</select></div>`+rows.map(r=>{
    const all=ts(r.id), list=all.filter(t=>!ui.filter||t.status===ui.filter);
    return `<section class="group" data-requirement-group="${E(r.id)}"><div class="group-head ${M.completed(project,r.id)?'complete':''}"><div class="group-title"><h2>${E(r.title)}</h2><span class="count">${all.length} 项任务</span>${M.completed(project,r.id)?pill('done'):''}</div><button class="btn small" data-action="new-task" data-id="${E(r.id)}">＋ 拆分任务</button></div>${list.length?`<div class="table-wrap" style="border:0;border-radius:0"><table class="data-table"><colgroup><col style="width:23%"><col style="width:7%"><col style="width:11%"><col style="width:11%"><col style="width:11%"><col style="width:9%"><col style="width:22%"><col style="width:6%"></colgroup><thead><tr><th>任务拆分</th><th>优先级</th><th>处理人</th><th>预计开始</th><th>预计结束</th><th>状态</th><th>备注</th><th>操作</th></tr></thead><tbody>${list.map(t=>`<tr class="${t.status==='delayed'?'delayed':''}" data-task-row="${E(t.id)}"><td><button class="title-btn" data-action="edit-task" data-id="${E(t.id)}">${E(t.title)}</button></td><td><span class="priority ${t.priority==='高'?'high':''}">${E(t.priority)}</span></td><td>${owner(t.owner)}</td><td class="date-text">${date(t.start)}</td><td class="date-text">${date(t.end)}</td><td><button class="pill ${t.status}" data-action="status" data-id="${E(t.id)}" aria-label="修改 ${E(t.title)} 的状态">${M.status[t.status]}</button></td><td><span class="note" title="${E(t.note)}">${E(t.note)||'—'}</span></td><td><div class="row-actions"><button data-action="edit-task" data-id="${E(t.id)}">编辑</button></div></td></tr>`).join('')}</tbody></table></div>`:`<div class="empty-group">${all.length?'当前状态筛选下没有任务。':'还没有拆分任务。'}${!all.length?'<span>先把它拆成具体的工作，再安排处理人和日期。</span>':''}</div>`}</section>`;
   }).join('');
 }
 function schedule(rows){
   const days=Array.from({length:ui.days},(_,i)=>M.addDays(ui.start,i)), end=days.at(-1),todayIndex=M.diffDays(M.today(),ui.start);
   const line=todayIndex>=0&&todayIndex<ui.days?`<span class="today-line" style="left:calc(${todayIndex} * var(--day))"></span>`:'';
   const headings=days.map(d=>{const w=new Date(d+'T00:00:00Z').getUTCDay();return `<div class="day ${[0,6].includes(w)?'weekend':''} ${d===M.today()?'today':''}"><span>${d.slice(5)}</span><small>周${'日一二三四五六'[w]}</small></div>`;}).join('');
   return `<div class="gantt-toolbar"><div class="range-controls"><button class="btn small" data-action="prev-range" aria-label="上一时间段">←</button><button class="btn small" data-action="next-range" aria-label="下一时间段">→</button><button class="btn small" data-action="today-range">今天</button><label>从 <input id="range-start" type="date" value="${ui.start}" min="2000-01-01" max="2100-10-31" aria-label="排期开始日期"></label><select id="range-days" aria-label="排期时间跨度">${[14,28,56].map(n=>`<option value="${n}" ${ui.days===n?'selected':''}>${n===14?'两周':n===28?'四周':'八周'}</option>`).join('')}</select><span class="date-text">至 ${end}</span></div><div class="legend">${Object.entries(M.status).map(([k,v])=>`<span><i class="${k}"></i>${v}</span>`).join('')}</div></div><div class="gantt-shell"><div class="gantt-scroll"><div class="gantt" style="--days:${ui.days}"><div class="gantt-row gantt-header"><div class="gantt-label">需求 / 任务</div><div class="gantt-days">${headings}</div></div>${rows.map(r=>{
    const list=ts(r.id),folded=ui.collapsed.has(r.id);
    const group=`<div class="gantt-row gantt-group"><div class="gantt-label"><button class="fold" data-action="fold" data-id="${E(r.id)}" aria-label="${folded?'展开':'收起'} ${E(r.title)}" aria-expanded="${!folded}">${folded?'▸':'▾'}</button><div><strong title="${E(r.title)}">${E(r.title)}</strong><small>${list.length} 项任务${M.completed(project,r.id)?' · 已完成':''}</small></div></div><div class="group-track"></div></div>`;
    if(folded)return group;
    if(!list.length)return group+`<div class="gantt-row"><div class="gantt-label"><button data-action="new-task" data-id="${E(r.id)}"><strong>＋ 拆分第一个任务</strong><small>待拆分</small></button></div><div class="track"><span class="track-note">拆分后，任务排期会自动出现在这里。</span></div></div>`;
    return group+list.map(t=>{
      const a=t.start?Math.max(0,M.diffDays(t.start,ui.start)):0,b=t.end?Math.min(ui.days-1,M.diffDays(t.end,ui.start)):-1,visible=t.start&&t.end>=ui.start&&t.start<=end;
      const note=!t.start?'日期待排期，点击左侧任务补充。':'任务在当前日期范围外。';
      return `<div class="gantt-row ${t.status==='delayed'?'is-delayed':''}" data-gantt-task="${E(t.id)}"><div class="gantt-label"><button data-action="edit-task" data-id="${E(t.id)}"><strong title="${E(t.title)}">${E(t.title)}</strong><small>${E(t.owner)||'待分配'} · ${M.status[t.status]}</small></button></div><div class="track">${line}${visible?`<button class="gantt-bar ${t.status}" data-action="status" data-id="${E(t.id)}" style="left:calc(${a} * var(--day) + 3px);width:calc(${b-a+1} * var(--day) - 6px)" title="${E(t.title)} · ${E(t.owner)||'待分配'} · ${t.start} 至 ${t.end} · ${M.status[t.status]}" aria-label="修改 ${E(t.title)} 的状态">${t.start<ui.start?'‹ ':''}${E(t.owner)||M.status[t.status]}${t.end>end?' ›':''}</button>`:`<span class="track-note">${note}</span>`}</div></div>`;
    }).join('');
   }).join('')}</div></div><div class="gantt-hint"><strong>点击条形修改状态</strong> · 点击左侧任务编辑日期和内容 · 日期不会自动改变状态 · 拆分任务全部完成后，需求自动完成。</div></div>`;
 }
 function render(){
   const previous=document.querySelector('.gantt-scroll'),scroll=previous?{x:previous.scrollLeft,y:previous.scrollTop}:null;
   updateStateLabel();
   const page={overview:['需求总览','写清需求与交付时间，点击需求名字查看完整内容。'],tasks:['需求拆分','一项任务，一个处理人，一段明确的交付时间。'],schedule:['需求排期','按需求查看任务安排，点击条形直接更新状态。']}[ui.tab];
   [$('page-title'),$('page-description')].forEach((el,i)=>el.textContent=page[i]);
   document.querySelectorAll('[data-tab]').forEach(el=>{el.toggleAttribute('aria-current',el.dataset.tab===ui.tab);if(el.dataset.tab===ui.tab)el.setAttribute('aria-current','page');});
   const done=project.requirements.filter(r=>M.completed(project,r.id)).length;
   $('summary').innerHTML=`<span><strong>${project.requirements.length}</strong>需求</span><span><strong>${project.tasks.length}</strong>任务</span><span><i class="dot done"></i><strong>${done}</strong>需求完成</span><span><i class="dot delayed"></i><strong>${project.tasks.filter(t=>t.status==='delayed').length}</strong>任务延期</span>`;
   const active=M.ordered(project).filter(r=>ui.tab==='overview'||!M.completed(project,r.id));
   const rows=active.filter(matching);
   $('content').innerHTML=!project.requirements.length?emptyView():!active.length?'<div class="empty-state"><h2>当前需求均已完成</h2><p>已完成需求保留在总览底部，可在那里查看任务或重新打开。</p><button class="btn" data-action="go-overview">返回需求总览</button></div>':!rows.length?'<div class="empty-state"><h2>没有找到匹配的内容</h2><p>试试需求名字、任务名字或处理人。</p><button class="btn" data-action="clear-search">清空搜索</button></div>':ui.tab==='overview'?overview(rows):ui.tab==='tasks'?breakdown(rows):schedule(rows);
   const next=document.querySelector('.gantt-scroll');if(next&&scroll){next.scrollLeft=scroll.x;next.scrollTop=scroll.y;}
 }
 function showDialog(html){returnFocus=document.activeElement;$('editor').innerHTML=html;if(!$('editor').open)$('editor').showModal();}
 function head(title,desc=''){return `<div class="dialog-head"><div><h2 id="dialog-title">${E(title)}</h2>${desc?`<p>${E(desc)}</p>`:''}</div><button type="button" class="close" data-action="close-dialog" aria-label="关闭弹窗">×</button></div>`;}
 const field=(name,label,v='',type='text',attrs='')=>`<div class="field"><label for="f-${name}">${label}</label><input id="f-${name}" name="${name}" type="${type}" value="${E(v)}" ${attrs}></div>`;
 const textField=(name,label,v='',extra='')=>`<div class="field"><label for="f-${name}">${label}</label><textarea id="f-${name}" name="${name}" ${extra}>${E(v)}</textarea></div>`;
 const owners=()=>`<datalist id="owners">${[...new Set([...project.requirements,...project.tasks].map(x=>x.owner).filter(Boolean))].map(x=>`<option value="${E(x)}">`).join('')}</datalist>`;
 const dates=r=>`<div class="field-row">${field('start','预计开始',r.start,'date','min="2000-01-01" max="2100-12-31"')}${field('end','预计结束',r.end,'date','min="2000-01-01" max="2100-12-31"')}</div>`;
 function editRequirement(id=''){
   const r=id?req(id):{title:'',owner:'',start:'',end:'',note:'',content:''};if(!r)return;
   showDialog(`${head(id?'编辑需求':'新增需求')}<form class="requirement-form" data-form="requirement" data-id="${E(id)}"><div class="dialog-body"><div class="field-row">${field('title','需求名字 *',r.title,'text','required maxlength="160" autofocus')}${field('owner','负责人',r.owner,'text','maxlength="80" list="owners"')}</div>${owners()}${dates(r)}${textField('content','需求内容',r.content,'maxlength="30000" class="content-input" placeholder="写下背景、规则、范围和需要确认的事项…"')}<p class="form-error" role="alert"></p></div><div class="dialog-actions"><div>${id?`<button type="button" class="btn danger" data-action="delete-requirement" data-id="${E(id)}">删除需求</button>`:''}</div><div><button type="button" class="btn" data-action="close-dialog">取消</button><button class="btn primary" type="submit">保存需求</button></div></div></form>`);
 }
 function detail(id){
   const r=req(id);if(!r)return;
   showDialog(`${head(r.title,'需求内容')}<div class="dialog-body"><div class="detail-meta"><span>负责人：${E(r.owner)||'待分配'}</span><span>${r.start?`${r.start} 至 ${r.end}`:'日期待排期'}</span>${M.completed(project,id)?pill('done'):''}</div><div class="detail-body">${E(r.content)||'还没有填写需求内容。点击下方“编辑需求”补充。'}</div>${r.note?`<div class="detail-note">备注：${E(r.note)}</div>`:''}</div><div class="dialog-actions"><button class="btn" data-action="go-tasks" data-id="${E(id)}">${M.completed(project,id)?'查看任务':'拆分任务'}</button><button class="btn primary" data-action="edit-requirement" data-id="${E(id)}">编辑需求</button></div>`);
 }
 function completedTasks(id){
   const r=req(id);if(!r)return;
   showDialog(`${head(r.title,'已完成任务')}<div class="dialog-body completed-tasks">${ts(id).map(t=>`<div class="completed-task"><div><strong>${E(t.title)}</strong><small>${E(t.owner)||'待分配'} · ${t.start?`${t.start} 至 ${t.end}`:'日期待排期'}</small></div><button class="btn small" data-action="edit-task" data-id="${E(t.id)}">查看 / 编辑</button></div>`).join('')}</div><div class="dialog-actions"><button class="btn" data-action="new-task" data-id="${E(id)}">＋ 拆分任务</button><button class="btn primary" data-action="close-dialog">关闭</button></div>`);
 }

 function editTask(id='',parent=''){
   const t=id?task(id):{requirementId:parent,title:'',priority:'中',owner:'',start:'',end:'',status:'doing',note:''};if(!t||!req(t.requirementId))return;
   showDialog(`${head(id?'编辑任务':'拆分任务',req(t.requirementId).title)}<form data-form="task" data-id="${E(id)}" data-parent="${E(t.requirementId)}"><div class="dialog-body">${field('title','任务拆分 *',t.title,'text','required maxlength="160" autofocus')}<div class="field-row"><div class="field"><label for="f-priority">优先级</label><select id="f-priority" name="priority">${['高','中','低'].map(p=>`<option ${t.priority===p?'selected':''}>${p}</option>`).join('')}</select></div>${field('owner','处理人',t.owner,'text','maxlength="80" list="owners"')}</div>${owners()}${dates(t)}<div class="field"><label for="f-status">状态</label><select id="f-status" name="status">${Object.entries(M.status).map(([k,v])=>`<option value="${k}" ${t.status===k?'selected':''}>${v}</option>`).join('')}</select></div>${textField('note','备注',t.note,'maxlength="3000" rows="3"')}<p class="form-help">状态手动设置。已延期任务整行标红；开始、结束都留空时仍保留任务。</p><p class="form-error" role="alert"></p></div><div class="dialog-actions"><div>${id?`<button type="button" class="btn danger" data-action="delete-task" data-id="${E(id)}">删除任务</button>`:''}</div><div><button type="button" class="btn" data-action="close-dialog">取消</button><button class="btn primary" type="submit">保存任务</button></div></div></form>`);
 }
 function editStatus(id){
   const t=task(id);if(!t)return;
   showDialog(`${head('更新任务状态',t.title)}<form data-form="status" data-id="${E(id)}"><div class="dialog-body"><div class="detail-meta"><span>${E(req(t.requirementId).title)}</span><span>${E(t.owner)||'待分配'}</span><span>${t.start?`${t.start} 至 ${t.end}`:'日期待排期'}</span></div><div class="status-options">${Object.entries(M.status).map(([k,v])=>`<label class="status-choice ${k}"><input type="radio" name="status" value="${k}" ${t.status===k?'checked':''}>${v}</label>`).join('')}</div>${textField('note','备注',t.note,'maxlength="3000" rows="3"')}<p class="form-help">全部任务完成后，需求仅保留在总览底部，拆分和排期中自动隐藏。</p><p class="form-error" role="alert"></p></div><div class="dialog-actions"><button type="button" class="text-btn" data-action="edit-task" data-id="${E(id)}">编辑任务与日期</button><button type="submit" class="btn primary">更新状态</button></div></form>`);
 }
 function closeDialog(){$('editor').close();if(returnFocus?.isConnected)returnFocus.focus();}
 function confirmAction(title,desc,button='确认'){
   return new Promise(resolve=>{
     const d=$('confirmation');d.innerHTML=`<div class="dialog-head"><h2 id="confirm-title">${E(title)}</h2></div><div class="dialog-body"><p>${E(desc)}</p></div><form method="dialog" class="dialog-actions"><button class="btn" value="cancel" autofocus>取消</button><button class="btn primary" value="yes">${E(button)}</button></form>`;
     d.returnValue='cancel';d.addEventListener('close',()=>resolve(d.returnValue==='yes'),{once:true});d.showModal();
   });
 }
 function download(text,name){const blob=new Blob([text],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
 function saveFile(){
   download(JSON.stringify(M.validate(project),null,2),project.name.replace(/[<>:"/\\|?*\x00-\x1f]/g,'_')+'_'+M.today()+'.json');
   dirty=false;lastExport=new Date().toLocaleTimeString('zh-CN',{hour:'2-digit',minute:'2-digit'});
   try{persist(project,false);}catch(e){storageIssue=e.message;}
   updateStateLabel();notify('项目文件已生成，请确认浏览器下载已完成。');
 }
 function replaceProject(next){
   project=M.validate(next);dirty=false;lastExport='';revision='';ui.query='';ui.collapsed.clear();ui.filter='';$('search').value='';ui.dismissSample=false;ui.tab='overview';
   const earliest=project.tasks.map(t=>t.start).filter(Boolean).sort()[0];ui.start=earliest&&earliest<='2100-10-31'?earliest:M.addDays(M.today(),-5);
   // 新建或打开文件是明确的替换操作；损坏暂存仍保留，供用户另行下载。
   persist(project,false,true);render();
 }
 async function dispatch(action,id){
   switch(action){
     case 'new-requirement':editRequirement();break;
     case 'edit-requirement':editRequirement(id);break;
     case 'detail':detail(id);break;
     case 'new-task':editTask('',id);break;
     case 'edit-task':editTask(id);break;
     case 'status':editStatus(id);break;
     case 'close-dialog':closeDialog();break;
     case 'go-overview':ui.tab='overview';ui.query='';$('search').value='';render();break;
     case 'go-tasks':if(M.completed(project,id)){completedTasks(id);break;}if($('editor').open)closeDialog();ui.tab='tasks';ui.query='';ui.filter='';$('search').value='';render();document.querySelector(`[data-requirement-group="${CSS.escape(id)}"]`)?.scrollIntoView({block:'start',behavior:'smooth'});break;
     case 'delete-requirement':if(await confirmAction('删除这个需求？',`同时删除它的 ${ts(id).length} 项拆分任务。建议先保存项目文件保留副本。`,'删除')){const next=structuredClone(project);next.requirements=next.requirements.filter(r=>r.id!==id);next.tasks=next.tasks.filter(t=>t.requirementId!==id);apply(next,'需求已删除');closeDialog();}break;
     case 'delete-task':if(await confirmAction('删除这个任务？','删除后会重新计算需求的完成状态。','删除')){const next=structuredClone(project);next.tasks=next.tasks.filter(t=>t.id!==id);apply(next,'任务已删除');closeDialog();}break;
     case 'fold':ui.collapsed.has(id)?ui.collapsed.delete(id):ui.collapsed.add(id);render();break;
     case 'clear-search':ui.query='';$('search').value='';render();break;
     case 'prev-range':case 'next-range':{const day=M.addDays(ui.start,action==='prev-range'?-ui.days:ui.days);if(day<'2000-01-01'||day>'2100-10-31'){notify('日期范围超出支持区间。');return;}ui.start=day;render();break;}
     case 'today-range':ui.start=M.addDays(M.today(),-2);render();break;
     case 'recover-cache':download(badCache,'有序_原始暂存恢复副本.json');break;
   }
 }
 document.addEventListener('click',e=>{const b=e.target.closest('[data-action]');if(b){e.preventDefault();dispatch(b.dataset.action,b.dataset.id).catch(err=>notify(err.message));}});
 $('editor').addEventListener('submit',e=>{
   e.preventDefault();const form=e.target,values=Object.fromEntries(new FormData(form));
   try{
     const next=structuredClone(project),id=form.dataset.id,type=form.dataset.form;
     if(type==='requirement'){
       const record={id:id||M.uid(),title:values.title.trim(),owner:values.owner.trim(),start:values.start,end:values.end,note:id?req(id).note:'',content:values.content.trim()};
       if(id)next.requirements[next.requirements.findIndex(x=>x.id===id)]=record;else next.requirements.push(record);
     }else if(type==='task'){
       const record={id:id||M.uid(),requirementId:form.dataset.parent,title:values.title.trim(),priority:values.priority,owner:values.owner.trim(),start:values.start,end:values.end,status:values.status,note:values.note.trim()};
       if(id)next.tasks[next.tasks.findIndex(x=>x.id===id)]=record;else next.tasks.push(record);
     }else if(type==='status'){const target=next.tasks.find(x=>x.id===id);target.status=values.status;target.note=values.note.trim();}
     apply(next,type==='status'?'状态已更新，需求完成情况已同步。':'已更新，记得保存项目文件。');closeDialog();
   }catch(err){form.querySelector('.form-error').textContent=err.message;}
 });
 document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{ui.tab=b.dataset.tab;render();}));
 document.querySelector('.brand').addEventListener('click',e=>{e.preventDefault();ui.tab='overview';render();});
 $('search').addEventListener('input',e=>{ui.query=e.target.value.trim();render();});
 $('content').addEventListener('change',e=>{
   if(e.target.id==='task-filter'){ui.filter=e.target.value;render();}
   if(e.target.id==='range-days'){ui.days=Number(e.target.value);render();}
   if(e.target.id==='range-start'){const value=e.target.value;if(!M.validDate(value)||value>'2100-10-31'){notify('请选择有效日期，最晚支持 2100-10-31。');e.target.value=ui.start;return;}ui.start=value;render();}
 });
 $('add-requirement').addEventListener('click',()=>editRequirement());
 $('save-project').addEventListener('click',saveFile);
 $('open-project').addEventListener('click',()=>$('file-input').click());
 $('new-project').addEventListener('click',async()=>{if((project.requirements.length||dirty)&&!await confirmAction('新建空白项目？',dirty?'当前修改还没有保存为项目文件。继续将替换页面内容；可以取消后先保存。':'当前项目会被替换，请确认已有项目文件副本。','新建'))return;replaceProject(M.empty());notify('空白项目已创建。');});
 $('file-input').addEventListener('change',async e=>{
   const file=e.target.files[0];e.target.value='';if(!file)return;
   try{
     if(file.size>5*1024*1024)throw Error('项目文件超过 5 MB，请检查是否选择正确。');
     let parsed;try{parsed=JSON.parse(await file.text());}catch{throw Error('文件不是有效的 JSON，当前项目未被替换。');}
     const next=M.validate(parsed);
     if((dirty||project.requirements.length)&&!await confirmAction('打开这个项目？',dirty?'当前有未保存修改。继续会替换页面内容，请先确认已保存所需副本。':`将打开“${next.name}”，替换当前页面项目。`,'打开'))return;
     replaceProject(next);notify('项目已打开。');
   }catch(err){notify(err.message);}
 });
 $('dismiss-sample').addEventListener('click',()=>{ui.dismissSample=true;updateStateLabel();});
 window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
 window.addEventListener('storage',e=>{if(e.key===CACHE&&e.newValue){storageIssue='另一个页面更新了浏览器暂存。当前页面不会自动覆盖它；请保存所需副本后刷新。';updateStateLabel();}});
 render();
})();
