# Politikverkstan 0.5.3

- Ny formell motionsmall med lokalt sidhuvud, Times-brödtext, A4-sidbrytningar och sidnummer.
- Administratören kan ladda upp en egen, godkänd PNG-logotyp som används i den SD-profilerade mallen. Ingen tredjepartslogotyp inkluderas.
- PDF-generatorn hanterar bytekorrekta PDF-objekt och valfri JPEG-inbäddning av uppladdad PNG, utan extern PDF-tjänst.
- Redigerbara visningsnamn för alla användare, även administratörer, utan att ändra e-post eller behörighet.
- Första administratören anger visningsnamn vid aktivering.
- Fristående D1-migrering 0005_branding.sql skapar en enda ny tabell.

## Begränsningar
PDF använder Times-Roman och Helvetica, inte ett verifierat officiellt SD-typsnitt. Vissa specialtecken utanför WinAnsi kan ersättas i PDF-exporten; lagrad dokumenttext ändras aldrig. Förhandsgranskningen är stilmässigt motsvarande men inte sidbrytningsidentisk. Officiellt pressmaterial kan ha användningsrestriktioner och har därför inte automatiskt paketerats.
