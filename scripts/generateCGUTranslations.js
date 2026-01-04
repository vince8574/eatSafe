const fs = require('fs');
const path = require('path');

// Version franÃ§aise simplifiÃ©e pour mobile (base)
const cguFR = `# Conditions GÃ©nÃ©rales d'Utilisation - Numeline

*DerniÃ¨re mise Ã  jour : 13 dÃ©cembre 2025*

**IMPORTANT** : En tÃ©lÃ©chargeant, installant ou utilisant l'application Numeline, vous acceptez sans rÃ©serve les prÃ©sentes Conditions GÃ©nÃ©rales d'Utilisation.

Cette application et ses fonctionnalitÃ©s sont protÃ©gÃ©es par le droit d'auteur et l'antÃ©rioritÃ©.
This application and its functionalities are protected by copyright and prior art.

---

## 1. Service

Numeline est une application mobile gratuite permettant de scanner des produits alimentaires et vÃ©rifier s'ils font l'objet d'un rappel.

## 2. Fonctionnement

- Scanner via l'appareil photo
- Reconnaissance automatique (marque et lot)
- VÃ©rification des rappels
- Notifications en cas de rappel
- Historique local

## 3. PrÃ©cision OCR

La reconnaissance de texte peut comporter des erreurs. Vous devez toujours vÃ©rifier visuellement les informations dÃ©tectÃ©es.

## 4. ResponsabilitÃ©

L'Ã©diteur ne garantit pas la prÃ©cision des informations. En cas de rappel, consultez les sources officielles.

## 5. DonnÃ©es

Toutes vos donnÃ©es sont stockÃ©es localement sur votre appareil. Aucune photo n'est envoyÃ©e sur un serveur.

## 6. Contact

Email : legal@eatsok.app
`;

