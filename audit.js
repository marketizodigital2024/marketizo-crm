
(function(){
 const locked=document.querySelector("#preview .locked");
 if(locked){
  const stavke=[
   "Zašto profil trenutno ne prodaje",
   "Šta tačno treba da promeniš, redom",
   "5 prioriteta sa objašnjenjem zašto baš ti",
   "12 ideja za Reelove, napisanih za tvoj profil",
   "12 ideja za storije za narednih 30 dana",
   "1 objava i 1 karusel, sa gotovim tekstom",
   "Konkretne prepravke tvojih postojećih objava",
   "Ocena po svakoj oblasti i šta je diže"
  ];
  locked.innerHTML=stavke.map(function(t){return "<article>🔒 <strong>"+t+"</strong></article>";}).join("");
  const jos=document.createElement("p");
  jos.className="locked-more";
  jos.textContent="Sve ovo je već napisano za tvoj profil i čeka otključavanje.";
  locked.after(jos);
  const st=document.createElement("style");
  st.textContent=".locked-more{margin:14px 0 0;text-align:center;font-size:14px;color:#9a9a9a}";
  document.head.appendChild(st);
 }
 const ponuda=document.querySelector("#preview .checkout span");
 if(ponuda)ponuda.textContent="Otključaj celu analizu: nalaze, prioritete i 26 gotovih ideja za Reelove, storije i objave.";
 const dugme=document.querySelector("#checkoutButton");
 if(dugme)dugme.textContent="Otključaj celu analizu za 1 € →";
})();

(function(){
 // Sekcija analize je bila ogranicena na 600px sa velikom marginom, pa je desni tekst bio isecen.
 const css=".analyzing{max-width:1180px;margin:40px auto}"+
  ".scan-layout{align-items:start;max-width:920px}"+
  ".scan-layout>*{min-width:0}"+
  ".scan-copy h2{overflow-wrap:anywhere}"+
  "@media(max-width:760px){.analyzing{margin:20px auto}.scan-layout,.profile-phone,.real-feed{max-width:100%;overflow-x:hidden}}";
 const style=document.createElement("style");
 style.textContent=css;
 document.head.appendChild(style);
})();

(function(){
 // Stranica poziva audit.css sa starom oznakom verzije, pa browser vuce kes. Trazimo svezu verziju.
 const CSS_VERSION="22";
 const link=document.querySelector('link[href*="audit.css"]');
 if(link&&link.getAttribute("href").indexOf("v="+CSS_VERSION)===-1){
  link.setAttribute("href","audit.css?v="+CSS_VERSION);
 }
})();

(function(){
 if(typeof renderPreviewFromAudit!=="function")return;
 const base=renderPreviewFromAudit;
 renderPreviewFromAudit=function(audit,evidence){
  base(audit,evidence);
  const head=document.querySelector("#preview .preview-top h2");
  if(!head||!audit)return;
  let text=audit.headline?String(audit.headline).trim():"";
  if(!text&&audit.mainConclusion){
   const sentences=String(audit.mainConclusion).match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[];
   text=sentences.slice(0,2).join(" ").trim();
  }
  if(!text)return;
  if(typeof clientText==="function")text=clientText(text,evidence||[]);
  const parts=(text.match(/[^.!?]+[.!?]*/g)||[text]).map(part=>part.trim()).filter(Boolean);
  head.textContent=parts[0]+(parts.length>1?" ":"");
  if(parts.length>1){
   const em=document.createElement("em");
   em.textContent=parts.slice(1).join(" ");
   head.appendChild(em);
  }
 };
})();

