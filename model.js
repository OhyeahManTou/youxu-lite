/* 日期算法沿用 xiangmu 的 UTC 自然日计算；轻量版不依赖其状态机或存储服务。 */
(() => {
  'use strict';
  const status = {doing:'进行中',done:'已完成',delayed:'已延期'};
  const today = () => new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Shanghai',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
  const addDays = (day,n) => new Date(Date.parse(day+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);
  const diffDays = (a,b) => Math.round((Date.parse(a+'T00:00:00Z')-Date.parse(b+'T00:00:00Z'))/86400000);
  const validDate = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && s>='2000-01-01' && s<='2100-12-31' && !Number.isNaN(Date.parse(s+'T00:00:00Z')) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const uid = () => globalThis.crypto.randomUUID();
  function validate(project) {
    const text = (x,max) => typeof x==='string' && x.length<=max;
    if(!project || project.version!==1 || !text(project.name,100) || !project.name.trim() || !Array.isArray(project.requirements) || !Array.isArray(project.tasks)) throw Error('无法识别项目文件。请选择本工具保存的 JSON 项目文件。');
    if(project.requirements.length>500 || project.tasks.length>3000) throw Error('此轻量版最多支持 500 条需求、3000 条任务。');
    const ids=new Set(), requirements=new Set();
    const dates=row=>{
      if(typeof row.start!=='string'||typeof row.end!=='string'||Boolean(row.start)!==Boolean(row.end)||(row.start&&(!validDate(row.start)||!validDate(row.end)||row.end<row.start))) throw Error('请同时填写有效的预计开始、预计结束，结束不能早于开始。也可以将两个日期都留空。');
    };
    const common=row=>{
      if(!row || !text(row.id,100) || !row.id || ids.has(row.id)) throw Error('记录编号缺失或重复，无法读取。');
      ids.add(row.id);
      if(!text(row.title,160)||!row.title.trim()||!text(row.owner,80)||!text(row.note,3000)) throw Error('名称、负责人或备注格式不正确。');
      dates(row);
    };
    for(const r of project.requirements){common(r);requirements.add(r.id);if(!text(r.content,30000)) throw Error('需求内容格式不正确或超过 30000 字。');}
    for(const t of project.tasks){common(t);if(!requirements.has(t.requirementId)||!Object.hasOwn(status,t.status)||!['高','中','低'].includes(t.priority)) throw Error('任务的所属需求、状态或优先级不正确。');}
    // 只保留本格式需要的字段，避免不可信导入携带额外行为或数据。
    const pick=(row,keys)=>Object.fromEntries(keys.map(k=>[k,row[k]]));
    return {version:1,name:project.name.trim(),sample:project.sample===true,requirements:project.requirements.map(r=>pick(r,['id','title','owner','start','end','note','content'])),tasks:project.tasks.map(t=>pick(t,['id','requirementId','title','priority','owner','start','end','status','note']))};
  }
  const tasksFor=(p,id)=>p.tasks.filter(t=>t.requirementId===id);
  const completed=(p,id)=>{const ts=tasksFor(p,id);return ts.length>0&&ts.every(t=>t.status==='done');};
  const ordered=p=>p.requirements.map((r,i)=>({r,i,done:completed(p,r.id)})).sort((a,b)=>Number(a.done)-Number(b.done)||a.i-b.i).map(x=>x.r);
  function empty(name='我的需求排期'){return {version:1,name,sample:false,requirements:[],tasks:[]};}
  function demo(){
    const day=today(), date=n=>addDays(day,n);
    return {version:1,name:'游戏版本排期 · 示例',sample:true,requirements:[
      {id:'r-sign',title:'限时签到与补签',owner:'策划A',start:date(-3),end:date(9),note:'先确认规则与配置，再交付开发和测试。',content:'【需求目标】\n完成一套限时签到活动，支持签到、补签和累计奖励。\n\n【活动规则 · 虚构示例】\n1. 活动持续七天，达到 10 级的角色可以参与。\n2. 当天签到获得当日金币奖励。\n3. 补签过去未完成的活动日，每次消耗 20 钻石。\n4. 累计完成七天后，可以手动领取累计奖励。\n\n【验收关注】\n重复操作不重复发奖；断线后可以查询结果；时间和配置使用同一套规则。'},
      {id:'r-notice',title:'活动公告与入口文案',owner:'发行A',start:date(2),end:date(7),note:'口头需求已整理，展示范围待确认。',content:'请补充活动公告文案及入口说明。\n\n待确认：展示人群、开始时间、入口位置。\n请需求方明确回复确认后，再拆分具体任务。'},
      {id:'r-report',title:'版本测试报告模板',owner:'QA-A',start:date(-5),end:date(-1),note:'已完成示例：所有拆分项完成后，需求自动沉底。',content:'统一版本测试报告的范围、执行结果、遗留风险和发布建议。此条仅用于演示完成状态。'}
    ],tasks:[
      {id:'t-config',requirementId:'r-sign',title:'规则梳理与奖励配置',priority:'高',owner:'策划A',start:date(-3),end:date(-1),status:'done',note:'已完成规则确认，配置已交付。'},
      {id:'t-ui',requirementId:'r-sign',title:'客户端交互与状态展示',priority:'高',owner:'客户端A',start:date(0),end:date(5),status:'doing',note:'覆盖未解锁、可领取和已领取状态。'},
      {id:'t-server',requirementId:'r-sign',title:'补签扣费与重复请求处理',priority:'高',owner:'服务端A',start:date(-1),end:date(4),status:'delayed',note:'接口约定尚未对齐，需要重新确认交付时间。'},
      {id:'t-test',requirementId:'r-sign',title:'主流程验证与回归',priority:'中',owner:'QA-A',start:date(6),end:date(9),status:'doing',note:'测试条件到齐后执行，包含异常恢复。'},
      {id:'t-report1',requirementId:'r-report',title:'整理报告结构与字段',priority:'中',owner:'QA-A',start:date(-5),end:date(-3),status:'done',note:'范围、结论、遗留风险分开记录。'},
      {id:'t-report2',requirementId:'r-report',title:'补充填写示例并评审',priority:'中',owner:'QA-A',start:date(-2),end:date(-1),status:'done',note:'示例评审完成。'}
    ]};
  }
  globalThis.Youxu={status,today,addDays,diffDays,validDate,uid,validate,tasksFor,completed,ordered,empty,demo};
})();
