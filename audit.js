const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);let step=1;
$(".dash-head p").textContent="U nastavku vidiš glavne nalaze, prioritete i konkretne preporuke za svoj brend.";
$(".evidence-section .eyebrow").textContent="Obuhvat analize";
$(".evidence-section h3").textContent="Na čemu se zasnivaju zaključci";
const show=id=>{["landing","wizard","analyzing","preview","dashboard"].forEach(x=>$("#"+x).classList.add("hidden"));$("#"+id).classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})};
function setStep(n){step=n;$$(".step").forEach(x=>x.classList.toggle("active",+x.dataset.step===n));$("#stepText").textContent=`Korak ${n} od 4`;$("#progressBar").style.width=`${n*25}%`}
const saved=()=>JSON.parse(localStorage.getItem("marketizoAudit")||"{}");
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
function evidenceFor(d,profiles=[]){const f=profileFacts(profiles);if(!profiles.length)return[["Profili","Čekamo javne podatke da bismo vezali zaključke za konkretne objave."],["Biznis",`${d.business||"Biznis"} · ${d.location||"lokacija"}`],["Cilj",d.goal||"Više upita"]];return[["Pregledano",`${f.posts.length} javnih objava na ${f.networks} ${f.networks===1?"mreži":"mreže"}.`],["Video sadržaj",`${f.videos.length} od ${f.posts.length} pregledanih objava su Reels/video formati.`],["Jasni opisi",`${f.captions.length} objava ima dovoljno konteksta da klijent razume temu.`],["Poziv na akciju",`${f.ctas.length} objava jasno govori osobi šta da uradi sledeće.`],["Dokazi i rezultati",`${f.proof.length} objava u tekstu naglašava rezultat, iskustvo ili dokaz.`]]}
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
 $("#reviewedExamples").innerHTML=selected.map(item=>{const hasCta=/javi|piši|rezerv|zakaz|link|prijav|kupi|naruči|pozovi/i.test(item.caption),type=item.video?"Reel":"Objava",caption=item.caption.replace(/\s+/g," ").trim(),title=caption.split(/[.!?]/).find(x=>x.trim().length>10)?.trim().split(/\s+/).slice(0,9).join(" ")||`${type} sa profila`;return`<article><img src="${item.image}" alt="${type} sa profila @${item.username}"><div><small>${type.toUpperCase()} · @${item.username}</small><strong>${title}</strong><blockquote>${caption.slice(0,230)}${caption.length>230?"…":""}</blockquote><p><b>Šta je dobro:</b> ${hasCta?"Poziv na akciju već postoji i daje dobru osnovu za sledeći korak.":"Tema jasno predstavlja ono čime se brend bavi."}</p><p><b>Kako može bolje:</b> Poveži početak direktnije sa problemom koji ima ${d.audience?.toLowerCase()||"idealni klijent"}, zatim pokaži rezultat i objasni kako vodi do ponude „${d.offer||"koju želiš da istakneš"}“.</p><p class="rewrite"><b>Primer drugačijeg ugla:</b> „${d.audience||"Ako prepoznaješ ovaj problem"}, evo šta treba da znaš pre nego što izabereš ${d.offer?.toLowerCase()||"ovu ponudu"}.“</p></div></article>`}).join("");
}
function contentBlueprint(d){const offer=d.offer||"glavna ponuda",city=d.location||"tvom mestu",audience=d.audience||"idealni klijent",path=d.purchasePath?.toLowerCase()||"razgovor",program=/program|edukacij/i.test(`${d.offerType||""} ${d.business||""} ${offer}`),caseTitle=program?"Primer polaznika: od problema do rezultata":`Primer klijenta iz mesta ${city}`;return{
 reels:[[program?"Tri stvari koje treba proveriti pre izbora programa":`Tri stvari koje treba proveriti pre izbora ponude „${offer}“`,`Počni direktnim pitanjem, pokaži kriterijume i završi pozivom na ${path}.`],["Najčešća greška pre donošenja odluke",`Objasni grešku koju ${audience.toLowerCase()} često prave i pokaži bolji sledeći korak.`],[`Kome ponuda „${offer}“ nije namenjena`,`Iskreno reci kome ne možeš da pomogneš. Takav Reel gradi poverenje i filtrira upite.`],["Kako izgleda put od prvog razgovora do rezultata","Prikaži četiri kratka koraka, bez komplikovanih objašnjenja."],[caseTitle,"Pokaži početnu situaciju, odluku, način rada i merljiv rezultat."],["Najčešće pitanje koje dobijaš pre kupovine","Odgovori licem u kameru i ukloni jednu važnu dilemu."],["Mit koji publiku vodi u pogrešnom smeru","Navedi čestu tvrdnju iz industrije, objasni zašto nije potpuna i ponudi praktičan zaključak."],["Šta bih uradio drugačije da danas počinjem","Podeli tri konkretne lekcije iz iskustva i poveži ih sa potrebama klijenta."],["Iza scene: detalj koji pokazuje standard rada","Pokaži pripremu, proces ili kontrolu kvaliteta koju klijent obično ne vidi."],[`Zašto ponuda „${offer}“ košta koliko košta`,`Objasni vrednost kroz proces, stručnost, rizik koji uklanjaš i rezultat koji klijent dobija.`],["Reakcija na stvarnu dilemu klijenta","Prikaži pitanje na ekranu, odgovori kratko i završi jasnim sledećim korakom."],["Šta se menja kada klijent konačno reši problem","Naslikaj situaciju pre i posle, bez preteranih obećanja, uz realan rezultat."]],
 stories:[["Jutarnji plan i cilj dana","Pokaži šta danas radiš i zašto je to važno klijentima."],["Anketa o glavnom problemu publike","Ponudi dva konkretna odgovora i iskoristi rezultat za sledeći Story."],["Jedan detalj procesa iza scene","Objasni standard rada koji klijent obično ne vidi."],["Rezultat sa kontekstom","Pokaži početnu situaciju, šta je urađeno i šta je realno postignuto."],["Najčešće pitanje ove nedelje","Odgovori prirodno u kratkom videu."],["Mini-kviz: šta biste vi uradili?","Ponudi dve opcije, a zatim objasni stručni izbor."],["Upoznaj osobu iza brenda","Podeli lični motiv, vrednost ili lekciju koja utiče na način rada."],["Jedna greška i brzo rešenje","Daj savet koji publika može odmah da primeni."],["Dokaz poverenja","Podeli izjavu klijenta i objasni šta je dovelo do rezultata."],["Ponuda kroz jednu korist",`Objasni jednu konkretnu promenu koju donosi „${offer}“ bez nabrajanja karakteristika.`],["Odgovor na prigovor","Izaberi cenu, vreme ili strah kao temu i odgovori mirno i konkretno."],["Poziv na sledeći korak",`Sažmi kome možeš da pomogneš i pozovi osobu na ${path}.`]],
 posts:[["Studija slučaja sa konkretnim rezultatom","Jedna snažna fotografija. U opisu prikaži početni problem, odluku, proces, rezultat i sledeći korak."]],
 carousels:[[program?"Kako da znaš da li je ovaj program pravi izbor":`Kako da znaš da li ti je potrebna ponuda „${offer}“`,`Prvi slajd postavlja jasno pitanje. Srednji slajdovi prikazuju situacije u kojima se publika prepoznaje, a poslednji vodi na ${path}.`]]};}