(function(){
 const style=document.createElement("style");
 style.textContent=".feed-unavailable small{display:none}.feed-unavailable.has-hint small{display:block;margin-top:8px}";
 document.head.appendChild(style);
 const findings=document.querySelector("#preview .findings");
 if(findings&&findings.querySelectorAll("article").length===4){
  findings.insertAdjacentHTML("beforeend",'<article><span>\u25C6</span><div><small>PORUKA I JASNO\u0106A PONUDE</small><strong id="previewMessage">Proveravamo \u0161ta profil zapravo komunicira</strong><p>Ponuda mora da bude jasna u prve tri sekunde.</p></div></article><article><span>\u25CE</span><div><small>LICE BRENDA</small><strong id="previewFace">Proveravamo da li se vidi osoba iza brenda</strong><p>Ljudi biraju osobu kojoj veruju, pa tek onda uslugu.</p></div></article>');
 }
 const kicker=document.querySelector(".analysis-kicker");
 if(kicker&&!document.querySelector(".scan-eta")){
  const eta=document.createElement("p");
  eta.className="scan-eta";
  eta.textContent="Detaljna analiza obično traje dva do tri minuta. Ostani na stranici \u2014 pregledamo objave, Reelove i biografiju jednu po jednu.";
  kicker.after(eta);
 }
})();
const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);let step=1;
const trackMeta=(event,params={},custom=false)=>{try{if(typeof window.fbq==="function")window.fbq(custom?"trackCustom":"track",event,params)}catch(error){console.warn("Meta event nije poslat.",error)}};
$(".dash-head p").textContent="U nastavku vidiš glavne nalaze, prioritete i konkretne preporuke za svoj brend.";
$(".evidence-section .eyebrow").textContent="Obuhvat analize";
$(".evidence-section h3").textContent="Na čemu se zasnivaju zaključci";
const show=id=>{["landing","wizard","analyzing","preview","dashboard"].forEach(x=>$("#"+x).classList.add("hidden"));$("#"+id).classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})};
function setStep(n){step=n;$$(".step").forEach(x=>x.classList.toggle("active",+x.dataset.step===n));$("#stepText").textContent=`Korak ${n} od 4`;$("#progressBar").style.width=`${n*25}%`}
const saved=()=>JSON.parse(localStorage.getItem("marketizoAudit")||"{}");
const paidForCurrentAudit=()=>{const audit=saved();return Boolean(audit.auditId)&&localStorage.getItem("marketizoPaidAuditId")===audit.auditId};
const normalizeScore=value=>{const raw=Number(value);const scaled=raw>0&&raw<=10?raw*10:raw;return Math.max(30,Math.min(95,Math.round(scaled||50)))};
const beauty=d=>/beauty|salon|kozmet|estet|laser|lice|kož|nokt|frizer|šmink|obrve|trepavic/i.test(`${d.business||""} ${d.offer||""}`);
function analysis(d){
 const biz=d.business||"tvoj biznis",offer=d.offer||"glavnu ponudu",aud=d.audience||"idealne klijente",city=d.location||"tvom tržištu",result=d.result||"jasan rezultat",price=d.price||"unetu cenu",path=d.purchasePath||"sledeći korak";
 if(beauty(d))return{
  summary:`Za ${biz.toLowerCase()} na tržištu ${city}, lep profil nije dovoljan. Klijent mora da vidi osobu kojoj će verovati, realne rezultate i da razume zašto je ${offer.toLowerCase()} pravi izbor baš za nju. Ponuda je u rasponu „${price}“, zato sadržaj mora da izgradi dovoljno poverenja pre koraka: ${path.toLowerCase()}.`,
  strength:"Vizuelno već ostavljaš uredan i profesionalan utisak",
  issue:"Profil pokazuje uslugu, ali još ne gradi dovoljno poverenja u osobu iza nje",
  reason:"Kod beauty usluga ljudi ne kupuju samo tretman. Kupuju sigurnost, stručnost i osećaj da će biti u dobrim rukama.",
  scores:[["Prvi utisak",72,"Profil izgleda uredno, ali nije odmah jasno po čemu si drugačija."],["Poverenje",43,"Premalo se vidi lice stručne osobe, njen način rada i objašnjenje postupka."],["Sadržaj",48,"Rezultati postoje, ali sadržaj ne vodi osobu od problema do željenog ishoda."],["Ponuda",35,`${offer} treba predstaviti kroz rezultat, kome je namenjen i zašto vredi.`],["Put do upita",29,"Za skuplju uslugu direktna prodaja u poruci stvara otpor; potreban je topliji prvi kontakt."]],
  priorities:[["Pojavi se lično u kratkim videima",`Snimi sebe kako jednostavno objašnjavaš problem koji rešava ${offer}. Kod beauty usluga klijent prvo bira osobu kojoj veruje, pa tek onda tretman.`],["Pokaži stvarne rezultate pre i posle","Dodaj kontekst: sa čim je klijent došao, šta je urađeno i nakon koliko vremena. Fotografija bez priče izgleda kao reklama; objašnjen rezultat gradi poverenje."],["Svakog dana koristi priče za zagrevanje publike",`Pokaži deo radnog dana, pripremu, higijenu i odgovore na pitanja. Tako ${aud.toLowerCase()} imaju osećaj da te već poznaju pre nego što se jave.`],["Preoblikuj ponudu oko željenog rezultata",`Objasni kome je ${offer} namenjen, koji problem rešava, šta paket uključuje i kakvu promenu klijent može realno da očekuje.`],["Uvedi topliji put do zakazivanja","Za skuplju uslugu nemoj odmah slati cenu i termin. Pozovi osobu da odgovori na nekoliko pitanja ili zakaže kratku procenu."]],
  ideas:[`Video: „Ako razmišljaš o ${offer.toLowerCase()}, prvo proveri ove 3 stvari“ — govoriš direktno u kameru.`,`Pre i posle rezultat klijentkinje iz grada ${city}, uz objašnjenje šta je urađeno i zašto.`,"Kratak snimak celog dolaska: konsultacija, priprema i deo tretmana.","„Najčešći strah pre tretmana je…“ — odgovori smireno i pokaži kako brineš o klijentu.","Priča klijentkinje: šta joj je smetalo pre i kako se oseća sada.",`Kome ${offer.toLowerCase()} nije namenjen i zašto ponekad kažeš „ne“ klijentu.`,"Serija priča: problem, rezultat i tek onda poziv za procenu.",`„Šta dobijate u paketu“ — objasni svaki korak i vrednost ${offer.toLowerCase()}.`,"Iza scene: priprema prostora i opreme uz objašnjenje higijenskih standarda.",`Lokalni video za ${city}: odgovori na pitanje žene koja prvi put dolazi.`]
 };
 return{
  summary:`Za ${biz.toLowerCase()} na tržištu ${city}, profil mora brzo da objasni kome pomažeš, zašto je ${offer.toLowerCase()} vredna ${price.toLowerCase()} i kako vodi do rezultata: ${result}.`,strength:"Profil ostavlja uredan prvi utisak",issue:"Vrednost ponude i razlog za izbor nisu dovoljno konkretni",reason:`Klijent vidi šta radiš, ali ne razume dovoljno brzo zašto mu je ${offer.toLowerCase()} potrebna baš sada niti zašto je sledeći korak „${path.toLowerCase()}“.`,
  scores:[["Prvi utisak",68,"Profil deluje uredno, ali glavna poruka može biti preciznija."],["Poverenje",46,"Potrebno je više stvarnih dokaza, iskustava i objašnjenja procesa."],["Sadržaj",49,"Objave informišu, ali retko vode ka jasnom sledećem koraku."],["Ponuda",37,`${offer} mora jasnije da poveže problem, rezultat i vrednost.`],["Put do upita",32,"Kontakt postoji, ali put od interesovanja do razgovora nije dovoljno prirodan."]],
  priorities:[["Jasno reci kome pomažeš i sa kojim rezultatom",`U prvoj rečenici profila poveži ${biz.toLowerCase()}, ${aud.toLowerCase()} i rezultat koji žele.`],["Pretvori ponudu u jasan ishod",`Objasni šta ${offer.toLowerCase()} menja za klijenta, šta uključuje i zbog čega vredi.`],["Pokaži dokaze, ne samo tvrdnje","Objavi konkretne rezultate, izjave klijenata i način na koji dolaziš do rezultata."],["Rešavaj stvarne dileme",`Odgovaraj na pitanja koja ${aud.toLowerCase()} imaju neposredno pre kupovine.`],["Olakšaj prvi razgovor","Umesto hladne prodaje, ponudi procenu, jednostavno pitanje ili kratku konsultaciju."]],
  ideas:[`3 greške koje ${aud.toLowerCase()} prave pre nego što izaberu ${offer.toLowerCase()}.`,`Studija slučaja iz grada ${city}: problem, proces i rezultat.`,`Video: kome ${offer.toLowerCase()} jeste, a kome nije namenjen.`,"Najčešće pitanje pre kupovine — iskren odgovor bez prodajnog tona.","Pokaži proces od prvog razgovora do rezultata.","Objasni od čega zavisi cena i šta klijent stvarno dobija.","Iskustvo jednog klijenta ispričano njegovim rečima.","Iza scene: detalj koji pokazuje standard tvog rada.","Mit iz tvoje industrije koji vodi do pogrešne odluke.",`Lokalna objava za ${city} sa pozivom na kratak prvi razgovor.`]
 };
}
function profileFacts(profiles=[]){
 const posts=profiles.flatMap(p=>p.posts||[]),videos=posts.filter(p=>p.video),captions=posts.filter(p=>(p.caption||"").trim().length>35),ctas=posts.filter(p=>/javi|piši|piši|posalji|pošalji|rezerv|zakaz|link|dm|kontakt|pozovi|prijav|kupi|naruči|saznaj|preuzmi|komentar/i.test(p.caption||"")),proof=posts.filter(p=>/rezultat|klijent|iskustv|pre i posle|before|after|recenz|testimonial|upit|prodaj|transform/i.test(p.caption||"")),duration=posts.filter(p=>/\b\d+\s*(dan|dana|nedelj|tjed|mesec|mjesec|sedmic|sat)/i.test(p.caption||"")),price=posts.filter(p=>/(€|eur|din|rsd|cena|cijena|košta|plać)/i.test(p.caption||""));
 return{posts,videos,captions,ctas,proof,duration,price,networks:profiles.length};
}
function evidenceFor(d,profiles=[]){const f=profileFacts(profiles);if(!profiles.length)return[["Status","Nije bilo dovoljno javno dostupnih objava za pouzdano brojanje."],["Šta procenjujemo","Jasnoću poruke, poverenje i put od sadržaja do upita."],["Sledeći korak","Preporuke pokazuju šta prvo treba promeniti na profilima."]];return[["Pregledano",`${f.posts.length} javnih objava na ${f.networks} ${f.networks===1?"mreži":"mreže"}.`],["Video sadržaj",`${f.videos.length} od ${f.posts.length} pregledanih objava su Reels/video formati.`],["Jasni opisi",`${f.captions.length} objava ima dovoljno konteksta da klijent razume temu.`],["Poziv na akciju",`${f.ctas.length} objava jasno govori osobi šta da uradi sledeće.`],["Dokazi i rezultati",`${f.proof.length} objava u tekstu naglašava rezultat, iskustvo ili dokaz.`]]}
function derivedAudit(d,profiles,r){
 const f=profileFacts(profiles);if(!f.posts.length)return{...r,overall:47};
 const ratio=(n,max=100)=>Math.min(max,Math.round(n/f.posts.length*100));
 const ctaRatio=ratio(f.ctas.length),proofRatio=ratio(f.proof.length),captionRatio=ratio(f.captions.length),videoRatio=ratio(f.videos.length);
 const scores=[["Prvi utisak",Math.min(88,55+Math.min(22,f.posts.length*2)),`Profil je aktivan i pregledali smo ${f.posts.length} objava. Ocena ne meri samo izgled, već koliko se brzo razume ponuda.`],["Poverenje",Math.round(40+proofRatio*.48),`${f.proof.length} od ${f.posts.length} opisa sadrži rezultat, iskustvo ili dokaz. ${f.proof.length?"To je dobra osnova koju treba ponavljati dosledno.":"Tvrdnje treba vezati za konkretne rezultate i iskustva."}`],["Sadržaj",Math.round(42+captionRatio*.2+Math.min(18,videoRatio*.18)),`${f.videos.length} video formata i ${f.captions.length} sadržajnih opisa pokazuju kontinuitet. Dalje gledamo da li svaki format vodi ka prioritetnoj ponudi.`],["Ponuda",Math.round(45+Math.min(30,proofRatio*.22+ctaRatio*.12)),`Ocena poredi ono što se vidi u objavama sa ponudom „${d.offer}“ i rezultatom koji si uneo/la.`],["Put do upita",Math.round(35+ctaRatio*.55),`${f.ctas.length} od ${f.posts.length} pregledanih opisa ima poziv na akciju. ${ctaRatio>65?"CTA postoji; sledeći korak je da proverimo da li vodi na pravi put kupovine, a ne da tvrdimo da ga nema.":"Poziv na akciju nije dovoljno dosledan kroz pregledani sadržaj."}`]];
 const overall=Math.round(scores.reduce((sum,[,value])=>sum+value,0)/scores.length);
 const priorities=[...r.priorities];
 priorities[0]=["Poveži ono što već objavljuješ sa ponudom koju želiš da prodaš",`Zadrži prepoznatljiv stil brenda, a u svakom sledećem sadržaju jasnije poveži temu sa problemom koji ima ${d.audience?.toLowerCase()||"tvoj idealni klijent"}, konkretnim rezultatom i ponudom „${d.offer}“.`];
 if(ctaRatio>65)priorities[4]=["CTA već postoji — sada proveri kvalitet puta posle klika",`U ${f.ctas.length} od ${f.posts.length} opisa pronašli smo poziv na akciju. Problem nije nedostatak CTA-a. Proveri da li vodi na ${d.purchasePath?.toLowerCase()||"pravi sledeći korak"} i da li taj put odgovara ceni ponude.`];
 if(/program|edukacij/i.test(`${d.offerType||""} ${d.business||""}`))priorities[3]=["Objasni strukturu programa bez otkrivanja svega",`${f.duration.length?`U ${f.duration.length} pregledanih opisa pronašli smo pomen trajanja.`:"U pregledanim opisima nismo pronašli jasno navedeno trajanje programa."} Ne moraš javno da objaviš cenu niti sve detalje ako se prodaja završava na pozivu. Ipak, osoba pre poziva treba da razume kome je program namenjen, koji problem rešava, kako okvirno izgleda rad i kakav rezultat može realno da očekuje.`];
 return{...r,scores,priorities,overall,ctaRatio,proofRatio};
}
function renderReviewedExamples(d,profiles=[]){
 const posts=profiles.flatMap(p=>(p.posts||[]).map(post=>({...post,platform:p.platform,username:p.username}))).filter(p=>p.image&&p.caption);
 if(!posts.length){$("#reviewedExamples").innerHTML="<p class='empty-review'>Nismo dobili dovoljno javnih podataka za pouzdan primer.</p>";return}
 const selected=[];for(const platform of [...new Set(posts.map(p=>p.platform))]){const item=posts.find(p=>p.platform===platform&&!selected.includes(p));if(item)selected.push(item)}for(const item of posts){if(selected.length>=5)break;if(!selected.includes(item))selected.push(item)}
 $("#reviewedExamples").innerHTML=selected.map(item=>{const hasCta=/javi|piši|rezerv|zakaz|link|prijav|kupi|naruči|pozovi/i.test(item.caption),type=item.video?"Reel":"Objava",caption=item.caption.replace(/\s+/g," ").trim(),title=caption.split(/[.!?]/).find(x=>x.trim().length>10)?.trim().split(/\s+/).slice(0,9).join(" ")||`${type} sa profila`,offer=d.offer?.trim()||"ovu ponudu";return`<article><img src="${esc(mediaUrl(item.image))}" alt="${esc(type)} sa profila @${esc(item.username)}"><div><small>${esc(type.toUpperCase())} · @${esc(item.username)}</small><strong>${esc(title)}</strong><blockquote>${esc(caption.slice(0,230))}${caption.length>230?"…":""}</blockquote><p><b>Šta je dobro:</b> ${hasCta?"Poziv na akciju već postoji i daje dobru osnovu za sledeći korak.":"Tema jasno predstavlja ono čime se brend bavi."}</p><p><b>Kako može bolje:</b> Počni konkretnom situacijom ili pitanjem u kome će se prava publika odmah prepoznati. Zatim pokaži rezultat i prirodno ga poveži sa ponudom „${esc(offer)}“.</p><p class="rewrite"><b>Primer drugačijeg ugla:</b> „Pre nego što izabereš ${esc(offer.toLowerCase())}, proveri ove tri stvari.“</p></div></article>`}).join("");
}
function contentBlueprint(d){const offer=d.offer||"glavna ponuda",city=d.location||"tvom mestu",audience=d.audience||"idealni klijent",path=d.purchasePath?.toLowerCase()||"razgovor",program=/program|edukacij/i.test(`${d.offerType||""} ${d.business||""} ${offer}`),caseTitle=program?"Primer polaznika: od problema do rezultata":`Primer klijenta iz mesta ${city}`;return{
 reels:[[program?"Tri stvari koje treba proveriti pre izbora programa":`Tri stvari koje treba proveriti pre izbora ponude „${offer}“`,`Počni direktnim pitanjem, pokaži kriterijume i završi pozivom na ${path}.`],["Najčešća greška pre donošenja odluke",`Objasni grešku koju ${audience.toLowerCase()} često prave i pokaži bolji sledeći korak.`],[`Kome ponuda „${offer}“ nije namenjena`,`Iskreno reci kome ne možeš da pomogneš. Takav Reel gradi poverenje i filtrira upite.`],["Kako izgleda put od prvog razgovora do rezultata","Prikaži četiri kratka koraka, bez komplikovanih objašnjenja."],[caseTitle,"Pokaži početnu situaciju, odluku, način rada i merljiv rezultat."],["Najčešće pitanje koje dobijaš pre kupovine","Odgovori licem u kameru i ukloni jednu važnu dilemu."],["Mit koji publiku vodi u pogrešnom smeru","Navedi čestu tvrdnju iz industrije, objasni zašto nije potpuna i ponudi praktičan zaključak."],["Šta bih uradio drugačije da danas počinjem","Podeli tri konkretne lekcije iz iskustva i poveži ih sa potrebama klijenta."],["Iza scene: detalj koji pokazuje standard rada","Pokaži pripremu, proces ili kontrolu kvaliteta koju klijent obično ne vidi."],[`Zašto ponuda „${offer}“ košta koliko košta`,`Objasni vrednost kroz proces, stručnost, rizik koji uklanjaš i rezultat koji klijent dobija.`],["Reakcija na stvarnu dilemu klijenta","Prikaži pitanje na ekranu, odgovori kratko i završi jasnim sledećim korakom."],["Šta se menja kada klijent konačno reši problem","Naslikaj situaciju pre i posle, bez preteranih obećanja, uz realan rezultat."]],
 stories:[["Jutarnji plan i cilj dana","Pokaži šta danas radiš i zašto je to važno klijentima."],["Anketa o glavnom problemu publike","Ponudi dva konkretna odgovora i iskoristi rezultat za sledeći Story."],["Jedan detalj procesa iza scene","Objasni standard rada koji klijent obično ne vidi."],["Rezultat sa kontekstom","Pokaži početnu situaciju, šta je urađeno i šta je realno postignuto."],["Najčešće pitanje ove nedelje","Odgovori prirodno u kratkom videu."],["Mini-kviz: šta biste vi uradili?","Ponudi dve opcije, a zatim objasni stručni izbor."],["Upoznaj osobu iza brenda","Podeli lični motiv, vrednost ili lekciju koja utiče na način rada."],["Jedna greška i brzo rešenje","Daj savet koji publika može odmah da primeni."],["Dokaz poverenja","Podeli izjavu klijenta i objasni šta je dovelo do rezultata."],["Ponuda kroz jednu korist",`Objasni jednu konkretnu promenu koju donosi „${offer}“ bez nabrajanja karakteristika.`],["Odgovor na prigovor","Izaberi cenu, vreme ili strah kao temu i odgovori mirno i konkretno."],["Poziv na sledeći korak",`Sažmi kome možeš da pomogneš i pozovi osobu na ${path}.`]],
 posts:[["Studija slučaja sa konkretnim rezultatom","Jedna snažna fotografija. U opisu prikaži početni problem, odluku, proces, rezultat i sledeći korak."]],
 carousels:[[program?"Kako da znaš da li je ovaj program pravi izbor":`Kako da znaš da li ti je potrebna ponuda „${offer}“`,`Prvi slajd postavlja jasno pitanje. Srednji slajdovi prikazuju situacije u kojima se publika prepoznaje, a poslednji vodi na ${path}.`]]};}
