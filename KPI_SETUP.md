# KPI upitnici

## Pre objave

1. U Vercel projektu koji hostuje `app.marketizo.com` dodati environment variables za Production: `CLICKUP_API_TOKEN` (ClickUp token sa pristupom dokumentu „Raspodela klijenata“) i `KPI_ADMIN_PASSWORD` (nova jaka lozinka za KPI administratorski ekran). `KPI_SESSION_SECRET` je preporučen zaseban nasumičan tajni ključ; bez njega se za potpisivanje sesije koristi postojeći `SUPABASE_SERVICE_ROLE_KEY`. Nikad ne unositi vrednosti u Git.
2. Ponovo deployovati iz ove grane ili nakon spajanja u `main`.
3. Otvoriti `/kpi.html`, prijaviti se, izabrati klijenta i proveriti članove tima. Status iznad klijenta mora reći da je ClickUp raspodela učitana uživo.
4. Napraviti probni link za internog klijenta, otvoriti `/feedback.html` u privatnom prozoru, poslati probni odgovor i proveriti da se vidi u KPI filtrima. Ukloniti probne podatke iz KPI reda tek nakon zasebnog backupa; aplikacija nema dugme za brisanje.

## Pravilo podataka

KPI podaci su u posebnom Supabase redu `marketizo-kpi-v1`, izvan javnog `/api/state` odgovora. Link sadrži jednokratni slučajni token, a u bazi se čuva samo njegov SHA-256 otisak. Upitnik i raspodela se kopiraju u poziv pri pravljenju linka. Izmene pitanja i ClickUp raspodele važe za nove linkove. Dnevni `/api/backup` sada uključuje i KPI red u obe vrste kopija.

ClickUp tabela se čita pri otvaranju KPI ekrana i pravljenju linka. Raspodela se ne čuva u javnom repozitorijumu. Ako ClickUp nije dostupan, link se ne može napraviti dok se tim ne sačuva ručno. Klijenti sa nejasnim imenom se prikazuju za povezivanje sa postojećim CRM klijentom; novi CRM klijent se ne pravi automatski.
