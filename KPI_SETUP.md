# KPI upitnici

## Pre objave

1. Za objavu ručnog režima u Vercel projektu koji hostuje `app.marketizo.com` dodati `KPI_ADMIN_PASSWORD` (nova jaka lozinka za KPI administratorski ekran). `KPI_SESSION_SECRET` je preporučen zaseban nasumičan tajni ključ; bez njega se za potpisivanje sesije koristi postojeći `SUPABASE_SERVICE_ROLE_KEY`. Nikad ne unositi vrednosti u Git.
2. `CLICKUP_API_TOKEN` je opciono podešavanje za kasnije automatsko čitanje dokumenta „Raspodela klijenata“. Ručno povezivanje ljudi i klijenata radi bez njega.
3. Ponovo deployovati iz ove grane ili nakon spajanja u `main`.
4. Otvoriti `/kpi.html`, prijaviti se, izabrati klijenta i ručno sačuvati tim. Kada se kasnije doda ClickUp token, status iznad klijenta mora reći da je raspodela učitana uživo.
5. Napraviti probni link za internog klijenta, otvoriti `/feedback.html` u privatnom prozoru, poslati probni odgovor i proveriti da se vidi u KPI filtrima. Ukloniti probne podatke iz KPI reda tek nakon zasebnog backupa; aplikacija nema dugme za brisanje.

## Pravilo podataka

KPI podaci su u posebnom Supabase redu `marketizo-kpi-v1`, izvan javnog `/api/state` odgovora. Link sadrži jednokratni slučajni token, a u bazi se čuva samo njegov SHA-256 otisak. Upitnik i raspodela se kopiraju u poziv pri pravljenju linka. Izmene pitanja i ClickUp raspodele važe za nove linkove. Dnevni `/api/backup` sada uključuje i KPI red u obe vrste kopija.
Pregledni Vercel deploy koristi zaseban red `marketizo-kpi-preview-v1`, pa probni upitnici ne ulaze u produkcione KPI rezultate.

ClickUp tabela se čita pri otvaranju KPI ekrana i pravljenju linka. Raspodela se ne čuva u javnom repozitorijumu. Ako ClickUp nije dostupan, link se ne može napraviti dok se tim ne sačuva ručno. Klijenti sa nejasnim imenom se prikazuju za povezivanje sa postojećim CRM klijentom; novi CRM klijent se ne pravi automatski.
