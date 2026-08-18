const $=s=>document.querySelector(s),$$=s=>document.querySelectorAll(s);let step=1;
const show=id=>{["landing","wizard","analyzing","preview","dashboard"].forEach(x=>$("#"+x).classList.add("hidden"));$("#"+id).classList.remove("hidden");window.scrollTo({top:0,behavior:"smooth"})};
function setStep(n){step=n;$$(".step").forEach(x=>x.classList.toggle("active",+x.dataset.step===n));$("#stepText").textContent=`Korak ${n} od 3`;$("#progressBar").style.width=`${n*33.33}%`}
const saved=()=>JSON.parse(localStorage.getItem("marketizoAudit")||"{}");
const beauty=d=>/beauty|salon|kozmet|estet|laser|lice|kož|nokt|frizer|šmink|obrve|trepavic/i.test(`${d.business||""} ${d.offer||""}`);
function analysis(d){
 const biz=d.business||"tvoj biznis",offer=d.offer||"glavnu uslugu",aud=d.audience||"idealne klijente",city=d.location||"tvom gradu";
 if(beauty(d))return{
  summary:`Za ${biz.toLowerCase()} u gradu ${city}, lep profil nije dovoljan. Klijent mora da vidi osobu kojoj će verovati, realne rezultate i da razume zašto je ${offer.toLowerCase()} pravi izbor baš za nju.`,
  strength:"Vizuelno već ostavljaš uredan i profesionalan utisak",
  issue:"Profil pokazuje uslugu, ali još ne gradi dovoljno poverenja u osobu iza nje",
  reason:"Kod beauty usluga ljudi ne kupuju samo tretman. Kupuju sigurnost, stručnost i osećaj da će biti u dobrim rukama.",
  scores:[["Prvi utisak",72,"Profil izgleda uredno, ali nije odmah jasno po čemu si drugačija."],["Poverenje",43,"Premalo se vidi lice stručne osobe, njen način rada i objašnjenje postupka."],["Sadržaj",48,"Rezultati postoje, ali sadržaj ne vodi osobu od problema do željenog ishoda."],["Ponuda",35,`${offer} treba predstaviti kroz rezultat, kome je namenjen i zašto vredi.`],["Put do upita",29,"Za skuplju uslugu direktna prodaja u poruci stvara otpor; potreban je topliji prvi kontakt."]],
  priorities:[["Pojavi se lično u kratkim videima",`Snimi sebe kako jednostavno objašnjavaš problem koji rešava ${offer}. Kod beauty usluga klijent prvo bira osobu kojoj veruje, pa tek onda tretman.`],["Pokaži stvarne rezultate pre i posle","Dodaj kontekst: sa čim je klijent došao, šta je urađeno i nakon koliko vremena. Fotografija bez priče izgleda kao reklama; objašnjen rezultat gradi poverenje."],["Svakog dana koristi priče za zagrevanje publike",`Pokaži deo radnog dana, pripremu, higijenu i odgovore na pitanja. Tako ${aud.toLowerCase()} imaju osećaj da te već poznaju pre nego što se jave.`],["Preoblikuj ponudu oko željenog rezultata",`Objasni kome je ${offer} namenjen, koji problem rešava, šta paket uključuje i kakvu promenu klijent može realno da očekuje.`],["Uvedi topliji put do zakazivanja","Za skuplju uslugu nemoj odmah slati cenu i termin. Pozovi osobu da odgovori na nekoliko pitanja ili zakaže kratku procenu."]],
  ideas:[`Video: „Ako razmišljaš o ${offer.toLowerCase()}, prvo proveri ove 3 stvari“ — govoriš direktno u kameru.`,`Pre i posle rezultat klijentkinje iz grada ${city}, uz objašnjenje šta je urađeno i zašto.`,"Kratak snimak celog dolaska: konsultacija, priprema i deo tretmana.","„Najčešći strah pre tretmana je…“ — odgovori smireno i pokaži kako brineš o klijentu.","Priča klijentkinje: šta joj je smetalo pre i kako se oseća sada.",`Kome ${offer.toLowerCase()} nije namenjen i zašto ponekad kažeš „ne“ klijentu.`,"Serija priča: problem, rezultat i tek onda poziv za procenu.",`„Šta dobijate u paketu“ — objasni svaki korak i vrednost ${offer.toLowerCase()}.`,"Iza scene: priprema prostora i opreme uz objašnjenje higijenskih standarda.",`Lokalni video za ${city}: odgovori na pitanje žene koja prvi put dolazi.`]
 };
 return{
  summary:`Za ${biz.toLowerCase()} u gradu ${city}, profil mora brzo da objasni kome pomažeš, koji rezultat nudiš i zašto neko treba da izabere baš tebe.`,strength:"Profil ostavlja uredan prvi utisak",issue:"Vrednost ponude i razlog za izbor nisu dovoljno konkretni",reason:`Klijent vidi šta radiš, ali ne razume dovoljno brzo zašto mu je ${offer.toLowerCase()} potreban baš sada.`,
  scores:[["Prvi utisak",68,"Profil deluje uredno, ali glavna poruka može biti preciznija."],["Poverenje",46,"Potrebno je više stvarnih dokaza, iskustava i objašnjenja procesa."],["Sadržaj",49,"Objave informišu, ali retko vode ka jasnom sledećem koraku."],["Ponuda",37,`${offer} mora jasnije da poveže problem, rezultat i vrednost.`],["Put do upita",32,"Kontakt postoji, ali put od interesovanja do razgovora nije dovoljno prirodan."]],
  priorities:[["Jasno reci kome pomažeš i sa kojim rezultatom",`U prvoj rečenici profila poveži ${biz.toLowerCase()}, ${aud.toLowerCase()} i rezultat koji žele.`],["Pretvori ponudu u jasan ishod",`Objasni šta ${offer.toLowerCase()} menja za klijenta, šta uključuje i zbog čega vredi.`],["Pokaži dokaze, ne samo tvrdnje","Objavi konkretne rezultate, izjave klijenata i način na koji dolaziš do rezultata."],["Rešavaj stvarne dileme",`Odgovaraj na pitanja koja ${aud.toLowerCase()} imaju neposredno pre kupovine.`],["Olakšaj prvi razgovor","Umesto hladne prodaje, ponudi procenu, jednostavno pitanje ili kratku konsultaciju."]],
  ideas:[`3 greške koje ${aud.toLowerCase()} prave pre nego što izaberu ${offer.toLowerCase()}.`,`Studija slučaja iz grada ${city}: problem, proces i rezultat.`,`Video: kome ${offer.toLowerCase()} jeste, a kome nije namenjen.`,"Najčešće pitanje pre kupovine — iskren odgovor bez prodajnog tona.","Pokaži proces od prvog razgovora do rezultata.","Objasni od čega zavisi cena i šta klijent stvarno dobija.","Iskustvo jednog klijenta ispričano njegovim rečima.","Iza scene: detalj koji pokazuje standard tvog rada.","Mit iz tvoje industrije koji vodi do pogrešne odluke.",`Lokalna objava za ${city} sa pozivom na kratak prvi razgovor.`]
 };
}
function render(d){const r=analysis(d);$("#previewSummary").textContent=r.summary;$("#previewStrength").textContent=r.strength;$("#previewIssue").textContent=r.issue;$("#previewIssueReason").textContent=r.reason;$("#customerName").textContent=(d.name||"Dobro došli").split(" ")[0];$("#dashboardConclusion").textContent=beauty(d)?"Profil izgleda lepo, ali mora više da pokaže osobu, rezultat i sigurnost.":"Profil mora brže da objasni vrednost ponude i prirodan sledeći korak.";$("#dashboardReason").textContent=beauty(d)?"Kod beauty usluga klijent prvo mora da stekne poverenje u osobu koja radi tretman. Zato su lični video, objašnjeni rezultati pre i posle, svakodnevne priče i topliji razgovor važniji od još jedne prodajne objave.":"Klijent mora jasno da razume kome pomažeš, koji rezultat nudiš i zašto treba da ti se javi baš sada.";$("#scoreGrid").innerHTML=r.scores.map(([n,v,why])=>`<article><span>${n}</span><strong>${v}<small>/100</small></strong><i><b style="width:${v}%"></b></i><p>${why}</p></article>`).join("");$("#priorities").innerHTML=r.priorities.map(([t,w],i)=>`<article><span>${i+1}</span><div><strong>${t}</strong><p>${w}</p></div><b class="impact">VISOK UTICAJ</b></article>`).join("");$("#ideas").innerHTML=r.ideas.map((x,i)=>`<article><span>${String(i+1).padStart(2,"0")}</span>${x}</article>`).join("")}
$$("[data-start]").forEach(b=>b.onclick=()=>show("wizard"));
$$(".next").forEach(b=>b.onclick=()=>{if(step===1&&!["instagram","facebook","tiktok"].some(n=>$('[name="'+n+'"]').value.trim())){$("#socialError").textContent="Dodaj link ka najmanje jednoj društvenoj mreži.";return}const active=$('.step[data-step="'+step+'"]');if(![...active.querySelectorAll("[required]")].every(i=>i.reportValidity()))return;$("#socialError").textContent="";setStep(step+1)});
$$(".back").forEach(b=>b.onclick=()=>setStep(step-1));
const networkLabel={instagram:"Instagram",facebook:"Facebook",tiktok:"TikTok"};
function displayProfile(profile){
 $("#activeNetwork").textContent=networkLabel[profile.platform]||profile.platform;
 $("#scanHandle").textContent="@"+profile.username;
 $("#scanDisplayName").textContent=profile.displayName;
 $("#scanBio").textContent=profile.bio||"Opis profila nije javno dostupan";
 const avatar=$("#scanAvatar");avatar.src=profile.avatar||"";avatar.classList.toggle("empty",!profile.avatar);
 $("#feedGrid").innerHTML=profile.posts.map((post,index)=>`<article class="real-post ${post.video?"video":""}" style="--order:${index}"><img src="${post.image}" alt="Javna objava profila ${profile.username}" loading="eager"><span>${post.video?"▶":""}</span><small>${post.caption||"Javna objava"}</small></article>`).join("");
 $("#scanLine").classList.remove("hidden");
}
async function loadPublicProfiles(data){
 const profiles={instagram:data.instagram,facebook:data.facebook,tiktok:data.tiktok};
 $("#networkTabs").innerHTML=Object.entries(profiles).filter(([,url])=>url).map(([name])=>`<span data-network="${name}">${networkLabel[name]}</span>`).join("");
 const response=await fetch("/api/profile-preview",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({profiles})});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(payload.error||"Javni profili trenutno nisu dostupni.");
 localStorage.setItem("marketizoPublicProfiles",JSON.stringify(payload.profiles));
 return payload.profiles;
}
async function captureLead(data){
 try{
  const response=await fetch("/api/lead",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data),keepalive:true});
  if(!response.ok)console.warn("Lead nije poslat u CRM.");
 }catch(error){console.warn("CRM trenutno nije dostupan.",error)}
}
$("#auditForm").onsubmit=async e=>{
 e.preventDefault();const d=Object.fromEntries(new FormData(e.target));localStorage.setItem("marketizoAudit",JSON.stringify(d));void captureLead(d);render(d);show("analyzing");
 let publicProfiles=[];
 try{publicProfiles=await loadPublicProfiles(d);displayProfile(publicProfiles[0]);$("#analysisStatus").textContent="Učitani su stvarni javni podaci. Pregledamo objave redom."}
 catch(error){$("#feedGrid").innerHTML=`<div class="feed-unavailable"><strong>Profil nije automatski učitan</strong><p>${error.message}</p><small>Nećemo prikazivati izmišljene objave. U produkciji korisniku nudimo da doda screenshotove.</small></div>`;$("#analysisStatus").textContent="Nastavljamo analizu na osnovu informacija o biznisu."}
 const phases=["Čitamo opis profila i proveravamo prvi utisak","Pregledamo stvarne fotografije, objave i video covere","Tražimo dokaze koji grade poverenje u ponudu","Prolazimo put koji klijent ima pre nego što pošalje upit",`Pripremamo preporuke za ${d.business} u gradu ${d.location}`];
 let p=0,checks=$$("#scanChecks li");const timer=setInterval(()=>{checks[p]?.classList.remove("active");checks[p]?.classList.add("done");p++;if(publicProfiles.length&&p<publicProfiles.length){displayProfile(publicProfiles[p]);$$("#networkTabs span").forEach((tab,index)=>tab.classList.toggle("active",index===p))}const percent=Math.min(100,8+p*18.4);$("#analysisBar").style.width=percent+"%";$("#analysisPercent").textContent=Math.round(percent)+"%";if(p<phases.length){checks[p].classList.add("active");$("#analysisStatus").textContent=phases[p]}else{clearInterval(timer);$("#analysisStatus").textContent="Analiza je spremna";setTimeout(()=>show("preview"),900)}},2100)
};
$("#checkoutButton").onclick=()=>{const url=window.MARKETIZO_STRIPE_CHECKOUT_URL;if(url){location.href=url;return}location.href="thank-you.html?demo=1"};
if(new URLSearchParams(location.search).get("dashboard")==="1"){const d=saved();render(d);show("dashboard")}
