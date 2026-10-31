(function(root){
  'use strict';
  const team = [
    ['overview','Pregled tima','/employees-overview'],
    ['profile','Lične karte zaposlenih','/employee-profile'],
    ['leave','Odmori i kalendar','/employees-absences'],
    ['meetings','1:1 sastanci','/employees-recognitions'],
    ['performance','Učinak i ciljevi','/employees-ratings'],
    ['activities','Aktivnosti','/employees-goals']
  ];
  const work = [
    ['history','Sati zaposlenih','/employees-hours#work/history'],
    ['absence','Dodaj odsustvo','/employees-hours#work/absence'],
    ['hours','Dodaj sate','/employees-hours#work/hours'],
    ['late','Dodaj kašnjenje','/employees-hours#work/late']
  ];
  const primary = [
    ['admin','Početna','/'],['clients','Klijenti','/#clients'],['employees','Tim','/employees-overview'],
    ['kpi','KPI i ocene klijenata','/kpi'],['sign','Marketizo Sign','/marketizo-sign'],
    ['codeks','Kodeks','/kodeks'],['analytics','Analitika','/work-analytics'],
    ['calendar','Kalendar','/#calendar'],['clientCosts','Trošak klijenata','/#client-costs'],['reports','Finansije','/#reports']
  ];
  function route(pathname,hash,search,activeView){
    const file=pathname.replace(/\/+$/,'').split('/').pop().replace(/\.html$/,'');
    const files={'employees-overview':'overview','employee-profile':'profile','employees-absences':'leave','employees-recognitions':'meetings','employees-ratings':'performance','employees-goals':'activities','employees-settings':'settings'};
    if(file==='work-analytics')return{primary:'analytics'};
    if(file==='kodeks')return{primary:'codeks'};
    if(file==='marketizo-sign')return{primary:'sign',sign:new URLSearchParams(search).get('onboarding')==='1'?'onboarding':'documents'};
    if(file==='kpi')return{primary:'kpi'};
    if(hash==='#client-costs'||activeView==='clientCosts')return{primary:'clientCosts'};
    if(file==='employees-hours')return{primary:'employees',work:hash.startsWith('#work/')?hash.split('/')[1]:'hours'};
    if(files[file])return{primary:'employees',team:files[file]};
    const view=activeView||hash.replace(/^#/,'').split('/')[0]||'admin';
    return{primary:view,team:view==='employees'?(hash.split('/')[1]||'overview'):''};
  }
  const api={team,work,primary,route,setup};
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(typeof document==='undefined')return;
  function setup(){
    const sidebar=document.querySelector('.app-shell > .sidebar'),nav=sidebar?.querySelector('.nav');
    if(!nav||nav.dataset.sharedNavigation==='1')return;
    nav.dataset.sharedNavigation='1';
    const routed=!!nav.querySelector('button[data-view="employees"]');
    const original=[...nav.children];
    const element=(tag,text,className)=>{const el=document.createElement(tag);el.className=className;if(text)el.textContent=text;return el;};
    const childGroup=(rows,className,label,attribute)=>{
      const group=element('nav','',className);group.setAttribute('aria-label',label);
      group.append(element('span',label,className==='team-navigation'?'sidebar-section-label':'work-entry-navigation-title'));
      for(const[key,title,href]of rows){const a=element('a',title,className==='team-navigation'?'team-navigation-link':'work-entry-navigation-link');a.href=href;a.dataset[attribute]=key;group.append(a);}return group;
    };
    const teamGroup=childGroup(team,'team-navigation','Upravljanje timom','teamSection');
    const workGroup=childGroup(work,'work-entry-navigation','Unosi rada','workEntryLink');
    const nodes=[];
    for(const[key,title,href]of primary){
      let item;
      if(key==='sign'){
        item=original.find(el=>el.classList.contains('sign-nav-menu'))||element('details','','sign-nav-menu');
        item.replaceChildren();
        const summary=element('summary',title,'nav-item');summary.dataset.navKey=key;
        const children=element('div','','sign-nav-children');
        for(const[id,label,target]of [['documents','Ugovori i potpisi','/marketizo-sign'],['onboarding','Pravila saradnje · onboarding','/marketizo-sign?onboarding=1']]){const a=element('a',label,'nav-item');a.href=target;a.dataset.signSection=id;children.append(a);}
        item.append(summary,children);
        try{const saved=sessionStorage.getItem('marketizoSignMenuOpen');item.open=saved===null?route(location.pathname,location.hash,location.search).primary==='sign':saved==='1';}catch{item.open=route(location.pathname,location.hash,location.search).primary==='sign';}
        item.addEventListener('toggle',()=>{try{sessionStorage.setItem('marketizoSignMenuOpen',item.open?'1':'0');}catch{}});
      }else{
        item=routed?original.find(el=>el.matches(`button[data-view="${key}"]`)):null;
        if(!item)item=element(routed&&key==='clientCosts'?'button':'a',title,'nav-item');
        item.textContent=title;item.classList.add('nav-item');item.dataset.navKey=key;
        if(item.tagName==='A')item.href=href;else item.type='button';
        if(key==='clientCosts')item.classList.add('client-cost-nav');
        if(key==='analytics')item.classList.add('analytics-nav');
      }
      nodes.push(item);
      if(key==='employees')nodes.push(teamGroup,workGroup);
    }
    nav.replaceChildren(...nodes);
    const sync=()=>{
      const current=route(location.pathname,location.hash,location.search,routed?document.body.dataset.activeView:'');
      let operational=false;try{operational=typeof getAdminSession==='function'&&getAdminSession()?.role==='operational-admin';}catch{}
      nav.querySelectorAll('[data-nav-key]').forEach(el=>{const active=el.dataset.navKey===current.primary;el.classList.toggle('active',active);el.removeAttribute('aria-current');if(active&&!['employees','sign'].includes(current.primary))el.setAttribute('aria-current','page');if(['admin','reports','clientCosts'].includes(el.dataset.navKey))el.hidden=operational;});
      nav.querySelectorAll('[data-team-section],[data-work-entry-link],[data-sign-section]').forEach(el=>{
        const active=!!(el.dataset.teamSection&&el.dataset.teamSection===current.team||el.dataset.workEntryLink&&el.dataset.workEntryLink===current.work||el.dataset.signSection&&el.dataset.signSection===current.sign);
        el.classList.toggle('active',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');
      });
      nav.dataset.currentCategory=current.primary;
    };
    window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);window.addEventListener('load',sync);
    new MutationObserver(sync).observe(document.body,{attributes:true,attributeFilter:['data-active-view']});
    sync();
  }
  root.MarketizoNavigation=api;
  setup();
})(typeof window==='undefined'?globalThis:window);
