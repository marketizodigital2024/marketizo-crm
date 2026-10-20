'use strict';
function employeeRoles(value) {
  const canonical = ['Social Media Manager','Scenarista','Editor','Lider editora','Snimatelj','Media Buyer','Founder / Strategija','Co-founder / Operativa'];
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
      const role = normalized === 'smm' ? 'Social Media Manager' : canonical.find(r=>r.toLowerCase()===normalized) || part;
      if (!result.some(r=>r.toLowerCase()===role.toLowerCase())) result.push(role);
    }
  }
  return result;
}
function employeeHasSmm(value) { return employeeRoles(value).includes('Social Media Manager'); }
module.exports = { employeeRoles, employeeHasSmm };