function renderContentPlan(d,type="reels"){const plan=contentBlueprint(d)[type]||[];$("#contentPlan").innerHTML=plan.map(([title,body],i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><div><strong>${title}</strong><p>${body}</p></div></article>`).join("")}
function render(d,profiles=[]){const base=analysis(d),r=derivedAudit(d,profiles,base),f=profileFacts(profiles);$("#previewSummary").textContent=r.summary;$("#previewStrength").textContent=r.strength;$("#previewIssue").textContent=r.issue;$("#previewIssueReason").textContent=r.reason;$("#customerName").textContent=(d.name||"Dobro došli").split(" ")[0];$("#overallScore").textContent=r.overall;$("#overallRing").style.background=`radial-gradient(circle,#111111 55%,transparent 57%),conic-gradient(var(--purple) 0 ${r.overall}%,#2b2b2b ${r.overall}%)`;$("#dashboardConclusion").textContent=f.posts.length?`Pregledali smo ${f.posts.length} objava. Najveća prilika je da svaki dobar sadržaj jasnije vodi ka ponudi.`:"Profil mora brže da objasni vrednost ponude i prirodan sledeći korak.";$("#dashboardReason").textContent=f.posts.length?`${f.ctas.length} od ${f.posts.length} opisa ima poziv na akciju, a ${f.proof.length} sadrži rezultat ili iskustvo klijenta. Sledeći korak je da sadržaj doslednije gradi poverenje i vodi ka koraku „${d.purchasePath||"upit"}“.`:"Preporuke su pripremljene prema ponudi, ciljnoj publici i informacijama iz upitnika.";$("#scoreGrid").innerHTML=r.scores.map(([n,v,why])=>`<article><span>${n}</span><strong>${v}<small>/100</small></strong><i><b style="width:${v}%"></b></i><p>${why}</p></article>`).join("");$("#priorities").innerHTML=r.priorities.map(([t,w],i)=>`<article><span>${i+1}</span><div><strong>${t}</strong><p>${w}</p></div><b class="impact">VISOK UTICAJ</b></article>`).join("");$("#evidenceGrid").innerHTML=evidenceFor(d,profiles).map(([title,body])=>`<article><small>${title}</small><strong>${body}</strong></article>`).join("");renderReviewedExamples(d,profiles);renderContentPlan(d)}
let deepAudit=null;
async function loadDeepAudit(data,profiles){
 const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),120000);
 const response=await fetch("/api/analyze-content",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({form:data,profiles}),signal:controller.signal}).finally(()=>clearTimeout(timeout));
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||"Dubinska analiza trenutno nije dostupna.");
 deepAudit=payload;localStorage.setItem("marketizoDeepAudit",JSON.stringify(payload));return payload;
}
function esc(value){return String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]))}
function returnToProfiles(){show("wizard");setStep(1);$("[name=instagram]")?.focus()}
function addRetryAction(){if($(".retry-analysis"))return;const button=document.createElement("button");button.type="button";button.className="secondary retry-analysis";button.textContent="Proveri link profila →";button.onclick=returnToProfiles;$("#analystNote").after(button)}
function clientText(value,evidence=[]){
 const titles=new Map(evidence.map(item=>[String(item.index),`„${item.title||"Pregledani sadržaj"}“`]));
 return String(value??"")
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
function renderDeepAudit(data,payload){
 const a=payload.audit,e=payload.evidence||[],coverage=a.coverage||{};
 const overall=normalizeScore(a.overallScore);
 $("#customerName").textContent=(data.name||"Dobro došli").split(" ")[0];$("#overallScore").textContent=overall;$("#overallRing").style.background=`radial-gradient(circle,#111111 55%,transparent 57%),conic-gradient(var(--purple) 0 ${overall}%,#2b2b2b ${overall}%)`;$("#dashboardConclusion").textContent=clientText(a.mainConclusion,e);$("#dashboardReason").textContent=clientText(a.mainReason,e);
 $("#evidenceGrid").innerHTML=[["Pregledano",`${coverage.postsReviewed||e.length} objava`],["Reels i video",`${coverage.videosFound||0} pronađeno · ${coverage.videosTranscribed||0} detaljno analizirano`],["Povezane mreže",[...new Set(e.map(x=>x.platform))].filter(Boolean).join(", ")||"—"],["Osnova zaključaka",conciseCoverage(coverage.limitations)]].map(([t,b])=>`<article><small>${esc(t)}</small><strong>${esc(b)}</strong></article>`).join("");
 $("#scoreGrid").innerHTML=a.scores.map(x=>{const value=normalizeScore(x.value);return`<article><span>${esc(x.name)}</span><strong>${value}<small>/100</small></strong><i><b style="width:${value}%"></b></i><p>${esc(clientText(x.reason,e))}</p></article>`}).join("");
 $("#priorities").innerHTML=a.priorities.map((x,i)=>`<article><span>${i+1}</span><div><strong>${esc(clientText(x.title,e))}</strong><p>${esc(clientText(x.why,e))}</p><small class="priority-proof">Osnova preporuke: ${esc(clientText(x.evidence,e))}</small></div><b class="impact">VISOK UTICAJ</b></article>`).join("");
 $("#reviewedExamples").innerHTML=a.examples.map(x=>{const item=e.find(y=>y.index===x.postIndex)||{},title=item.title||clientText(x.observed,e)||"Pregledani sadržaj";return`<article>${item.image?`<img src="${esc(item.image)}" alt="${esc(title)}">`:""}<div><small>${esc(x.format)} · ${esc(item.username?"@"+item.username:"")}</small><strong>${esc(title)}</strong><p><b>Šta već radi:</b> ${esc(clientText(x.works,e))}</p><p><b>Šta bih promenio:</b> ${esc(clientText(x.improve,e))}</p><p class="rewrite"><b>Konkretan primer:</b> ${esc(clientText(x.rewrite,e))}</p></div></article>`}).join("");
 renderDeepIdeas("reels");
}
function renderDeepIdeas(type){const ideas=deepAudit?.audit?.contentIdeas?.[type],evidence=deepAudit?.evidence||[];if(!ideas)return renderContentPlan(saved(),type);$("#contentPlan").innerHTML=ideas.map((x,i)=>`<article><span>${String(i+1).padStart(2,"0")}</span><div><strong>${esc(clientText(x.title,evidence))}</strong><p>${esc(clientText(x.execution,evidence))}</p><small class="idea-reason">Zašto: ${esc(clientText(x.reason,evidence))}</small></div></article>`).join("")}
$$("[data-start]").forEach(b=>b.onclick=()=>show("wizard"));
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
 $("#activeNetwork").textContent=networkLabel[profile.platform]||profile.platform;
 $("#scanHandle").textContent="@"+profile.username;
 $("#scanDisplayName").textContent=profile.displayName;
 $("#scanBio").textContent=profile.bio||"Opis profila nije javno dostupan";
 const fallbackAvatar=profile.posts?.[0]?.image||neutralAvatar();
 const avatar=$("#scanAvatar");
 avatar.onerror=()=>{avatar.onerror=null;avatar.src=fallbackAvatar;avatar.classList.add("empty")};
 avatar.src=profile.avatar||fallbackAvatar;
 avatar.classList.toggle("empty",!profile.avatar);
 const sourcePosts=profile.posts||[],posts=[...sourcePosts,...sourcePosts];
 const feed=$("#feedGrid");feed.classList.remove("loading-feed");
 feed.innerHTML=posts.map((post,index)=>`<article class="real-post ${post.video?"video":""}" style="--order:${index}"><img src="${post.image}" alt="Javna objava profila ${profile.username}" loading="eager"><span>${post.video?"▶":""}</span><small>${post.caption||"Javna objava"}</small>${profile.platform==="facebook"?`<div class="facebook-post-meta"><b>${esc(profile.displayName||profile.username)}</b><em>${formatMetric(post.likes)} reakcija · ${formatMetric(post.comments)} komentara</em></div>`:""}</article>`).join("");
 $$("#networkTabs span").forEach(tab=>tab.classList.toggle("active",tab.dataset.network===profile.platform));
 $("#scanLine").classList.remove("hidden");
}
function formatMetric(value){return value==null?"—":new Intl.NumberFormat("sr-Latn-RS",{notation:"compact"}).format(value)}
function inspectPost(post){if(!post)return;const caption=(post.caption||"").replace(/\s+/g," ").trim(),title=caption.split(/[.!?]/).find(x=>x.trim().length>10)?.trim().split(/\s+/).slice(0,8).join(" ")||`${post.video?"Reel":"Objava"} sa profila`,media=$("#inspectorMedia");media.classList.toggle("is-video",!!post.video);media.innerHTML=`<img src="${esc(post.image)}" alt="${esc(title)}">`;$("#inspectorType").textContent=post.video?"PREGLEDAMO REEL":"PREGLEDAMO OBJAVU";$("#inspectorCaption").textContent=title;$("#inspectorMetrics").textContent=`${formatMetric(post.likes)} sviđanja · ${formatMetric(post.comments)} komentara${post.views!=null?` · ${formatMetric(post.views)} pregleda`:""}`;$("#postInspector").classList.remove("hidden");setTimeout(()=>$("#postInspector").classList.add("reviewing"),50)}
function closePost(){const box=$("#postInspector");box.classList.remove("reviewing");setTimeout(()=>box.classList.add("hidden"),250)}
$("#closeInspector").onclick=closePost;
async function loadPublicProfiles(data){
 const profiles={instagram:data.instagram,facebook:data.facebook,tiktok:data.tiktok};
 $("#networkTabs").innerHTML=Object.entries(profiles).filter(([,url])=>url).map(([name])=>`<span data-network="${name}">${networkLabel[name]}</span>`).join("");
 const response=await fetch("/api/profile-preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profiles})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||"Javni profili trenutno nisu dostupni.");
 const loaded=new Set((payload.profiles||[]).map(profile=>profile.platform));
 $("#networkTabs").innerHTML=Object.entries(profiles).filter(([,url])=>url).map(([name])=>`<span data-network="${esc(name)}" class="${loaded.has(name)?"":"unavailable"}">${esc(networkLabel[name]||name)}</span>`).join("");
 localStorage.setItem("marketizoPublicProfiles",JSON.stringify(payload.profiles));
 return payload.profiles;
}
function startProfilePrefetch(data){const key=socialKey(data);if(key===profilePrefetchKey&&profilePrefetch)return profilePrefetch;profilePrefetchKey=key;profilePrefetch=loadPublicProfiles(data).catch(error=>{profilePrefetch=null;throw error});return profilePrefetch}
async function captureLead(data){
 try{
  const response=await fetch("/api/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),keepalive:true});
  if(!response.ok)console.warn("Lead nije poslat u CRM.");
 }catch(error){console.warn("CRM trenutno nije dostupan.",error)}
}
$("#auditForm").onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.target)),submitter=e.submitter;localStorage.setItem("marketizoAudit",JSON.stringify(d));void captureLead(d);render(d);showProfileShell(d);if(submitter){submitter.disabled=true;submitter.dataset.original=submitter.textContent;submitter.textContent="Učitavamo tvoje profile…"}
 const waitingMessages=["Povezujemo se sa profilom…","Preuzimamo objave i Reelove…","Pripremamo sadržaj za detaljno čitanje…"];
 let waitingStep=0,waitingPercent=8;
 const waitingTimer=setInterval(()=>{$("#analysisStatus").textContent=waitingMessages[++waitingStep%waitingMessages.length];waitingPercent=Math.min(44,waitingPercent+3);$("#analysisPercent").textContent=waitingPercent+"%";$("#analysisBar").style.width=waitingPercent+"%"},1800);
 let publicProfiles=[];
 try{publicProfiles=await startProfilePrefetch(d);displayProfile(publicProfiles[0]);render(d,publicProfiles);show("analyzing");setTimeout(()=>inspectPost(publicProfiles[0]?.posts?.[0]),700);$("#analysisStatus").textContent=`${networkLabel[publicProfiles[0]?.platform]||"Prvi profil"} je učitan. Nastavljamo redom kroz sve povezane mreže.`}
 catch(error){show("analyzing");clearInterval(waitingTimer);$("#feedGrid").innerHTML=`<div class="feed-unavailable"><strong>Profil trenutno nije dostupan</strong><p>${esc(error.message)}</p><small>Proveri da li je profil javan i da li je link tačno unet.</small></div>`;$("#analysisStatus").textContent="Proveri link profila i pokušaj ponovo.";addRetryAction();if(submitter){submitter.disabled=false;submitter.textContent=submitter.dataset.original||"Pokreni analizu"}return}
 clearInterval(waitingTimer);$(".analysis-track").classList.remove("connecting");$(".progress-spinner").classList.add("ready");
 const phases=["Proveravamo da li se ponuda razume već pri prvom pogledu","Analiziramo poruke izgovorene u Reelovima","Pregledamo naslove, vizuale i prve kadrove","Čitamo opise i izdvajamo najvažnije poruke","Povezujemo sadržaj, rezultate i pozive na akciju","Usklađujemo nalaze sa svakom povezanom mrežom","Pretvaramo nalaze u jasne sledeće korake"];
 const notes=["Da li potencijalni klijent za pet sekundi zna kome pomažete?","Da li sadržaj zadržava pažnju ili samo lepo izgleda?","Da li tvrdnje imaju dokaz i dovoljno konteksta?","Da li svaka dobra objava vodi ka prirodnom sledećem koraku?","Kod skuplje ponude tražimo topliji put do razgovora.","Dobra poruka mora ostati ista, ali format treba prilagoditi mreži.","Svaku preporuku vezujemo za cilj, ponudu i ono što smo videli."];
 let p=0,visualCursor=0,checks=$$("#scanChecks li"),finished=false;
 const deepPromise=loadDeepAudit(d,publicProfiles).then(result=>{renderDeepAudit(d,result);finished=true;return result}).catch(()=>{finished=true;return null});
 const timer=setInterval(async()=>{const phaseIndex=Math.min(p,phases.length-1);checks[phaseIndex]?.classList.remove("active");checks[phaseIndex]?.classList.add("done");closePost();p++;visualCursor++;const profile=publicProfiles[visualCursor%publicProfiles.length];if(profile){displayProfile(profile);const posts=profile.posts||[],post=posts[Math.floor(visualCursor/publicProfiles.length)%Math.max(1,posts.length)];setTimeout(()=>inspectPost(post),500)}const percent=Math.min(finished?96:88,36+p*8);$("#analysisBar").style.width=percent+"%";$("#analysisPercent").textContent=Math.round(percent)+"%";if(p<phases.length){checks[p]?.classList.add("active");$("#analysisStatus").textContent=phases[p];$("#analystNote").querySelector("strong").textContent=notes[p]}else if(!finished){$("#analysisStatus").textContent="Završavamo pregled i pripremamo tvoje preporuke."}else{clearInterval(timer);await deepPromise;closePost();$("#analysisBar").style.width="100%";$("#analysisPercent").textContent="100%";$("#analysisStatus").textContent="Tvoja analiza je spremna";setTimeout(()=>show("dashboard"),700)}},3200)
};
$$('[data-content-tab]').forEach(button=>button.onclick=()=>{$$('[data-content-tab]').forEach(x=>x.classList.toggle('active',x===button));deepAudit?renderDeepIdeas(button.dataset.contentTab):renderContentPlan(saved(),button.dataset.contentTab)});
$("#checkoutButton").onclick=()=>{const url=window.MARKETIZO_STRIPE_CHECKOUT_URL;if(url){location.href=url;return}location.href="thank-you.html?demo=1"};
if(new URLSearchParams(location.search).get("dashboard")==="1"){const d=saved(),profiles=JSON.parse(localStorage.getItem("marketizoPublicProfiles")||"[]");deepAudit=JSON.parse(localStorage.getItem("marketizoDeepAudit")||"null");deepAudit?renderDeepAudit(d,deepAudit):render(d,profiles);show("dashboard")}
