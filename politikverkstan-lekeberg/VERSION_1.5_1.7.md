# Politikverkstan 1.5–1.7 — leverans och verifiering

## 1.5 Offentliga sammanträden
- GitHub läser de fyra tillåtna MeetingPlus-källorna och försöker hämta offentliga dagordningsrubriker och källänkar från respektive mötessida två gånger per dygn.
- Endast uttryckligt numrerade HTML-rubriker accepteras som dagordningspunkter. Om rubriker inte kan identifieras säkert visas i stället varning och originalkälla. MeetingPlus kan ändra HTML-struktur.
- Offentliga dokument lagras **endast som namn och original-URL**. Inga dokumentfiler, personliga anteckningar eller privat material importeras.
- Kalendern visar källdiagnostik, tidpunkt för upptäckt förändring, originalhandlingar och möjlighet att uttryckligen starta en privat mötesförberedelse från vald identifierad punkt.
- Den initiala verkliga hämtningen den 23 oktober identifierade dokumentlänkar men **inga numrerade rubriker**. Dagordningsstödet är alltså ännu inte fullt integrerat mot kommunens faktiska HTML och måste verifieras mot MeetingPlus innan det används som komplett kallelse.

## 1.6 Ärendeflöde och beslutsverifiering
- Ägare kan skapa ett **privat** ärende direkt från en punkt i **eget privat** sammanträde. Det skapar inte ett nytt gruppdelat ärende.
- Källor, beslut och uppföljningar hålls åtskilda; inget statusfält antas vara ett verifierat kommunalt beslut.
- Internt beslutsreferat utan originalkälla eller beslutsstatus utan faktiskt beslut markeras för komplettering.
- Redan befintliga behörigheter och personliga anteckningar används oförändrade.

## 1.7 Skrivverkstad
- **Motion**, **interpellation**, **enkel fråga**, **ändringsyrkande**, **skriftlig reservation**, **särskilt yttrande** och **nämndinitiativ**.
- Typen sparas i befintlig behörighetsstyrd JSON med fälten `doc_type`, `recipient` och `forum`. Ingen ny tabell eller D1-migrering.
- Skrivverkstaden visar frågor i stället för att-satser för frågor/interpellationer; för reservationer och särskilda yttranden används löptext. Typ, mottagare, instans och ärendereferens kommer med i PDF.
- PDF är ett redigerbart manus som blir utskriven handling; inte ett automatiskt justerat protokoll. Kontrollera Lekebergs gällande fullmäktigearbetsordning, nämndreglementen, inlämningsfrister och dokumentformalia. En skrivelse är inte inlämnad eller förankrad enbart för att den sparats.
- Äldre motioner utan `doc_type` tolkas som motion.

## Drift och beslutskriterier
- Bygg- och enhetstester, webbläsarregression och Cloudflare Builds kontrolleras per commit i GitHub.
- Automatisk befordran till `production` ska ske **endast vid helt grönt kvalitetsflöde**. Ett separat Cloudflare-fel från `production` kan fortfarande kräva inställningsändringar i Cloudflare-kontot.
- Ingen verifiering av skarpa D1-data, åtkomstpolicy, backup/återläsning eller inlämningsformalia görs av CI.