function renderContentPlan(d,type="reels"){const plan=contentBlueprint(d)[type]||[];$("#contentPlan").innerHTML=plan.map(([title,body],i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><div><strong>${title}</strong><p>${body}</p></div></article>`).join("")}
function renderPrintContentPlan(d){let container=$("#printContentPlan");if(!container){container=document.createElement("div");container.id="printContentPlan";container.className="print-content-plan";$("#contentPlan").after(container)}const labels={reels:"12 Reelova",stories:"12 Story ideja",posts:"1 objava",carousels:"1 karusel"},fallback=contentBlueprint(d);container.innerHTML=Object.keys(labels).map(type=>{const ai=deepAudit?.audit?.contentIdeas?.[type],items=ai?ai.map(x=>[clientText(x.title,deepAudit.evidence||[]),clientText(x.execution,deepAudit.evidence||[])]):fallback[type];return`<section><h4>${labels[type]}</h4><div class="print-plan-grid">${items.map(([title,body],i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><div><strong>${esc(title)}</strong><p>${esc(body)}</p></div></article>`).join("")}</div></section>`}).join("")}
function updateReportProfile(profiles=[]){const profile=profiles.find(item=>item.platform==="instagram"&&item.avatar)||profiles.find(item=>item.avatar);let block=$(".report-profile");if(!block){block=document.createElement("div");block.className="report-profile";block.innerHTML='<img id="reportAvatar" alt="Profil analiziranog brenda"><div><small>ANALIZIRANI PROFIL</small><strong id="reportHandle"></strong></div>';$(".dash-head .secondary").before(block)}if(!profile){block.classList.add("empty");return}if(block.dataset.source==="instagram"&&profile.platform!=="instagram")return;block.dataset.source=profile.platform;block.classList.remove("empty");$("#reportAvatar").src=mediaUrl(profile.avatar)||neutralAvatar();$("#reportHandle").textContent=`${networkLabel[profile.platform]||profile.platform} · @${String(profile.username||profile.displayName||"profil").replace(/^@/,"")}`}
function render(d,profiles=[]){const base=analysis(d),r=derivedAudit(d,profiles,base),f=profileFacts(profiles),networks=[...new Set(profiles.map(p=>networkLabel[p.platform]||p.platform).filter(Boolean))].join(", ")||"povezanim mrežama",offer=d.offer?.trim()||"glavnu ponudu",path=d.purchasePath?.trim()||"upit";$("#previewScore").textContent=r.overall;$("#previewSummary").textContent=f.posts.length?`Pregledali smo ${postWord(f.posts.length)}. ${f.ctas.length?`Poziv na sledeći korak postoji u ${f.ctas.length} od njih`:"Nijedan opis ne vodi jasno na sledeći korak"}, ${f.proof.length?`a rezultat ili iskustvo klijenta vidi se u ${f.proof.length}`:"a rezultat ili iskustvo klijenta se ne vidi ni u jednoj"}.`:"Procena pokazuje koliko profil jasno gradi poverenje i vodi osobu ka upitu.";$("#previewStrength").textContent=r.strength;$("#previewStrengthReason").textContent=r.scores?.[0]?.[2]||"Profil već ima osnovu na kojoj možeš da gradiš poverenje.";$("#previewIssue").textContent=r.issue;$("#previewIssueReason").textContent=r.reason;const proofGap=f.posts.length?f.proof.length/f.posts.length:0,ctaGap=f.posts.length?f.ctas.length/f.posts.length:0;$("#previewUrgency").textContent=proofGap<.3?`${f.proof.length?`Rezultat ili iskustvo klijenta pojavljuje se u ${f.proof.length} od ${f.posts.length} pregledanih objava`:`Nijedna od ${f.posts.length} pregledanih objava ne pokazuje rezultat ili iskustvo klijenta`} — zato posetilac nema dovoljno dokaza da donese odluku.`:ctaGap<.45?`${f.ctas.length?`Poziv na sledeći korak postoji u ${f.ctas.length} od ${f.posts.length} pregledanih opisa`:`Nijedan od ${f.posts.length} pregledanih opisa ne vodi osobu ka sledećem koraku`} — interesovanje se zato gubi pre upita.`:`Pronašli smo jasnu prepreku: ${r.issue.toLowerCase()}.`;$("#previewConsequence").textContent=`Ako se ovo ne promeni, profil može nastaviti da dobija preglede i reakcije bez proporcionalnog rasta kvalitetnih upita.`;$("#previewCta").textContent=f.posts.length?(f.ctas.length?`Poziv na sledeći korak postoji u ${f.ctas.length} od ${f.posts.length} pregledanih opisa.`:`Nijedan od ${f.posts.length} pregledanih opisa ne vodi jasno na sledeći korak.`):"Poziv na akciju nije moguće pouzdano proveriti.";$("#previewProof").textContent=f.posts.length?(f.proof.length?`Rezultat, iskustvo ili dokaz vidi se u ${f.proof.length} od ${f.posts.length} pregledanih objava.`:`Nijedna od ${f.posts.length} pregledanih objava ne pokazuje rezultat, iskustvo ili dokaz.`):"Dokazi i rezultati nisu bili javno dostupni za proveru.";$("#customerName").textContent=(d.name||"Dobro došli").split(" ")[0];$("#overallScore").textContent=r.overall;$("#overallRing").style.background=`radial-gradient(circle,#111111 55%,transparent 57%),conic-gradient(var(--purple) 0 ${r.overall}%,#2b2b2b ${r.overall}%)`;$("#dashboardConclusion").textContent=f.posts.length?`Na mrežama ${networks} pregledali smo ${f.posts.length} javno dostupnih objava i uporedili ih sa ponudom „${offer}“. Profil ima sadržaj koji pokazuje stručnost i temu kojom se brend bavi, ali poruka nije uvek dovoljno dosledno povezana sa rezultatom koji klijent želi. Najveća prilika je da se u prvim sekundama jasnije prepozna problem, zatim pokaže konkretan dokaz i objasni zašto je baš ova ponuda sledeći logičan korak. Tako sadržaj neće služiti samo za pregled i reakcije, već će sistematski graditi poverenje i voditi ljude ka koraku „${path}“.`:`Ponuda „${offer}“ treba već pri prvom pogledu da objasni kome pomaže, koji rezultat donosi i koji je prirodan sledeći korak. Preporuke su zato povezane sa informacijama iz upitnika, ciljnom publikom i putem do upita.`;$("#dashboardReason").textContent=f.posts.length?`Od ${f.posts.length} pregledanih opisa, ${f.ctas.length} ima poziv na akciju, dok ${f.proof.length} sadrži rezultat, iskustvo ili drugi oblik dokaza. To znači da osnova postoji, ali je potrebno da dokaz, ponuda i poziv na sledeći korak budu prisutni u istoj priči i prilagođeni svakoj mreži. Prioritet nije da se objavljuje više nasumičnog sadržaja, već da svaki format dobije jasnu ulogu: privlačenje pažnje, izgradnju poverenja ili vođenje ka upitu.`:"Zaključak je pripremljen prema ponudi, publici, cilju i informacijama koje su unete u upitnik. Kada javni sadržaj bude dostupan, biće dopunjen konkretnim dokazima iz objava.";$("#scoreGrid").innerHTML=r.scores.map(([n,v,why])=>`<article><span>${n}</span><strong>${v}<small>/100</small></strong><i><b style="width:${v}%"></b></i><p>${why}</p></article>`).join("");$("#priorities").innerHTML=r.priorities.map(([t,w],i)=>`<article><span>${i+1}</span><div><strong>${t}</strong><p>${w}</p></div><b class="impact">VISOK UTICAJ</b></article>`).join("");$("#evidenceGrid").innerHTML=evidenceFor(d,profiles).map(([title,body])=>`<article><small>${title}</small><strong>${body}</strong></article>`).join("");const messageCard=$("#previewMessage");if(messageCard)messageCard.textContent=r.issue||"Poruka profila može biti jasnija u prve tri sekunde";const faceCard=$("#previewFace");if(faceCard)faceCard.textContent=f.videos?.length?"Osoba iza brenda se pojavljuje u pregledanom sadržaju":"U pregledanom sadržaju nismo potvrdili dosledno lice brenda";renderReviewedExamples(d,profiles);renderContentPlan(d);renderPrintContentPlan(d)}
let deepAudit=null;
async function loadDeepAudit(data,profiles){
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),250000);
const response=await fetch("/api/analyze-content",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({form:data,profiles}),signal:controller.signal}).finally(()=>clearTimeout(timeout));
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||"Dubinska analiza trenutno nije dostupna.");
 deepAudit=payload;try{localStorage.setItem("marketizoDeepAudit",JSON.stringify(payload));localStorage.setItem("marketizoDeepAuditOwner",saved().auditId||"")}catch(error){console.warn("Analiza nije mogla da se sačuva lokalno.",error)}return payload;
}
async function loadDeepAuditWithRetry(data,profiles){try{return await loadDeepAudit(data,profiles)}catch(error){console.warn("Prvi pokušaj dubinske analize nije uspeo, pokušavamo ponovo.",error);return await loadDeepAudit(data,profiles)}}
function postWord(count){const n=Math.abs(Number(count)||0),last=n%10,two=n%100;if(last===1&&two!==11)return n+" objava";if(last>=2&&last<=4&&(two<12||two>14))return n+" objave";return n+" objava"}
function formatLabel(value,item){const raw=String(value||(item&&item.format)||"").toLowerCase();if(/reel|video|tiktok/.test(raw))return"REEL";if(/carousel|karusel|sidecar|album/.test(raw))return"KARUSEL";if(/story|storij/.test(raw))return"STORY";if(/post|objav|image|photo|slika|feed/.test(raw))return"OBJAVA";return item&&item.video?"REEL":"OBJAVA"}
function friendlyError(error){const text=String((error&&error.message)||"").trim();return /[čćžšđČĆŽŠĐ]/.test(text)||/nije|nema|nismo|profil|link|analiz|mre[zž]/i.test(text)?text:"Profil nije javno dostupan ili link nije unet tačno."}
function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}
function mediaUrl(value){if(!value)return"";try{return`/api/profile-preview?image=${encodeURIComponent(new URL(value).toString())}`}catch{return""}}
function returnToProfiles(){show("wizard");setStep(1);$("[name=instagram]")?.focus()}
function addRetryAction(){if($(".retry-analysis"))return;const button=document.createElement("button");button.type="button";button.className="secondary retry-analysis";button.textContent="Proveri link profila →";button.onclick=returnToProfiles;$("#analystNote").after(button)}
const CYRILLIC_MAP={"љ":"lj","њ":"nj","џ":"dž","Љ":"Lj","Њ":"Nj","Џ":"Dž","а":"a","б":"b","в":"v","г":"g","д":"d","ђ":"đ","е":"e","ж":"ž","з":"z","и":"i","ј":"j","к":"k","л":"l","м":"m","н":"n","о":"o","п":"p","р":"r","с":"s","т":"t","ћ":"ć","у":"u","ф":"f","х":"h","ц":"c","ч":"č","ш":"š","А":"A","Б":"B","В":"V","Г":"G","Д":"D","Ђ":"Đ","Е":"E","Ж":"Ž","З":"Z","И":"I","Ј":"J","К":"K","Л":"L","М":"M","Н":"N","О":"O","П":"P","Р":"R","С":"S","Т":"T","Ћ":"Ć","У":"U","Ф":"F","Х":"H","Ц":"C","Ч":"Č","Ш":"Š"};
function toLatin(value){return String(value??"").replace(/[Ѐ-џ]/g,ch=>CYRILLIC_MAP[ch]!==undefined?CYRILLIC_MAP[ch]:ch)}
function clientText(value,evidence=[]){
 const titles=new Map(evidence.map(item=>[String(item.index),`„${item.title||"Pregledani sadržaj"}“`]));
 return toLatin(value)
  .replace(/(?:objav(?:a|e|i|u|om)?\s*)?#(\d+)/gi,(_,index)=>titles.get(index)||"pregledani sadržaj")
  .replace(/video\s+transkript(?:a|i|e|om)?/gi,"sadržaj Reela")
  .replace(/transkript(?:a|i|e|om)?/gi,"sadržaj Reela")
  .replace(/transkripcij(?:a|e|i|u|om)/gi,"analiza sadržaja Reela")
  .replace(/^sadržaj Reela/,"Sadržaj Reela");
}
function conciseCoverage(limitations=[]){
 if(!limitations.length)return"Analiza je zasnovana na dostupnom javnom sadržaju.";
 const joined=clientText(limitations.join(" "));
 if(/facebook|tiktok/i.test(joined))return"Analiziran je javno dostupan sadržaj sa povezanih mreža.";
 if(/nije|nedost|ogranič|dostup/i.test(joined))return"Zaključci su izvedeni samo iz sadržaja koji je bio javno dostupan.";
 return"Zaključci su provereni prema dostupnim objavama i podacima iz upitnika.";
}
function splitConclusion(value){const text=String(value||"").trim(),sentences=text.match(/[^.!?]+[.!?]+|[^.!?]+$/g)||[text];let headline="",rest="";for(const sentence of sentences){if((headline+" "+sentence).trim().split(/\s+/).length<=48&&!rest)headline=(headline+" "+sentence).trim();else rest=(rest+" "+sentence).trim()}return{headline:headline||text.split(/\s+/).slice(0,48).join(" "),rest}}

function previewExcerpt(value,maxWords=48){
 const text=String(value||"").replace(/\s+/g," ").trim();
 const words=text.split(" ").filter(Boolean);
 return words.length>maxWords?`${words.slice(0,maxWords).join(" ")}…`:text;
}
function renderPreviewFromAudit(a,evidence=[]){
 const scores=(a.scores||[]).map(item=>({
  name:clientText(item.name,evidence),
  value:normalizeScore(item.value),
  reason:clientText(item.reason,evidence)
 })).filter(item=>item.name);
 const conclusion=previewExcerpt(clientText(a.mainConclusion,evidence),50);
 const reason=previewExcerpt(clientText(a.mainReason,evidence),36);
 $("#previewSummary").textContent=[conclusion,reason].filter(Boolean).join(" ");
 const cards=[...document.querySelectorAll("#preview .findings article")];
 const setCard=(card,label,title,body)=>{
  if(!card)return;
  card.querySelector("small").textContent=label;
  card.querySelector("strong").textContent=title;
  card.querySelector("p").textContent=previewExcerpt(body,140);
 };
 if(a.urgency)$("#previewUrgency").textContent=clientText(a.urgency,evidence);
 if(a.consequence)$("#previewConsequence").textContent=clientText(a.consequence,evidence);
 const written=(a.previewCards||[]).filter(card=>card&&card.title);
 if(written.length){written.forEach((card,index)=>setCard(cards[index],clientText(card.label,evidence),clientText(card.title,evidence),clientText(card.body,evidence)));return;}
 if(!scores.length)return;
 const sorted=[...scores].sort((left,right)=>right.value-left.value);
 const strongest=sorted[0],weakest=sorted.at(-1);
 const findScore=term=>scores.find(item=>item.name.toLocaleLowerCase("sr").includes(term))||weakest;
 const path=findScore("put"),trust=findScore("poveren");
 setCard(cards[0],"PRVI UTISAK KADA NEKO OTVORI TVOJ PROFIL",`Najbolje radiš: ${strongest.name.toLocaleLowerCase("sr")}`,`${strongest.reason} Ovaj deo analize dobio je ${strongest.value}/100, zato ovde već postoji dobra osnova na kojoj možeš da gradiš.`);
 setCard(cards[1],"GLAVNA PREPREKA ZA VIŠE UPITA",`Najviše prostora za rast: ${weakest.name.toLocaleLowerCase("sr")}`,`${weakest.reason} Ovaj deo je ocenjen sa ${weakest.value}/100 i trenutno je prvo mesto na kome potencijalni klijent može izgubiti razlog da nastavi dalje.`);
 setCard(cards[2],"PUT OD PAŽNJE DO KONKRETNOG UPITA","Da li sadržaj prirodno vodi do razgovora?",`${path.reason} Ocena ovog dela je ${path.value}/100. To pokazuje koliko je nekome lako da od zainteresovanog posetioca postane konkretan upit.`);
 setCard(cards[3],"DOKAZI KOJI GRADE POVERENJE","Da li sadržaj uklanja sumnju pre pitanja o ceni?",`${trust.reason} Ocena ovog dela je ${trust.value}/100. Što je dokaz konkretniji, klijentu je lakše da poveruje obećanju i napravi sledeći korak.`);
}
function renderDeepAudit(data,payload){
 const a=payload.audit,e=payload.evidence||[],coverage=a.coverage||{},conclusion=splitConclusion(clientText(a.mainConclusion,e));
 const overall=normalizeScore(a.overallScore);
 renderPreviewFromAudit(a,e);
 $("#previewScore").textContent=overall;
 $("#customerName").textContent=(data.name||"Dobro došli").split(" ")[0];$("#overallScore").textContent=overall;$("#overallRing").style.background=`radial-gradient(circle,#111111 55%,transparent 57%),conic-gradient(var(--purple) 0 ${overall}%,#2b2b2b ${overall}%)`;$("#dashboardConclusion").textContent=conclusion.headline;$("#dashboardReason").textContent=[conclusion.rest,clientText(a.mainReason,e)].filter(Boolean).join(" ");
 $("#evidenceGrid").innerHTML=[["Pregledano",postWord(coverage.postsReviewed||e.length)],["Reelovi i video",`${coverage.videosFound||0} pronađeno · ${coverage.videosTranscribed||0} detaljno analizirano`],["Povezane mreže",[...new Set(e.map(x=>networkLabel[x.platform]||x.platform))].filter(Boolean).join(", ")||"—"],["Osnova zaključaka",conciseCoverage(coverage.limitations)]].map(([t,b])=>`<article><small>${esc(t)}</small><strong>${esc(b)}</strong></article>`).join("");
 $("#scoreGrid").innerHTML=(a.scores||[]).map(x=>{const value=normalizeScore(x.value);return`<article><span>${esc(x.name)}</span><strong>${value}<small>/100</small></strong><i><b style="width:${value}%"></b></i><p>${esc(clientText(x.reason,e))}</p></article>`}).join("");
 $("#priorities").innerHTML=(a.priorities||[]).map((x,i)=>`<article><span>${i+1}</span><div><strong>${esc(clientText(x.title,e))}</strong><p>${esc(clientText(x.why,e))}</p><small class="priority-proof">Osnova preporuke: ${esc(clientText(x.evidence,e))}</small></div><b class="impact">VISOK UTICAJ</b></article>`).join("");
 $("#reviewedExamples").innerHTML=(a.examples||[]).map(x=>{const item=e.find(y=>y.index===x.postIndex)||{},title=item.title||clientText(x.observed,e)||"Pregledani sadržaj";return`<article class="${item.image?"":"no-image"}">${item.image?`<img src="${esc(mediaUrl(item.image))}" alt="${esc(title)}">`:""}<div><small>${esc([formatLabel(x.format,item),item.username?"@"+item.username:""].filter(Boolean).join(" · "))}</small><strong>${esc(title)}</strong><p><b>Šta već radi:</b> ${esc(clientText(x.works,e))}</p><p><b>Šta bih promenio:</b> ${esc(clientText(x.improve,e))}</p><p class="rewrite"><b>Konkretan primer:</b> ${esc(clientText(x.rewrite,e))}</p></div></article>`}).join("");
 renderDeepIdeas("reels");renderPrintContentPlan(data);
}
function renderDeepIdeas(type){const ideas=deepAudit?.audit?.contentIdeas?.[type],evidence=deepAudit?.evidence||[];if(!ideas)return renderContentPlan(saved(),type);$("#contentPlan").innerHTML=ideas.map((x,i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><div><strong>${esc(clientText(x.title,evidence))}</strong><p>${esc(clientText(x.execution,evidence))}</p><small class="idea-reason">Zašto: ${esc(clientText(x.reason,evidence))}</small></div></article>`).join("")}
$$("[data-start]").forEach(b=>b.onclick=()=>{trackMeta("AuditStarted",{content_name:"Marketizo Brand Audit"},true);show("wizard")});
$$(".next").forEach(b=>b.onclick=()=>{if(step===1&&!["instagram","facebook","tiktok"].some(n=>$('[name="'+n+'"]').value.trim())){$("#socialError").textContent="Dodaj link ka najmanje jednoj društvenoj mreži.";return}const active=$('.step[data-step="'+step+'"]');if(![...active.querySelectorAll("[required]")].every(i=>i.reportValidity()))return;$("#socialError").textContent="";if(step===1){const early=Object.fromEntries(new FormData($("#auditForm")));showProfileShell(early);void startProfilePrefetch(early).catch(()=>{})}setStep(step+1)});
$$(".back").forEach(b=>b.onclick=()=>setStep(step-1));
const networkLabel={instagram:"Instagram",facebook:"Facebook",tiktok:"TikTok"};
let profilePrefetch=null,profilePrefetchKey="";
const socialProfiles=data=>({instagram:data.instagram||"",facebook:data.facebook||"",tiktok:data.tiktok||""});
const socialKey=data=>JSON.stringify(socialProfiles(data));
const neutralAvatar=()=>`data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ff7a00"/><stop offset="1" stop-color="#ffb000"/></linearGradient></defs><rect width="100" height="100" rx="50" fill="#171717"/><circle cx="50" cy="42" r="17" fill="url(#g)"/><path d="M22 84c4-20 18-29 28-29s24 9 28 29" fill="url(#g)"/></svg>`)}`;
function showProfileShell(data){
 const entry=Object.entries(socialProfiles(data)).find(([,url])=>url);if(!entry)return;
 const [platform,rawUrl]=entry;let username=platform;
 try{username=new URL(rawUrl).pathname.split("/").filter(Boolean).find(part=>part!=="pages")||platform}catch{}
 $(".profile-phone").dataset.network=platform;
 $("#networkTabs").innerHTML=Object.entries(socialProfiles(data)).filter(([,url])=>url).map(([name])=>`<span class="${name===platform?"active":""}" data-network="${name}">${networkLabel[name]}</span>`).join("");
 $("#activeNetwork").textContent=networkLabel[platform];$("#scanHandle").textContent="@"+username.replace(/^@/,"");$("#scanDisplayName").textContent=username.replace(/^@/,"");$("#scanBio").textContent="Učitavamo profil i objave…";
 $("#scanAvatar").src=neutralAvatar();
 $("#feedGrid").classList.remove("loading-feed");
 $("#feedGrid").innerHTML=Object.entries(socialProfiles(data)).filter(([,url])=>url).map(([name])=>`<div class="profile-connect-card"><span>${esc(networkLabel[name])}</span><b>Povezujemo profil</b><i></i></div>`).join("");
}
function displayProfile(profile){
 const phone=$(".profile-phone");phone.dataset.network=profile.platform||"instagram";
 updateReportProfile([profile]);
 $("#networkTabs").innerHTML=`<span class="active" data-network="${esc(profile.platform||"instagram")}">${esc(networkLabel[profile.platform]||profile.platform||"Profil")}</span>`;
 $("#activeNetwork").textContent=networkLabel[profile.platform]||profile.platform;
 $("#scanHandle").textContent="@"+profile.username;
 $("#scanDisplayName").textContent=profile.displayName;
 $("#scanBio").textContent=profile.bio||"Opis profila nije javno dostupan";
 const fallbackAvatar=neutralAvatar();
 const avatar=$("#scanAvatar");
 avatar.onerror=()=>{avatar.onerror=null;avatar.src=fallbackAvatar;avatar.classList.add("empty")};
 avatar.src=profile.avatar?mediaUrl(profile.avatar):fallbackAvatar;
 avatar.classList.toggle("empty",!profile.avatar);
 const sourcePosts=profile.posts||[],posts=[...sourcePosts,...sourcePosts];
 const feed=$("#feedGrid");feed.classList.remove("loading-feed");
 feed.innerHTML=posts.length?posts.map((post,index)=>`<article class="real-post ${post.video?"video":""}" style="--order:${index}"><img src="${esc(mediaUrl(post.image))}" alt="Javna objava profila ${esc(profile.username)}" loading="eager"><span>${post.video?"▶":""}</span><small>${esc(post.caption||"Javna objava")}</small>${profile.platform==="facebook"?`<div class="facebook-post-meta"><b>${esc(profile.displayName||profile.username)}</b><em>${formatMetric(post.likes)} reakcija · ${formatMetric(post.comments)} komentara</em></div>`:""}</article>`).join(""):`<div class="feed-unavailable"><strong>Profil je učitan</strong><p>Javne objave ove mreže trenutno nisu dostupne za prikaz.</p></div>`;
 $("#scanLine").classList.remove("hidden");
}
function formatMetric(value){return value==null?"—":new Intl.NumberFormat("sr-Latn-RS",{notation:"compact"}).format(value)}
function inspectPost(post){if(!post?.image)return;const caption=(post.caption||"").replace(/\s+/g," ").trim(),title=caption.split(/[.!?]/).find(x=>x.trim().length>10)?.trim().split(/\s+/).slice(0,8).join(" ")||`${post.video?"Reel":"Objava"} sa profila`,src=mediaUrl(post.image),image=new Image();image.alt=title;image.onload=()=>{const media=$("#inspectorMedia");media.classList.toggle("is-video",!!post.video);media.replaceChildren(image);$("#inspectorType").textContent=post.video?"PREGLEDAMO REEL":"PREGLEDAMO OBJAVU";$("#inspectorCaption").textContent=title;$("#inspectorMetrics").textContent=`${formatMetric(post.likes)} sviđanja · ${formatMetric(post.comments)} komentara${post.views!=null?` · ${formatMetric(post.views)} pregleda`:""}`;$("#postInspector").classList.remove("hidden");setTimeout(()=>$("#postInspector").classList.add("reviewing"),50)};image.onerror=closePost;image.src=src}
function closePost(){const box=$("#postInspector");box.classList.remove("reviewing");setTimeout(()=>box.classList.add("hidden"),250)}
$("#closeInspector").onclick=closePost;
async function loadPublicProfiles(data){
 const profiles={instagram:data.instagram,facebook:data.facebook,tiktok:data.tiktok};
 $("#networkTabs").innerHTML=Object.entries(profiles).filter(([,url])=>url).map(([name])=>`<span data-network="${name}">${networkLabel[name]}</span>`).join("");
 const response=await fetch("/api/profile-preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profiles})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||"Javni profili trenutno nisu dostupni.");
 const firstProfile=payload.profiles?.[0];
 if(firstProfile)$("#networkTabs").innerHTML=`<span class="active" data-network="${esc(firstProfile.platform)}">${esc(networkLabel[firstProfile.platform]||firstProfile.platform)}</span>`;
 localStorage.setItem("marketizoPublicProfiles",JSON.stringify(payload.profiles||[]));localStorage.setItem("marketizoPublicProfilesOwner",saved().auditId||"");
 return payload.profiles;
}
function startProfilePrefetch(data){const key=socialKey(data);if(key===profilePrefetchKey&&profilePrefetch)return profilePrefetch;profilePrefetchKey=key;profilePrefetch=loadPublicProfiles(data).catch(error=>{profilePrefetch=null;throw error});return profilePrefetch}
let profileWarmupTimer;
$$('[name="instagram"],[name="facebook"],[name="tiktok"]').forEach(input=>{const warm=()=>{clearTimeout(profileWarmupTimer);profileWarmupTimer=setTimeout(()=>{const data=Object.fromEntries(new FormData($("#auditForm")));if(Object.values(socialProfiles(data)).some(Boolean))void startProfilePrefetch(data).catch(()=>{})},350)};input.addEventListener("change",warm);input.addEventListener("blur",warm)});
async function captureLead(data){
 try{
  const response=await fetch("/api/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),keepalive:true});
  if(!response.ok){console.warn("Lead nije poslat u CRM.");return false}
  trackMeta("Lead",{content_name:"Marketizo Brand Audit",currency:"EUR",value:1});return true;
 }catch(error){console.warn("CRM trenutno nije dostupan.",error)}
}
$("#auditForm").onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),submitter=e.submitter;d.auditId=crypto.randomUUID();localStorage.setItem("marketizoAudit",JSON.stringify(d));localStorage.removeItem("marketizoPaidAuditId");localStorage.removeItem("marketizoAuditPaid");localStorage.removeItem("marketizoDeepAudit");localStorage.removeItem("marketizoDeepAuditOwner");localStorage.removeItem("marketizoPublicProfiles");localStorage.removeItem("marketizoPublicProfilesOwner");deepAudit=null;if(!new URLSearchParams(location.search).has("test"))void captureLead(d);render(d);showProfileShell(d);if(submitter){submitter.disabled=true;submitter.dataset.original=submitter.textContent;submitter.textContent="Učitavamo tvoje profile…"}
 const waitingMessages=["Povezujemo se sa profilom…","Preuzimamo objave i Reelove…","Pripremamo sadržaj za detaljno čitanje…"];
 let waitingStep=0,waitingPercent=8;
 const waitingTimer=setInterval(()=>{$("#analysisStatus").textContent=waitingMessages[++waitingStep%waitingMessages.length];waitingPercent=Math.min(44,waitingPercent+3);$("#analysisPercent").textContent=waitingPercent+"%";$("#analysisBar").style.width=waitingPercent+"%"},1800);
 let publicProfiles=[];
 try{publicProfiles=await startProfilePrefetch(d);if(!publicProfiles||!publicProfiles.length)throw new Error("Nismo pronašli javne objave na unetom profilu.");try{localStorage.setItem("marketizoPublicProfiles",JSON.stringify(publicProfiles));localStorage.setItem("marketizoPublicProfilesOwner",d.auditId||"")}catch(error){console.warn("Profili nisu sačuvani lokalno.",error)}displayProfile(publicProfiles[0]);render(d,publicProfiles);show("analyzing");setTimeout(()=>inspectPost(publicProfiles[0]?.posts?.[0]),700);$("#analysisStatus").textContent=`${networkLabel[publicProfiles[0]?.platform]||"Prvi profil"} je učitan. Nastavljamo redom kroz sve povezane mreže.`}
 catch(error){show("analyzing");clearInterval(waitingTimer);$("#feedGrid").innerHTML=`<div class="feed-unavailable has-hint"><strong>Profil trenutno nije dostupan</strong><p>${esc(friendlyError(error))}</p><small>Proveri da li je profil javan i da li je link tačno unet.</small></div>`;$("#analysisStatus").textContent="Nismo uspeli da učitamo profil. Proveri link i pokušaj ponovo.";addRetryAction();if(submitter){submitter.disabled=false;submitter.textContent=submitter.dataset.original||"Pokreni analizu"}return}
 clearInterval(waitingTimer);$(".analysis-track").classList.remove("connecting");$(".progress-spinner").classList.add("ready");
 const phases=["Proveravamo da li se ponuda razume već pri prvom pogledu","Analiziramo poruke izgovorene u Reelovima","Pregledamo naslove, vizuale i prve kadrove","Čitamo opise i izdvajamo najvažnije poruke","Povezujemo sadržaj, rezultate i pozive na akciju","Usklađujemo nalaze sa svakom povezanom mrežom","Pretvaramo nalaze u jasne sledeće korake"];
 const notes=["Da li potencijalni klijent za pet sekundi zna kome pomažete?","Da li sadržaj zadržava pažnju ili samo lepo izgleda?","Da li tvrdnje imaju dokaz i dovoljno konteksta?","Da li svaka dobra objava vodi ka prirodnom sledećem koraku?","Kod skuplje ponude tražimo topliji put do razgovora.","Dobra poruka mora ostati ista, ali format treba prilagoditi mreži.","Svaku preporuku vezujemo za cilj, ponudu i ono što smo videli."];
 let p=0,visualCursor=0,checks=$$("#scanChecks li"),finished=false;
 const deepPromise=loadDeepAuditWithRetry(d,publicProfiles).then(result=>{renderDeepAudit(d,result);void notifyReport(d,result);finished=true;return result}).catch(error=>{render(d,publicProfiles);$("#analysisStatus").textContent="Pregled je završen na osnovu dostupnih podataka.";console.warn("Detaljna analiza nije završena.",error);finished=true;return null});
 const timer=setInterval(async()=>{const phaseIndex=Math.min(p,phases.length-1);checks[phaseIndex]?.classList.remove("active");checks[phaseIndex]?.classList.add("done");closePost();p++;visualCursor++;const profile=publicProfiles[visualCursor%publicProfiles.length];if(profile){displayProfile(profile);const posts=profile.posts||[],post=posts[Math.floor(visualCursor/publicProfiles.length)%Math.max(1,posts.length)];setTimeout(()=>inspectPost(post),500)}const percent=Math.min(finished?96:88,36+p*8);$("#analysisBar").style.width=percent+"%";$("#analysisPercent").textContent=Math.round(percent)+"%";if(p<phases.length){checks[p]?.classList.add("active");$("#analysisStatus").textContent=phases[p];$("#analystNote").querySelector("strong").textContent=notes[p]}else if(!finished){$("#analysisStatus").textContent="Završavamo pregled i pripremamo tvoje preporuke."}else{clearInterval(timer);await deepPromise;closePost();$("#analysisBar").style.width="100%";$("#analysisPercent").textContent="100%";$("#analysisStatus").textContent="Tvoja analiza je spremna";trackMeta("AuditCompleted",{content_name:"Marketizo Brand Audit"},true);setTimeout(()=>show(paidForCurrentAudit()?"dashboard":"preview"),500)}},2200)
};
$$('[data-content-tab]').forEach(button=>button.onclick=()=>{$$('[data-content-tab]').forEach(x=>x.classList.toggle('active',x===button));deepAudit?renderDeepIdeas(button.dataset.contentTab):renderContentPlan(saved(),button.dataset.contentTab)});
$("#checkoutButton").onclick=()=>{trackMeta("InitiateCheckout",{content_name:"Marketizo Brand Audit",currency:"EUR",value:1});const base=window.MARKETIZO_STRIPE_CHECKOUT_URL,audit=saved();if(base){const url=new URL(base);if(audit.auditId)url.searchParams.set("client_reference_id",audit.auditId);location.href=url.toString();return}alert("Plaćanje trenutno nije dostupno. Pokušaj ponovo za nekoliko minuta.")};


(function(){
 // Sigurnosna mreza: ako dubinska analiza padne, rezervni sablon ne sme da doslovno
 // ponovi ono sto je klijent na brzinu upisao u upitnik.
 const sloppy=function(value){
  const text=String(value||"").trim();
  if(!text)return true;
  if(text.split(/\s+/).length<2)return true;
  return /\b(sve|svi|sva|svih|ovo|ono|nesto|nešto|neki|razno|ostalo)\b/i.test(text);
 };
 const tidy=function(data){
  if(!data||typeof data!=="object"||Array.isArray(data))return data;
  if(!sloppy(data.offer))return data;
  const copy=Object.assign({},data);
  copy.offer="tvoja glavna usluga";
  return copy;
 };
 ["render","analysis","derivedAudit","evidenceFor","contentBlueprint","renderContentPlan","renderPrintContentPlan","renderReviewedExamples"].forEach(function(name){
  const original=window[name];
  if(typeof original!=="function")return;
  window[name]=function(){
   const args=Array.prototype.slice.call(arguments);
   args[0]=tidy(args[0]);
   return original.apply(this,args);
  };
 });
})();

(function(){
 // Kartice pre placanja sada nose duzi tekst, pa im treba vise prostora.
 const style=document.createElement("style");
 style.textContent="#preview .findings article p{font-size:15px;line-height:1.6}"+
  "#preview .findings{align-items:stretch}"+
  "#preview .findings article{align-items:flex-start}";
 document.head.appendChild(style);
})();

async function notifyReport(data,payload){
 try{
  if(new URLSearchParams(location.search).has("test"))return;
  const auditId=data&&data.auditId?String(data.auditId):"";
  if(!auditId||!data.email)return;
  if(localStorage.getItem("marketizoAuditNotified")===auditId)return;
  localStorage.setItem("marketizoAuditNotified",auditId);
  const audit=(payload&&payload.audit)||{},evidence=(payload&&payload.evidence)||[];
  const cards=(audit.previewCards||[]).slice(0,3).map(card=>({
   label:clientText(card.label,evidence),
   title:clientText(card.title,evidence),
   body:clientText(card.body,evidence)
  }));
  await fetch("/api/notify-report",{
   method:"POST",
   headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
    auditId,
    origin:location.origin,
    lead:{name:data.name,email:data.email,phone:data.phone,business:data.business,location:data.location},
    summary:{score:normalizeScore(audit.overallScore),headline:audit.headline||"",offerRead:audit.offerRead||"",cards}
   })
  });
 }catch(error){console.warn("Obaveštenje o analizi nije poslato.",error)}
}

(function(){
 // Na telefonu je ceo tekst o toku analize bio ispod maketa telefona, pa se nije video.
 // Status, traka napretka i procenat se zato premestaju iznad telefona i ostaju zalepljeni na vrhu.
 if(!window.matchMedia("(max-width:820px)").matches)return;
 const kicker=document.querySelector(".analysis-kicker");
 if(!kicker||document.querySelector(".mobile-progress"))return;
 const status=document.querySelector("#analysisStatus");
 const track=document.querySelector(".analysis-track");
 const meta=document.querySelector(".analysis-meta");
 if(!status||!track||!meta)return;
 const strip=document.createElement("div");
 strip.className="mobile-progress";
 (document.querySelector(".scan-eta")||kicker).after(strip);
 strip.append(status,track,meta);
 const style=document.createElement("style");
 style.textContent=".mobile-progress{position:sticky;top:8px;z-index:8;margin:16px auto 6px;padding:13px 15px;max-width:520px;border:1px solid #2c2c2c;border-radius:16px;background:#0d0d0d;box-shadow:0 14px 34px #000000cc;text-align:left}"+
  ".mobile-progress #analysisStatus{margin:0 0 11px;font-size:14px;line-height:1.45;color:#fff;min-height:0}"+
  ".mobile-progress .analysis-track{margin:0 0 11px}"+
  ".mobile-progress .analysis-meta{margin:0;font-size:12px}"+
  ".mobile-progress .analysis-meta>span{display:none}"+
  "@media(max-width:820px){.analyzing,.scan-layout{overflow:visible}.scan-copy{text-align:left}.analyst-note{text-align:left}.analyzing{margin:6px auto 26px}.scan-copy .eyebrow,.scan-copy h2{display:none}.scan-eta{margin-top:10px;font-size:13px}.profile-phone{width:240px;height:410px}.analysis-kicker{margin-top:10px;font-size:12px;padding:9px 13px;max-width:calc(100% - 14px)}.scan-layout{margin-top:6px}}";
 document.head.appendChild(style);
})();

(function(){
 // iOS Safari uvecava celu stranicu kada se fokusira polje manje od 16px,
 // pa se posle toga cela stranica moze vuci levo-desno. Zato su polja 16px na telefonu.
 const style=document.createElement("style");
 style.textContent="@media(max-width:900px){input,select,textarea{font-size:16px}}"+
  "html,body{overflow-x:clip;max-width:100%}";
 document.head.appendChild(style);
})();


async function loadPaidReport(auditId,sessionId){
 const response=await fetch("/api/report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({auditId,sessionId})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok||!payload.paid||!payload.audit)throw new Error(payload.error||"Analiza još nije otključana.");
 return payload;
}

(function(){
 const params=new URLSearchParams(location.search);
 const requested=(params.get("report")||"").trim();
 if(params.get("dashboard")!=="1"&&!requested)return;
 const data=saved();
 const auditId=requested||data.auditId||"";
 let profiles=[];
 try{
  const owns=key=>Boolean(data.auditId)&&localStorage.getItem(key)===data.auditId;
  profiles=owns("marketizoPublicProfilesOwner")?JSON.parse(localStorage.getItem("marketizoPublicProfiles")||"[]"):[];
  if(!Array.isArray(profiles))profiles=[];
  deepAudit=owns("marketizoDeepAuditOwner")?JSON.parse(localStorage.getItem("marketizoDeepAudit")||"null"):null;
 }catch(error){profiles=[];deepAudit=null;console.warn("Sačuvana analiza nije mogla da se pročita.",error)}
 // Prvo prikazujemo ono što već imamo, da klijent ne gleda u prazno dok proveravamo uplatu.
 try{
  updateReportProfile(profiles);
  if(deepAudit&&deepAudit.audit)renderDeepAudit(data,deepAudit);
  else render(data,profiles);
 }catch(error){
  console.warn("Prikaz sačuvane analize nije uspeo.",error);
  try{render(data,profiles)}catch(inner){console.warn("Rezervni prikaz nije uspeo.",inner)}
 }
 show(paidForCurrentAudit()&&deepAudit?.audit?.priorities?"dashboard":"preview");
 if(!auditId)return;
 // Pun izveštaj postoji samo na serveru i izdaje se tek kada Stripe potvrdi uplatu.
 const sessionId=params.get("session_id")||localStorage.getItem("marketizoAuditPaymentSession")||"";
 loadPaidReport(auditId,sessionId).then(payload=>{
  const lead=Object.assign({},data,{auditId});
  if(payload.lead&&payload.lead.name)lead.name=payload.lead.name;
  if(payload.lead&&payload.lead.business&&!lead.business)lead.business=payload.lead.business;
  if(payload.lead&&payload.lead.location&&!lead.location)lead.location=payload.lead.location;
  deepAudit={audit:payload.audit,evidence:payload.evidence||[]};
  try{
   localStorage.setItem("marketizoAudit",JSON.stringify(lead));
   localStorage.setItem("marketizoPaidAuditId",auditId);
   localStorage.setItem("marketizoDeepAudit",JSON.stringify(deepAudit));
   localStorage.setItem("marketizoDeepAuditOwner",auditId);
  }catch(error){console.warn("Analiza nije mogla da se sačuva lokalno.",error)}
  renderDeepAudit(lead,deepAudit);
  show("dashboard");
 }).catch(error=>{
  console.warn("Pun izveštaj još nije dostupan.",error);
  if(!deepAudit||!deepAudit.audit||!deepAudit.audit.priorities){
   const note=$("#previewSummary");
   if(note)note.textContent="Nismo uspeli da potvrdimo uplatu za ovu analizu. Ako je novac skinut, javi nam se i odmah je otključavamo.";
  }
 });
})();