// Traductions
const translations = {
  en: {
    title: "Terms of Service - Numeline",
    updated: "Last updated: December 13, 2025",
    important: "**IMPORTANT**: By downloading, installing or using the Numeline application, you unconditionally accept these Terms of Service.",
    protection: "This application and its functionalities are protected by copyright and prior art.",
    service: "Service",
    serviceDesc: "Numeline is a free mobile application that allows you to scan food products and check if they are subject to a recall.",
    features: "Features",
    featuresList: `- Scan via camera
- Automatic recognition (brand and lot)
- Recall verification
- Recall notifications
- Local history`,
    ocr: "OCR Accuracy",
    ocrDesc: "Text recognition may contain errors. You must always visually verify the detected information.",
    liability: "Liability",
    liabilityDesc: "The publisher does not guarantee the accuracy of information. In case of recall, consult official sources.",
    data: "Data",
    dataDesc: "All your data is stored locally on your device. No photo is sent to a server.",
    contact: "Contact"
  },
  es: {
    title: "Condiciones de Uso - Numeline",
    updated: "Ãšltima actualizaciÃ³n: 13 de diciembre de 2025",
    important: "**IMPORTANTE**: Al descargar, instalar o utilizar la aplicaciÃ³n Numeline, acepta incondicionalmente estas Condiciones de Uso.",
    protection: "Esta aplicaciÃ³n y sus funcionalidades estÃ¡n protegidas por derechos de autor y anterioridad.",
    service: "Servicio",
    serviceDesc: "Numeline es una aplicaciÃ³n mÃ³vil gratuita que le permite escanear productos alimenticios y verificar si estÃ¡n sujetos a una retirada.",
    features: "Funcionalidades",
    featuresList: `- Escanear con la cÃ¡mara
- Reconocimiento automÃ¡tico (marca y lote)
- VerificaciÃ³n de retiradas
- Notificaciones de retirada
- Historial local`,
    ocr: "PrecisiÃ³n OCR",
    ocrDesc: "El reconocimiento de texto puede contener errores. Siempre debe verificar visualmente la informaciÃ³n detectada.",
    liability: "Responsabilidad",
    liabilityDesc: "El editor no garantiza la exactitud de la informaciÃ³n. En caso de retirada, consulte las fuentes oficiales.",
    data: "Datos",
    dataDesc: "Todos sus datos se almacenan localmente en su dispositivo. Ninguna foto se envÃ­a a un servidor.",
    contact: "Contacto"
  },
  de: {
    title: "Nutzungsbedingungen - Numeline",
    updated: "Letzte Aktualisierung: 13. Dezember 2025",
    important: "**WICHTIG**: Durch Herunterladen, Installieren oder Verwenden der Numeline-Anwendung akzeptieren Sie bedingungslos diese Nutzungsbedingungen.",
    protection: "Diese Anwendung und ihre FunktionalitÃ¤ten sind durch Urheberrecht und PrioritÃ¤t geschÃ¼tzt.",
    service: "Dienst",
    serviceDesc: "Numeline ist eine kostenlose mobile Anwendung, mit der Sie Lebensmittelprodukte scannen und Ã¼berprÃ¼fen kÃ¶nnen, ob sie einem RÃ¼ckruf unterliegen.",
    features: "Funktionen",
    featuresList: `- Scannen mit der Kamera
- Automatische Erkennung (Marke und Charge)
- RÃ¼ckrufÃ¼berprÃ¼fung
- RÃ¼ckrufbenachrichtigungen
- Lokaler Verlauf`,
    ocr: "OCR-Genauigkeit",
    ocrDesc: "Die Texterkennung kann Fehler enthalten. Sie mÃ¼ssen die erkannten Informationen immer visuell Ã¼berprÃ¼fen.",
    liability: "Haftung",
    liabilityDesc: "Der Herausgeber garantiert nicht die Richtigkeit der Informationen. Im Falle eines RÃ¼ckrufs konsultieren Sie offizielle Quellen.",
    data: "Daten",
    dataDesc: "Alle Ihre Daten werden lokal auf Ihrem GerÃ¤t gespeichert. Kein Foto wird an einen Server gesendet.",
    contact: "Kontakt"
  },
  it: {
    title: "Condizioni d'Uso - Numeline",
    updated: "Ultimo aggiornamento: 13 dicembre 2025",
    important: "**IMPORTANTE**: Scaricando, installando o utilizzando l'applicazione Numeline, accetti incondizionatamente queste Condizioni d'Uso.",
    protection: "Questa applicazione e le sue funzionalitÃ  sono protette da copyright e anterioritÃ .",
    service: "Servizio",
    serviceDesc: "Numeline Ã¨ un'applicazione mobile gratuita che ti permette di scansionare prodotti alimentari e verificare se sono soggetti a richiamo.",
    features: "FunzionalitÃ ",
    featuresList: `- Scansione tramite fotocamera
- Riconoscimento automatico (marca e lotto)
- Verifica dei richiami
- Notifiche di richiamo
- Cronologia locale`,
    ocr: "Precisione OCR",
    ocrDesc: "Il riconoscimento del testo puÃ² contenere errori. Devi sempre verificare visivamente le informazioni rilevate.",
    liability: "ResponsabilitÃ ",
    liabilityDesc: "L'editore non garantisce l'accuratezza delle informazioni. In caso di richiamo, consulta le fonti ufficiali.",
    data: "Dati",
    dataDesc: "Tutti i tuoi dati sono memorizzati localmente sul tuo dispositivo. Nessuna foto viene inviata a un server.",
    contact: "Contatto"
  },
  pt: {
    title: "Termos de Uso - Numeline",
    updated: "Ãšltima atualizaÃ§Ã£o: 13 de dezembro de 2025",
    important: "**IMPORTANTE**: Ao baixar, instalar ou usar o aplicativo Numeline, vocÃª aceita incondicionalmente estes Termos de Uso.",
    protection: "Esta aplicaÃ§Ã£o e suas funcionalidades estÃ£o protegidas por direitos autorais e anterioridade.",
    service: "ServiÃ§o",
    serviceDesc: "Numeline Ã© um aplicativo mÃ³vel gratuito que permite escanear produtos alimentÃ­cios e verificar se estÃ£o sujeitos a recall.",
    features: "Funcionalidades",
    featuresList: `- Digitalizar com cÃ¢mera
- Reconhecimento automÃ¡tico (marca e lote)
- VerificaÃ§Ã£o de recalls
- NotificaÃ§Ãµes de recall
- HistÃ³rico local`,
    ocr: "PrecisÃ£o OCR",
    ocrDesc: "O reconhecimento de texto pode conter erros. VocÃª deve sempre verificar visualmente as informaÃ§Ãµes detectadas.",
    liability: "Responsabilidade",
    liabilityDesc: "O editor nÃ£o garante a precisÃ£o das informaÃ§Ãµes. Em caso de recall, consulte fontes oficiais.",
    data: "Dados",
    dataDesc: "Todos os seus dados sÃ£o armazenados localmente em seu dispositivo. Nenhuma foto Ã© enviada para um servidor.",
    contact: "Contato"
  },
  ar: {
    title: "Ø´Ø±ÙˆØ· Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… - Numeline",
    updated: "Ø¢Ø®Ø± ØªØ­Ø¯ÙŠØ«: 13 Ø¯ÙŠØ³Ù…Ø¨Ø± 2025",
    important: "**Ù…Ù‡Ù…**: Ø¨ØªÙ†Ø²ÙŠÙ„ Ø£Ùˆ ØªØ«Ø¨ÙŠØª Ø£Ùˆ Ø§Ø³ØªØ®Ø¯Ø§Ù… ØªØ·Ø¨ÙŠÙ‚ NumelineØŒ ÙØ¥Ù†Ùƒ ØªÙˆØ§ÙÙ‚ Ø¯ÙˆÙ† Ù‚ÙŠØ¯ Ø£Ùˆ Ø´Ø±Ø· Ø¹Ù„Ù‰ Ø´Ø±ÙˆØ· Ø§Ù„Ø§Ø³ØªØ®Ø¯Ø§Ù… Ù‡Ø°Ù‡.",
    protection: "Ù‡Ø°Ø§ Ø§Ù„ØªØ·Ø¨ÙŠÙ‚ ÙˆÙˆØ¸Ø§Ø¦ÙÙ‡ Ù…Ø­Ù…ÙŠØ© Ø¨Ù…ÙˆØ¬Ø¨ Ø­Ù‚ÙˆÙ‚ Ø§Ù„Ù†Ø´Ø± ÙˆØ§Ù„Ø£Ø³Ø¨Ù‚ÙŠØ©.",
    service: "Ø§Ù„Ø®Ø¯Ù…Ø©",
    serviceDesc: "Numeline Ù‡Ùˆ ØªØ·Ø¨ÙŠÙ‚ Ø¬ÙˆØ§Ù„ Ù…Ø¬Ø§Ù†ÙŠ ÙŠØªÙŠØ­ Ù„Ùƒ Ù…Ø³Ø­ Ø§Ù„Ù…Ù†ØªØ¬Ø§Øª Ø§Ù„ØºØ°Ø§Ø¦ÙŠØ© ÙˆØ§Ù„ØªØ­Ù‚Ù‚ Ù…Ù…Ø§ Ø¥Ø°Ø§ ÙƒØ§Ù†Øª Ø®Ø§Ø¶Ø¹Ø© Ù„Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡.",
    features: "Ø§Ù„Ù…ÙŠØ²Ø§Øª",
    featuresList: `- Ø§Ù„Ù…Ø³Ø­ Ø¹Ø¨Ø± Ø§Ù„ÙƒØ§Ù…ÙŠØ±Ø§
- Ø§Ù„ØªØ¹Ø±Ù Ø§Ù„ØªÙ„Ù‚Ø§Ø¦ÙŠ (Ø§Ù„Ø¹Ù„Ø§Ù…Ø© Ø§Ù„ØªØ¬Ø§Ø±ÙŠØ© ÙˆØ§Ù„Ø¯ÙØ¹Ø©)
- Ø§Ù„ØªØ­Ù‚Ù‚ Ù…Ù† Ø¹Ù…Ù„ÙŠØ§Øª Ø§Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡
- Ø¥Ø´Ø¹Ø§Ø±Ø§Øª Ø§Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡
- Ø§Ù„Ø³Ø¬Ù„ Ø§Ù„Ù…Ø­Ù„ÙŠ`,
    ocr: "Ø¯Ù‚Ø© Ø§Ù„ØªØ¹Ø±Ù Ø§Ù„Ø¶ÙˆØ¦ÙŠ",
    ocrDesc: "Ù‚Ø¯ ÙŠØ­ØªÙˆÙŠ Ø§Ù„ØªØ¹Ø±Ù Ø¹Ù„Ù‰ Ø§Ù„Ù†Øµ Ø¹Ù„Ù‰ Ø£Ø®Ø·Ø§Ø¡. ÙŠØ¬Ø¨ Ø¹Ù„ÙŠÙƒ Ø¯Ø§Ø¦Ù…Ù‹Ø§ Ø§Ù„ØªØ­Ù‚Ù‚ Ø¨ØµØ±ÙŠÙ‹Ø§ Ù…Ù† Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª Ø§Ù„Ù…ÙƒØªØ´ÙØ©.",
    liability: "Ø§Ù„Ù…Ø³Ø¤ÙˆÙ„ÙŠØ©",
    liabilityDesc: "Ø§Ù„Ù†Ø§Ø´Ø± Ù„Ø§ ÙŠØ¶Ù…Ù† Ø¯Ù‚Ø© Ø§Ù„Ù…Ø¹Ù„ÙˆÙ…Ø§Øª. ÙÙŠ Ø­Ø§Ù„Ø© Ø§Ù„Ø§Ø³ØªØ¯Ø¹Ø§Ø¡ØŒ Ø§Ø³ØªØ´Ø± Ø§Ù„Ù…ØµØ§Ø¯Ø± Ø§Ù„Ø±Ø³Ù…ÙŠØ©.",
    data: "Ø§Ù„Ø¨ÙŠØ§Ù†Ø§Øª",
    dataDesc: "ÙŠØªÙ… ØªØ®Ø²ÙŠÙ† Ø¬Ù…ÙŠØ¹ Ø¨ÙŠØ§Ù†Ø§ØªÙƒ Ù…Ø­Ù„ÙŠÙ‹Ø§ Ø¹Ù„Ù‰ Ø¬Ù‡Ø§Ø²Ùƒ. Ù„Ø§ ÙŠØªÙ… Ø¥Ø±Ø³Ø§Ù„ Ø£ÙŠ ØµÙˆØ±Ø© Ø¥Ù„Ù‰ Ø§Ù„Ø®Ø§Ø¯Ù….",
    contact: "Ø§ØªØµÙ„"
  },
  ru: {
    title: "Ð£ÑÐ»Ð¾Ð²Ð¸Ñ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ð½Ð¸Ñ - Numeline",
    updated: "ÐŸÐ¾ÑÐ»ÐµÐ´Ð½ÐµÐµ Ð¾Ð±Ð½Ð¾Ð²Ð»ÐµÐ½Ð¸Ðµ: 13 Ð´ÐµÐºÐ°Ð±Ñ€Ñ 2025",
    important: "**Ð’ÐÐ–ÐÐž**: Ð—Ð°Ð³Ñ€ÑƒÐ¶Ð°Ñ, ÑƒÑÑ‚Ð°Ð½Ð°Ð²Ð»Ð¸Ð²Ð°Ñ Ð¸Ð»Ð¸ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·ÑƒÑ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ Numeline, Ð²Ñ‹ Ð±ÐµÐ·Ð¾Ð³Ð¾Ð²Ð¾Ñ€Ð¾Ñ‡Ð½Ð¾ Ð¿Ñ€Ð¸Ð½Ð¸Ð¼Ð°ÐµÑ‚Ðµ Ð½Ð°ÑÑ‚Ð¾ÑÑ‰Ð¸Ðµ Ð£ÑÐ»Ð¾Ð²Ð¸Ñ Ð¸ÑÐ¿Ð¾Ð»ÑŒÐ·Ð¾Ð²Ð°Ð½Ð¸Ñ.",
    protection: "Ð­Ñ‚Ð¾ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ Ð¸ ÐµÐ³Ð¾ Ñ„ÑƒÐ½ÐºÑ†Ð¸Ð¾Ð½Ð°Ð»ÑŒÐ½Ð¾ÑÑ‚ÑŒ Ð·Ð°Ñ‰Ð¸Ñ‰ÐµÐ½Ñ‹ Ð°Ð²Ñ‚Ð¾Ñ€ÑÐºÐ¸Ð¼ Ð¿Ñ€Ð°Ð²Ð¾Ð¼ Ð¸ Ð¿Ñ€Ð¸Ð¾Ñ€Ð¸Ñ‚ÐµÑ‚Ð¾Ð¼.",
    service: "Ð¡ÐµÑ€Ð²Ð¸Ñ",
    serviceDesc: "Numeline - ÑÑ‚Ð¾ Ð±ÐµÑÐ¿Ð»Ð°Ñ‚Ð½Ð¾Ðµ Ð¼Ð¾Ð±Ð¸Ð»ÑŒÐ½Ð¾Ðµ Ð¿Ñ€Ð¸Ð»Ð¾Ð¶ÐµÐ½Ð¸Ðµ, Ð¿Ð¾Ð·Ð²Ð¾Ð»ÑÑŽÑ‰ÐµÐµ ÑÐºÐ°Ð½Ð¸Ñ€Ð¾Ð²Ð°Ñ‚ÑŒ Ð¿Ñ€Ð¾Ð´ÑƒÐºÑ‚Ñ‹ Ð¿Ð¸Ñ‚Ð°Ð½Ð¸Ñ Ð¸ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÑÑ‚ÑŒ, Ð¿Ð¾Ð´Ð»ÐµÐ¶Ð°Ñ‚ Ð»Ð¸ Ð¾Ð½Ð¸ Ð¾Ñ‚Ð·Ñ‹Ð²Ñƒ.",
    features: "Ð¤ÑƒÐ½ÐºÑ†Ð¸Ð¸",
    featuresList: `- Ð¡ÐºÐ°Ð½Ð¸Ñ€Ð¾Ð²Ð°Ð½Ð¸Ðµ Ñ Ð¿Ð¾Ð¼Ð¾Ñ‰ÑŒÑŽ ÐºÐ°Ð¼ÐµÑ€Ñ‹
- ÐÐ²Ñ‚Ð¾Ð¼Ð°Ñ‚Ð¸Ñ‡ÐµÑÐºÐ¾Ðµ Ñ€Ð°ÑÐ¿Ð¾Ð·Ð½Ð°Ð²Ð°Ð½Ð¸Ðµ (Ð¼Ð°Ñ€ÐºÐ° Ð¸ Ð¿Ð°Ñ€Ñ‚Ð¸Ñ)
- ÐŸÑ€Ð¾Ð²ÐµÑ€ÐºÐ° Ð¾Ñ‚Ð·Ñ‹Ð²Ð¾Ð²
- Ð£Ð²ÐµÐ´Ð¾Ð¼Ð»ÐµÐ½Ð¸Ñ Ð¾Ð± Ð¾Ñ‚Ð·Ñ‹Ð²Ð°Ñ…
- Ð›Ð¾ÐºÐ°Ð»ÑŒÐ½Ð°Ñ Ð¸ÑÑ‚Ð¾Ñ€Ð¸Ñ`,
    ocr: "Ð¢Ð¾Ñ‡Ð½Ð¾ÑÑ‚ÑŒ OCR",
    ocrDesc: "Ð Ð°ÑÐ¿Ð¾Ð·Ð½Ð°Ð²Ð°Ð½Ð¸Ðµ Ñ‚ÐµÐºÑÑ‚Ð° Ð¼Ð¾Ð¶ÐµÑ‚ ÑÐ¾Ð´ÐµÑ€Ð¶Ð°Ñ‚ÑŒ Ð¾ÑˆÐ¸Ð±ÐºÐ¸. Ð’Ñ‹ Ð²ÑÐµÐ³Ð´Ð° Ð´Ð¾Ð»Ð¶Ð½Ñ‹ Ð²Ð¸Ð·ÑƒÐ°Ð»ÑŒÐ½Ð¾ Ð¿Ñ€Ð¾Ð²ÐµÑ€ÑÑ‚ÑŒ Ð¾Ð±Ð½Ð°Ñ€ÑƒÐ¶ÐµÐ½Ð½ÑƒÑŽ Ð¸Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ð¸ÑŽ.",
    liability: "ÐžÑ‚Ð²ÐµÑ‚ÑÑ‚Ð²ÐµÐ½Ð½Ð¾ÑÑ‚ÑŒ",
    liabilityDesc: "Ð˜Ð·Ð´Ð°Ñ‚ÐµÐ»ÑŒ Ð½Ðµ Ð³Ð°Ñ€Ð°Ð½Ñ‚Ð¸Ñ€ÑƒÐµÑ‚ Ñ‚Ð¾Ñ‡Ð½Ð¾ÑÑ‚ÑŒ Ð¸Ð½Ñ„Ð¾Ñ€Ð¼Ð°Ñ†Ð¸Ð¸. Ð’ ÑÐ»ÑƒÑ‡Ð°Ðµ Ð¾Ñ‚Ð·Ñ‹Ð²Ð° Ð¾Ð±Ñ€Ð°Ñ‚Ð¸Ñ‚ÐµÑÑŒ Ðº Ð¾Ñ„Ð¸Ñ†Ð¸Ð°Ð»ÑŒÐ½Ñ‹Ð¼ Ð¸ÑÑ‚Ð¾Ñ‡Ð½Ð¸ÐºÐ°Ð¼.",
    data: "Ð”Ð°Ð½Ð½Ñ‹Ðµ",
    dataDesc: "Ð’ÑÐµ Ð²Ð°ÑˆÐ¸ Ð´Ð°Ð½Ð½Ñ‹Ðµ Ñ…Ñ€Ð°Ð½ÑÑ‚ÑÑ Ð»Ð¾ÐºÐ°Ð»ÑŒÐ½Ð¾ Ð½Ð° Ð²Ð°ÑˆÐµÐ¼ ÑƒÑÑ‚Ñ€Ð¾Ð¹ÑÑ‚Ð²Ðµ. ÐÐ¸ Ð¾Ð´Ð½Ð° Ñ„Ð¾Ñ‚Ð¾Ð³Ñ€Ð°Ñ„Ð¸Ñ Ð½Ðµ Ð¾Ñ‚Ð¿Ñ€Ð°Ð²Ð»ÑÐµÑ‚ÑÑ Ð½Ð° ÑÐµÑ€Ð²ÐµÑ€.",
    contact: "ÐšÐ¾Ð½Ñ‚Ð°ÐºÑ‚"
  },
  zh: {
    title: "ä½¿ç”¨æ¡æ¬¾ - Numeline",
    updated: "æœ€åŽæ›´æ–°ï¼š2025å¹´12æœˆ13æ—¥",
    important: "**é‡è¦**ï¼šä¸‹è½½ã€å®‰è£…æˆ–ä½¿ç”¨ Numeline åº”ç”¨ç¨‹åºå³è¡¨ç¤ºæ‚¨æ— æ¡ä»¶æŽ¥å—æœ¬ä½¿ç”¨æ¡æ¬¾ã€‚",
    protection: "æœ¬åº”ç”¨ç¨‹åºåŠå…¶åŠŸèƒ½å—ç‰ˆæƒå’Œä¼˜å…ˆæƒä¿æŠ¤ã€‚",
    service: "æœåŠ¡",
    serviceDesc: "Numeline æ˜¯ä¸€æ¬¾å…è´¹çš„ç§»åŠ¨åº”ç”¨ç¨‹åºï¼Œå…è®¸æ‚¨æ‰«æé£Ÿå“å¹¶æ£€æŸ¥å®ƒä»¬æ˜¯å¦è¢«å¬å›žã€‚",
    features: "åŠŸèƒ½",
    featuresList: `- é€šè¿‡ç›¸æœºæ‰«æ
- è‡ªåŠ¨è¯†åˆ«ï¼ˆå“ç‰Œå’Œæ‰¹æ¬¡ï¼‰
- å¬å›žéªŒè¯
- å¬å›žé€šçŸ¥
- æœ¬åœ°åŽ†å²è®°å½•`,
    ocr: "OCR å‡†ç¡®æ€§",
    ocrDesc: "æ–‡æœ¬è¯†åˆ«å¯èƒ½åŒ…å«é”™è¯¯ã€‚æ‚¨å¿…é¡»å§‹ç»ˆç›®è§†éªŒè¯æ£€æµ‹åˆ°çš„ä¿¡æ¯ã€‚",
    liability: "è´£ä»»",
    liabilityDesc: "å‘å¸ƒè€…ä¸ä¿è¯ä¿¡æ¯çš„å‡†ç¡®æ€§ã€‚å¦‚æœ‰å¬å›žï¼Œè¯·æŸ¥é˜…å®˜æ–¹æ¥æºã€‚",
    data: "æ•°æ®",
    dataDesc: "æ‚¨çš„æ‰€æœ‰æ•°æ®éƒ½å­˜å‚¨åœ¨æ‚¨çš„è®¾å¤‡æœ¬åœ°ã€‚æ²¡æœ‰ç…§ç‰‡è¢«å‘é€åˆ°æœåŠ¡å™¨ã€‚",
    contact: "è”ç³»æ–¹å¼"
  },
  ja: {
    title: "åˆ©ç”¨è¦ç´„ - Numeline",
    updated: "æœ€çµ‚æ›´æ–°ï¼š2025å¹´12æœˆ13æ—¥",
    important: "**é‡è¦**ï¼šNumeline ã‚¢ãƒ—ãƒªã‚±ãƒ¼ã‚·ãƒ§ãƒ³ã‚’ãƒ€ã‚¦ãƒ³ãƒ­ãƒ¼ãƒ‰ã€ã‚¤ãƒ³ã‚¹ãƒˆãƒ¼ãƒ«ã€ã¾ãŸã¯ä½¿ç”¨ã™ã‚‹ã“ã¨ã«ã‚ˆã‚Šã€æœ¬åˆ©ç”¨è¦ç´„ã«ç„¡æ¡ä»¶ã§åŒæ„ã™ã‚‹ã‚‚ã®ã¨ã—ã¾ã™ã€‚",
    protection: "ã“ã®ã‚¢ãƒ—ãƒªã‚±ãƒ¼ã‚·ãƒ§ãƒ³ã¨ãã®æ©Ÿèƒ½ã¯ã€è‘—ä½œæ¨©ãŠã‚ˆã³å„ªå…ˆæ¨©ã«ã‚ˆã£ã¦ä¿è­·ã•ã‚Œã¦ã„ã¾ã™ã€‚",
    service: "ã‚µãƒ¼ãƒ“ã‚¹",
    serviceDesc: "Numeline ã¯ã€é£Ÿå“ã‚’ã‚¹ã‚­ãƒ£ãƒ³ã—ã¦ãƒªã‚³ãƒ¼ãƒ«ã®å¯¾è±¡ã¨ãªã£ã¦ã„ã‚‹ã‹ã©ã†ã‹ã‚’ç¢ºèªã§ãã‚‹ç„¡æ–™ã®ãƒ¢ãƒã‚¤ãƒ«ã‚¢ãƒ—ãƒªã‚±ãƒ¼ã‚·ãƒ§ãƒ³ã§ã™ã€‚",
    features: "æ©Ÿèƒ½",
    featuresList: `- ã‚«ãƒ¡ãƒ©ã§ã‚¹ã‚­ãƒ£ãƒ³
- è‡ªå‹•èªè­˜ï¼ˆãƒ–ãƒ©ãƒ³ãƒ‰ã¨ãƒ­ãƒƒãƒˆï¼‰
- ãƒªã‚³ãƒ¼ãƒ«ç¢ºèª
- ãƒªã‚³ãƒ¼ãƒ«é€šçŸ¥
- ãƒ­ãƒ¼ã‚«ãƒ«å±¥æ­´`,
    ocr: "OCR ç²¾åº¦",
    ocrDesc: "ãƒ†ã‚­ã‚¹ãƒˆèªè­˜ã«ã¯ã‚¨ãƒ©ãƒ¼ãŒå«ã¾ã‚Œã‚‹å ´åˆãŒã‚ã‚Šã¾ã™ã€‚æ¤œå‡ºã•ã‚ŒãŸæƒ…å ±ã¯å¸¸ã«ç›®è¦–ã§ç¢ºèªã™ã‚‹å¿…è¦ãŒã‚ã‚Šã¾ã™ã€‚",
    liability: "è²¬ä»»",
    liabilityDesc: "ç™ºè¡Œè€…ã¯æƒ…å ±ã®æ­£ç¢ºæ€§ã‚’ä¿è¨¼ã—ã¾ã›ã‚“ã€‚ãƒªã‚³ãƒ¼ãƒ«ã®å ´åˆã¯ã€å…¬å¼ã‚½ãƒ¼ã‚¹ã‚’å‚ç…§ã—ã¦ãã ã•ã„ã€‚",
    data: "ãƒ‡ãƒ¼ã‚¿",
    dataDesc: "ã™ã¹ã¦ã®ãƒ‡ãƒ¼ã‚¿ã¯ãƒ‡ãƒã‚¤ã‚¹ã«ãƒ­ãƒ¼ã‚«ãƒ«ã«ä¿å­˜ã•ã‚Œã¾ã™ã€‚å†™çœŸãŒã‚µãƒ¼ãƒãƒ¼ã«é€ä¿¡ã•ã‚Œã‚‹ã“ã¨ã¯ã‚ã‚Šã¾ã›ã‚“ã€‚",
    contact: "ãŠå•ã„åˆã‚ã›"
  },
  nl: {
    title: "Gebruiksvoorwaarden - Numeline",
    updated: "Laatste update: 13 december 2025",
    important: "**BELANGRIJK**: Door de Numeline-applicatie te downloaden, installeren of gebruiken, accepteert u onvoorwaardelijk deze Gebruiksvoorwaarden.",
    protection: "Deze applicatie en haar functionaliteiten zijn beschermd door auteursrecht en voorrang.",
    service: "Service",
    serviceDesc: "Numeline is een gratis mobiele applicatie waarmee u voedingsproducten kunt scannen en controleren of ze onderhevig zijn aan een terugroeping.",
    features: "Functionaliteiten",
    featuresList: `- Scannen via camera
- Automatische herkenning (merk en partij)
- Verificatie van terugroepingen
- Terugroepingsmeldingen
- Lokale geschiedenis`,
    ocr: "OCR-nauwkeurigheid",
    ocrDesc: "Tekstherkenning kan fouten bevatten. U moet de gedetecteerde informatie altijd visueel verifiÃ«ren.",
    liability: "Aansprakelijkheid",
    liabilityDesc: "De uitgever garandeert niet de nauwkeurigheid van informatie. In geval van terugroeping, raadpleeg officiÃ«le bronnen.",
    data: "Gegevens",
    dataDesc: "Al uw gegevens worden lokaal op uw apparaat opgeslagen. Geen enkele foto wordt naar een server verzonden.",
    contact: "Contact"
  },
  sq: {
    title: "Kushtet e PÃ«rdorimit - Numeline",
    updated: "PÃ«rditÃ«simi i fundit: 13 dhjetor 2025",
    important: "**E RÃ‹NDÃ‹SISHME**: Duke shkarkuar, instaluar ose pÃ«rdorur aplikacionin Numeline, ju pranoni pa kushte kÃ«to Kushte tÃ« PÃ«rdorimit.",
    protection: "Ky aplikacion dhe funksionalitetet e tij janÃ« tÃ« mbrojtura nga e drejta e autorit dhe pÃ«rparÃ«sia.",
    service: "ShÃ«rbimi",
    serviceDesc: "Numeline Ã«shtÃ« njÃ« aplikacion celular falas qÃ« ju lejon tÃ« skanoni produkte ushqimore dhe tÃ« kontrolloni nÃ«se ato janÃ« objekt i njÃ« tÃ«rheqjeje.",
    features: "Funksionalitetet",
    featuresList: `- Skanim pÃ«rmes kamerÃ«s
- Njohje automatike (marka dhe numri i lotit)
- Verifikimi i tÃ«rheqjeve
- Njoftime pÃ«r tÃ«rheqje
- Historik lokal`,
    ocr: "SaktÃ«sia OCR",
    ocrDesc: "Njohja e tekstit mund tÃ« pÃ«rmbajÃ« gabime. Ju duhet tÃ« verifikoni gjithmonÃ« vizualisht informacionin e zbuluar.",
    liability: "PÃ«rgjegjÃ«sia",
    liabilityDesc: "Botori nuk garanton saktÃ«sinÃ« e informacionit. NÃ« rast tÃ«rheqjeje, konsultoni burimet zyrtare.",
    data: "TÃ« dhÃ«nat",
    dataDesc: "TÃ« gjitha tÃ« dhÃ«nat tuaja ruhen lokalisht nÃ« pajisjen tuaj. AsnjÃ« foto nuk dÃ«rgohet nÃ« njÃ« server.",
    contact: "Kontakti"
  },
  sr: {
    title: "Uslovi koriÅ¡Ä‡enja - Numeline",
    updated: "Poslednje aÅ¾uriranje: 13. decembar 2025",
    important: "**VAÅ½NO**: Preuzimanjem, instaliranjem ili koriÅ¡Ä‡enjem aplikacije Numeline, bezuslovno prihvatate ove Uslove koriÅ¡Ä‡enja.",
    protection: "Ova aplikacija i njene funkcionalnosti su zaÅ¡tiÄ‡ene autorskim pravom i prioritetom.",
    service: "Usluga",
    serviceDesc: "Numeline je besplatna mobilna aplikacija koja vam omoguÄ‡ava da skenirate prehrambene proizvode i proverite da li su predmet opoziva.",
    features: "Funkcionalnosti",
    featuresList: `- Skeniranje putem kamere
- Automatsko prepoznavanje (marka i serija)
- Verifikacija opoziva
- ObaveÅ¡tenja o opozivima
- Lokalna istorija`,
    ocr: "OCR taÄnost",
    ocrDesc: "Prepoznavanje teksta moÅ¾e sadrÅ¾ati greÅ¡ke. Uvek morate vizuelno proveriti otkrivene informacije.",
    liability: "Odgovornost",
    liabilityDesc: "IzdavaÄ ne garantuje taÄnost informacija. U sluÄaju opoziva, konsultujte zvaniÄne izvore.",
    data: "Podaci",
    dataDesc: "Svi vaÅ¡i podaci se Äuvaju lokalno na vaÅ¡em ureÄ‘aju. Nijedna fotografija se ne Å¡alje na server.",
    contact: "Kontakt"
  },
  me: {
    title: "Uslovi koriÅ¡Ä‡enja - Numeline",
    updated: "Posljednje aÅ¾uriranje: 13. decembar 2025",
    important: "**VAÅ½NO**: Preuzimanjem, instaliranjem ili koriÅ¡tenjem aplikacije Numeline, bezuslovno prihvatate ove Uslove koriÅ¡Ä‡enja.",
    protection: "Ova aplikacija i njene funkcionalnosti su zaÅ¡tiÄ‡ene autorskim pravom i prioritetom.",
    service: "Usluga",
    serviceDesc: "Numeline je besplatna mobilna aplikacija koja vam omoguÄ‡ava da skenirate prehrambene proizvode i provjerite da li su predmet opoziva.",
    features: "Funkcionalnosti",
    featuresList: `- Skeniranje putem kamere
- Automatsko prepoznavanje (marka i serija)
- Verifikacija opoziva
- ObavjeÅ¡tenja o opozivima
- Lokalna istorija`,
    ocr: "OCR taÄnost",
    ocrDesc: "Prepoznavanje teksta moÅ¾e sadrÅ¾ati greÅ¡ke. Uvijek morate vizuelno provjeriti otkrivene informacije.",
    liability: "Odgovornost",
    liabilityDesc: "IzdavaÄ ne garantuje taÄnost informacija. U sluÄaju opoziva, konsultujte zvaniÄne izvore.",
    data: "Podaci",
    dataDesc: "Svi vaÅ¡i podaci se Äuvaju lokalno na vaÅ¡em ureÄ‘aju. Nijedna fotografija se ne Å¡alje na server.",
    contact: "Kontakt"
  }
};

