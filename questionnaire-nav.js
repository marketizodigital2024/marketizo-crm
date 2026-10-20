// Additive navigation only: never submit, reset, or replace employee forms.
(() => {
  function sync() {
    const app = document.getElementById('employeeApp');
    const nav = app?.querySelector('nav.nav');
    if (!nav) return;
    const position = String(document.getElementById('employeePortalPosition')?.textContent || '').trim();
    const employee = typeof activeEmployee !== 'undefined' ? activeEmployee : null;
    const allowed = !!employee && (/^(smm|social media manager)$/i.test(position) || ['emp-miljan','emp-ivana'].includes(employee.id));
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
