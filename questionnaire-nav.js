// Additive navigation only: never submit, reset, or replace employee forms.
(() => {
function employeeRoles(value) {
  const canonical = ['Editor','Lider editora','Scenario','Scenario Leader','Snimatelj','Snimatelj Leader','Social Media Manager','Social Media Manager Leader','Founder','Co Founder','Direktor'];
  const input = Array.isArray(value) ? value : [value];
  const result = [];
  for (const item of input) {
    if (typeof item !== 'string') continue;
    let text = item;
    const protectedTitles = [];
    for (const title of ['Founder / Strategija','Co-founder / Operativa']) {
      const pattern = new RegExp(title.replace(/\//g, '\\s*\\/\\s*'), 'gi');
      text = text.replace(pattern, match => { protectedTitles.push(match); return '\u0001'+(protectedTitles.length-1)+'\u0001'; });
    }
    for (let part of text.split(/\s*[/,;|\n]\s*/)) {
      part = part.replace(/\u0001(\d+)\u0001/g, (_,i) => protectedTitles[Number(i)]).trim();
      if (!part) continue;
      const normalized = part.toLowerCase().replace(/\s+/g,' ');
      const aliases = {'smm':'Social Media Manager','smm leader':'Social Media Manager Leader','scenarista':'Scenario','founder / strategija':'Founder','co-founder / operativa':'Co Founder','co founer':'Co Founder'};
      const role = aliases[normalized] || canonical.find(r=>r.toLowerCase()===normalized) || part;
      if (!result.some(r=>r.toLowerCase()===role.toLowerCase())) result.push(role);
    }
  }
  return result;
}
function employeeHasSmm(value) { return employeeRoles(value).some(role => ['Social Media Manager','Social Media Manager Leader','Scenario','Scenario Leader'].includes(role)); }

  function sync() {
    const app = document.getElementById('employeeApp');
    const nav = app?.querySelector('nav.nav');
    if (!nav) return;
    const position = String(document.getElementById('employeePortalPosition')?.textContent || '').trim();
    const employee = typeof activeEmployee !== 'undefined' ? activeEmployee : null;
    const allowed = !!employee && (employeeHasSmm(employee.position || position) || ['emp-miljan','emp-ivana'].includes(employee.id));
    let link = document.getElementById('questionnairesNav');
    if (!link && allowed) {
      link = document.createElement('a');
      link.id = 'questionnairesNav'; link.className = 'nav-item';
      link.href = '/questionnaires.html'; link.target = '_blank'; link.rel = 'noopener';
      link.textContent = 'Upitnici ↗'; link.title = 'Otvori upitnike u posebnom tabu';
      link.style.cssText = 'display:flex;align-items:center;text-decoration:none';
      nav.append(link);
    }
    if (link) link.hidden = !allowed;
  }
  sync();
  const label = document.getElementById('employeePortalPosition');
  if (label) new MutationObserver(sync).observe(label,{childList:true,subtree:true,characterData:true});
  window.addEventListener('storage',sync);
})();