function generateCGU(lang, translation) {
  const protectionLine = lang === 'en'
    ? 'This application and its functionalities are protected by copyright and prior art.'
    : `${translation.protection}\nThis application and its functionalities are protected by copyright and prior art.`;

  return `# ${translation.title}

*${translation.updated}*

${translation.important}

${protectionLine}

---

## 1. ${translation.service}

${translation.serviceDesc}

## 2. ${translation.features}

${translation.featuresList}

## 3. ${translation.ocr}

${translation.ocrDesc}

## 4. ${translation.liability}

${translation.liabilityDesc}

## 5. ${translation.data}

${translation.dataDesc}

## 6. ${translation.contact}

Email : legal@eatsok.app
`;
}

// CrÃ©er les fichiers pour chaque langue
const legalDir = path.join(__dirname, '..', 'legal');
if (!fs.existsSync(legalDir)) {
  fs.mkdirSync(legalDir, { recursive: true });
}

// FranÃ§ais (dÃ©jÃ  crÃ©Ã©, on le copie juste)
console.log('Generating CGU files...\n');

Object.keys(translations).forEach(lang => {
  const content = generateCGU(lang, translations[lang]);
  const filePath = path.join(legalDir, `CGU_${lang}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`âœ… Created: ${filePath}`);
});

console.log('\nâœ¨ All CGU translation files have been created successfully!');

