# Politikverkstan 1.9–2.0 – ärendeakt och beslutsspårning

## 1.9: Källstyrd ärendeakt

Ärendeakten har ett strukturerat källregister med högst 12 poster. Varje post innehåller titel, typ, HTTPS-länk, dokumentreferens och en tydlig uppgift om användaren själv kontrollerat källan. Offentliga dokument för ett sammanträde med samma nämnd och datum kan väljas som förslag, men måste manuellt kopplas till rätt ärende. Ingen automatisk PDF-import och ingen gissad ämneskoppling.

En granskningslista med högst 15 poster klassificerar varje iakttagelse som **faktafel**, **motsägelse**, **underlagsbrist**, **risk** eller **politisk invändning**. Belägg, prioritet (kritisk, betydande, mindre), konsekvenser, förslag till åtgärd och om frågan är öppen eller åtgärdad hålls åtskilda. En registrerad bedömning är inte en verifierad sakuppgift.

## 2.0: Beslut, ansvar och uppföljning

Kommunens faktiska beslut lagras separat från internt politiskt ställningstagande. Beslutsposten innehåller text, datum, protokollsparagraf, HTTPS-källa och `not_checked` eller `source_checked`. En användare kan bara välja `source_checked` när alla obligatoriska uppgifter finns och användaren uttryckligen bekräftar sin avstämning. Detta är ingen automatisk kommunal protokollverifiering.

Den redan existerande uppföljningen för ärenden innehåller ansvarig, förfallodatum, uppgift och status. Från beslutsposten går det att öppna formuläret för en ny uppföljning. Arbetsöversikten lyfter upp ärenden som har intern beslutsstatus men inte ett manuellt kontrollerat protokoll.

## Säkerhet och begränsningar

Både register och beslutsuppgifter lagras i ärendets befintliga behörighetsstyrda `content_json`; ingen ny tabell, ingen ny roll och ingen D1-migrering. Befintlig revision, rättigheter för ägare/utsedd ansvarig och möjligheten att dela ett ärende gäller även de nya uppgifterna. Privata anteckningar och ägarens privata filkopplingar hålls separata. Gamla klienter utan de nya attributen raderar dem inte vid vanliga uppdateringar.

Sökning i PDF-innehåll, faktisk validering av diarienummer mot kommunens ärendesystem och automatisk kontroll av justerat protokoll ingår inte. CI kan inte verifiera D1-backup, verkliga användarrättigheter i Cloudflare eller manuella påståenden om beslut.
