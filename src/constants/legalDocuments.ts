type LegalDocType = 'privacy' | 'terms' | 'notice' | 'disclaimer';

type LegalLocale = 'en' | 'fr' | 'es' | 'it' | 'pt' | 'de';

type LegalContent = Record<LegalLocale, Record<LegalDocType, string>>;

const LEGAL_HTML: LegalContent = {
  en: {
    privacy: `      <h1>Privacy Policy - Numeline</h1>
      <p><strong>Last updated: January 14, 2026</strong></p>
      <p>Numeline is a mobile app operated by Olympe et odin (SIRET 91457466000025). This policy explains how we collect and use information.</p>
      <h3>Data controller</h3>
      <p>Olympe et odin, France. Contact: vgaillard85@gmail.com.app</p>
      <h3>Information we collect</h3>
      <ul>
        <li>Account data: email address and authentication identifiers (Firebase Authentication).</li>
        <li>Profile data provided by you or your sign-in provider (display name, profile photo).</li>
        <li>Scan data: brand, lot number, product name, product image URL, scan timestamps, recall status.</li>
        <li>Organization data (team features): organization name, member emails, roles.</li>
        <li>Subscription data: plan, limits, and validity if you select a plan.</li>
        <li>Preferences stored on your device: language, theme, notifications, onboarding state.</li>
        <li>Support communications you send to us.</li>
        <li>Device and security data from Firebase (device identifiers, IP address, security logs).</li>
      </ul>
      <h3>Camera images and OCR</h3>
      <ul>
        <li>Images captured for barcode or lot recognition are processed on device and deleted after processing.</li>
        <li>If Cloud Vision fallback is enabled, images may be sent to Google Cloud Vision for text extraction.</li>
      </ul>
      <h3>Information we do not collect</h3>
      <ul>
        <li>Precise location data.</li>
        <li>Your contacts or address book.</li>
        <li>Payment card details (payments are handled by the app store).</li>
      </ul>
      <h3>How we use data</h3>
      <ul>
        <li>Provide the service, manage accounts, and store scan history.</li>
        <li>Check products against recall sources and send alerts if notifications are enabled.</li>
        <li>Maintain security, prevent abuse, and improve the service.</li>
        <li>Respond to support requests.</li>
      </ul>
      <h3>Sharing and providers</h3>
      <p>We do not sell your personal data. We share data only with providers needed to operate the app:</p>
      <ul>
        <li>Google Firebase (Authentication and Firestore database).</li>
        <li>Google Sign-In (if you choose to sign in with Google).</li>
        <li>Google Cloud Vision (only if the OCR fallback is enabled).</li>
        <li>Open Food Facts for barcode lookup, and FDA/USDA for recall data.</li>
      </ul>
      <h3>Retention</h3>
      <p>Account and scan data are kept while your account is active and removed upon deletion. Local data stays on your device until you clear app data or uninstall.</p>
      <h3>Your rights</h3>
      <p>You can request access, correction, deletion, or portability of your data. Contact: vgaillard85@gmail.com.app</p>
      <h3>International transfers</h3>
      <p>Some providers may process data outside your country. We rely on appropriate safeguards when required.</p>
      <h3>Changes</h3>
      <p>We may update this policy and will update the date above when we do.</p>`,
    terms: `      <h1>Terms of Service - Numeline</h1>
      <p><strong>Last updated: January 14, 2026</strong></p>
      <p>These terms govern your use of Numeline, a mobile app operated by Olympe et odin (SIRET 91457466000025).</p>
      <h3>Service</h3>
      <ul>
        <li>Scan barcodes and lot numbers.</li>
        <li>Check products against public recall data sources.</li>
        <li>Receive recall alerts and keep scan history.</li>
      </ul>
      <p>Recall coverage is limited to food products sold in the United States. Data sources include FDA, USDA, and Open Food Facts.</p>
      <h3>Accounts and security</h3>
      <p>You are responsible for keeping your credentials secure and for all activity under your account.</p>
      <h3>Acceptable use</h3>
      <ul>
        <li>Do not use the app for unlawful purposes.</li>
        <li>Do not bypass scan limits or security controls.</li>
        <li>Do not reverse engineer or misuse the service.</li>
      </ul>
      <h3>Subscriptions and purchases</h3>
      <p>Payments are processed by the app store. Prices, renewal terms, and cancellations are managed in the store.</p>
      <h3>Disclaimer</h3>
      <p>The app provides recall information for informational purposes only and does not provide medical or legal advice. Always verify with official sources.</p>
      <h3>Limitation of liability</h3>
      <p>To the maximum extent permitted by law, the app is provided "as is" without warranties. We are not liable for indirect or consequential damages.</p>
      <h3>Governing law</h3>
      <p>These terms are governed by French law.</p>
      <h3>Contact</h3>
      <p>Contact: contact@eatsok.app</p>`,
    notice: `      <h1>Legal Notice - Numeline</h1>
      <p><strong>Last updated: January 14, 2026</strong></p>
      <h3>Publisher</h3>
      <p>Olympe et odin (SIRET 91457466000025) - contact@eatsok.app</p>
      <h3>Hosting</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Intellectual property</h3>
      <p>Brand, logo, and content are protected. Reuse requires prior authorization.</p>
      <h3>Data protection</h3>
      <p>For any request: vgaillard85@gmail.com.app</p>`,
    disclaimer: `
      <h1>Food Recall Disclaimer</h1>
      <p>This app provides recall information for products sold in the United States for information only.</p>
      <p>Data comes from public sources (FDA, USDA, other third parties). Accuracy, completeness, or freshness is not guaranteed.</p>
      <p>This app does not replace official recall notices or guidance. Verify with official sources.</p>
      <p>A product not listed as recalled here is not guaranteed to be safe. This app does not provide medical or nutritional advice.</p>
      <p>Barcode/lot recognition may contain errors. Users remain responsible for verifying product details and recall status.</p>
      <p>To the maximum extent allowed by law, the developer is not liable for any losses linked to the use of this information.</p>
    `
  },
  fr: {
    privacy: `      <h1>Politique de confidentialite - Numeline</h1>
      <p><strong>Derniere mise a jour : 14 janvier 2026</strong></p>
      <p>Numeline est une application mobile exploitee par Olympe et odin (SIRET 91457466000025). Cette politique explique comment nous collectons et utilisons les informations.</p>
      <h3>Responsable du traitement</h3>
      <p>Olympe et odin, France. Contact : vgaillard85@gmail.com.app</p>
      <h3>Informations que nous collectons</h3>
      <ul>
        <li>Donnees de compte : adresse email et identifiants d'authentification (Firebase Authentication).</li>
        <li>Donnees de profil fournies par vous ou votre fournisseur de connexion (nom d'affichage, photo de profil).</li>
        <li>Donnees de scan : marque, numero de lot, nom du produit, URL de l'image du produit, horodatages, statut de rappel.</li>
        <li>Donnees d'organisation (fonctionnalites d'equipe) : nom de l'organisation, emails des membres, roles.</li>
        <li>Donnees d'abonnement : plan, limites et validite si vous selectionnez un plan.</li>
        <li>Preferences stockees sur votre appareil : langue, theme, notifications, parcours d'onboarding.</li>
        <li>Communications de support que vous nous envoyez.</li>
        <li>Donnees techniques et de securite de Firebase (identifiants d'appareil, adresse IP, journaux de securite).</li>
      </ul>
      <h3>Images camera et OCR</h3>
      <ul>
        <li>Les images capturees pour la reconnaissance des codes-barres ou lots sont traitees sur l'appareil et supprimees apres traitement.</li>
        <li>Si le fallback Cloud Vision est active, les images peuvent etre envoyees a Google Cloud Vision pour extraire le texte.</li>
      </ul>
      <h3>Informations que nous ne collectons pas</h3>
      <ul>
        <li>Localisation precise.</li>
        <li>Vos contacts ou carnet d'adresses.</li>
        <li>Donnees de carte bancaire (paiements geres par le store).</li>
      </ul>
      <h3>Utilisation des donnees</h3>
      <ul>
        <li>Fournir le service, gerer les comptes et stocker l'historique des scans.</li>
        <li>Verifier les produits avec les sources de rappel et envoyer des alertes si les notifications sont activees.</li>
        <li>Maintenir la securite, prevenir les abus et ameliorer le service.</li>
        <li>Repondre aux demandes de support.</li>
      </ul>
      <h3>Partage et fournisseurs</h3>
      <p>Nous ne vendons pas vos donnees personnelles. Nous partageons seulement avec les fournisseurs necessaires :</p>
      <ul>
        <li>Google Firebase (Authentication et base Firestore).</li>
        <li>Google Sign-In (si vous choisissez la connexion Google).</li>
        <li>Google Cloud Vision (uniquement si le fallback OCR est active).</li>
        <li>Open Food Facts pour la recherche barcode, et FDA/USDA pour les rappels.</li>
      </ul>
      <h3>Conservation</h3>
      <p>Les donnees de compte et de scan sont conservees tant que votre compte est actif et supprimees apres suppression. Les donnees locales restent sur votre appareil jusqu'a suppression des donnees ou desinstallation.</p>
      <h3>Vos droits</h3>
      <p>Vous pouvez demander acces, rectification, suppression ou portabilite de vos donnees. Contact : vgaillard85@gmail.com.app</p>
      <h3>Transferts internationaux</h3>
      <p>Certains fournisseurs peuvent traiter des donnees hors de votre pays. Nous utilisons des garanties appropriees si necessaire.</p>
      <h3>Modifications</h3>
      <p>Nous pouvons mettre a jour cette politique et modifier la date ci-dessus.</p>`,
    terms: `      <h1>Conditions d'utilisation - Numeline</h1>
      <p><strong>Derniere mise a jour : 14 janvier 2026</strong></p>
      <p>Ces conditions regissent l'utilisation de Numeline, une application mobile exploitee par Olympe et odin (SIRET 91457466000025).</p>
      <h3>Service</h3>
      <ul>
        <li>Scanner les codes-barres et les numeros de lot.</li>
        <li>Verifier les produits avec des sources publiques de rappel.</li>
        <li>Recevoir des alertes de rappel et conserver un historique de scans.</li>
      </ul>
      <p>La couverture des rappels est limitee aux produits alimentaires vendus aux Etats-Unis. Sources : FDA, USDA et Open Food Facts.</p>
      <h3>Comptes et securite</h3>
      <p>Vous etes responsable de la securite de vos identifiants et des activites sur votre compte.</p>
      <h3>Utilisation acceptable</h3>
      <ul>
        <li>Ne pas utiliser l'application a des fins illegales.</li>
        <li>Ne pas contourner les limites de scan ou les controles de securite.</li>
        <li>Ne pas decompiler ou detourner le service.</li>
      </ul>
      <h3>Abonnements et achats</h3>
      <p>Les paiements sont traites par le store. Les prix, renouvellements et annulations sont geres dans le store.</p>
      <h3>Avertissement</h3>
      <p>L'application fournit des informations de rappel a titre informatif et ne fournit pas de conseil medical ou juridique. Verifiez toujours aupres des sources officielles.</p>
      <h3>Limitation de responsabilite</h3>
      <p>Dans la limite permise par la loi, l'application est fournie en l'etat sans garantie. Nous ne sommes pas responsables des dommages indirects ou consecutifs.</p>
      <h3>Loi applicable</h3>
      <p>Ces conditions sont regies par le droit francais.</p>
      <h3>Contact</h3>
      <p>Contact : contact@eatsok.app</p>`,
    notice: `      <h1>Mentions legales - Numeline</h1>
      <p><strong>Derniere mise a jour : 14 janvier 2026</strong></p>
      <h3>Editeur</h3>
      <p>Olympe et odin (SIRET 91457466000025) - contact@eatsok.app</p>
      <h3>Hebergement</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Propriete intellectuelle</h3>
      <p>Marque, logo et contenus proteges. Reutilisation soumise a autorisation.</p>
      <h3>Protection des donnees</h3>
      <p>Pour toute demande : vgaillard85@gmail.com.app</p>`,
    disclaimer: `
      <h1>Avertissement Rappel Alimentaire</h1>
      <p>L'application fournit des informations de rappel pour les produits vendus aux Etats-Unis a titre informatif uniquement.</p>
      <p>Donnees issues de sources publiques (FDA, USDA, tiers). Aucune garantie d'exactitude, d'exhaustivite ou d'actualite.</p>
      <p>L'application ne remplace pas les avis officiels. Verifiez toujours aupres des sources officielles.</p>
      <p>L'absence de rappel ici ne garantit pas la securite d'un produit. Pas de conseil medical ou nutritionnel.</p>
      <p>La reconnaissance code-barres/lot peut contenir des erreurs. L'utilisateur reste responsable de la verification.</p>
      <p>Dans la limite permise par la loi, le developpeur n'est pas responsable des pertes liees a l'utilisation de ces informations.</p>
    `
  },
  es: {
    privacy: `      <h1>Politica de privacidad - Numeline</h1>
      <p><strong>Ultima actualizacion: 14 de enero de 2026</strong></p>
      <p>Numeline es una aplicacion movil operada por Olympe et odin (SIRET 91457466000025). Esta politica explica como recopilamos y usamos la informacion.</p>
      <h3>Responsable</h3>
      <p>Olympe et odin, Francia. Contacto: vgaillard85@gmail.com.app</p>
      <h3>Informacion que recopilamos</h3>
      <ul>
        <li>Datos de cuenta: correo electronico e identificadores de autenticacion (Firebase Authentication).</li>
        <li>Datos de perfil proporcionados por usted o por su proveedor de inicio de sesion (nombre para mostrar, foto de perfil).</li>
        <li>Datos de escaneo: marca, numero de lote, nombre del producto, URL de la imagen del producto, marcas de tiempo, estado de retiro.</li>
        <li>Datos de organizacion (funciones de equipo): nombre de la organizacion, correos de miembros, roles.</li>
        <li>Datos de suscripcion: plan, limites y vigencia si selecciona un plan.</li>
        <li>Preferencias almacenadas en su dispositivo: idioma, tema, notificaciones, estado de onboarding.</li>
        <li>Comunicaciones de soporte que nos envia.</li>
        <li>Datos de dispositivo y seguridad de Firebase (identificadores de dispositivo, direccion IP, registros de seguridad).</li>
      </ul>
      <h3>Imagenes de camara y OCR</h3>
      <ul>
        <li>Las imagenes capturadas para reconocimiento de codigos de barras o lotes se procesan en el dispositivo y se eliminan despues del procesamiento.</li>
        <li>Si el fallback Cloud Vision esta activado, las imagenes pueden enviarse a Google Cloud Vision para extraer texto.</li>
      </ul>
      <h3>Informacion que no recopilamos</h3>
      <ul>
        <li>Ubicacion precisa.</li>
        <li>Sus contactos o libreta de direcciones.</li>
        <li>Datos de tarjeta de pago (pagos gestionados por la tienda).</li>
      </ul>
      <h3>Como usamos los datos</h3>
      <ul>
        <li>Proveer el servicio, gestionar cuentas y almacenar historial de escaneos.</li>
        <li>Verificar productos con fuentes de retiro y enviar alertas si las notificaciones estan activadas.</li>
        <li>Mantener la seguridad, prevenir abusos y mejorar el servicio.</li>
        <li>Responder a solicitudes de soporte.</li>
      </ul>
      <h3>Comparticion y proveedores</h3>
      <p>No vendemos sus datos personales. Compartimos solo con proveedores necesarios:</p>
      <ul>
        <li>Google Firebase (Authentication y base Firestore).</li>
        <li>Google Sign-In (si elige iniciar sesion con Google).</li>
        <li>Google Cloud Vision (solo si el fallback OCR esta activado).</li>
        <li>Open Food Facts para busqueda de codigos de barras y FDA/USDA para retiros.</li>
      </ul>
      <h3>Conservacion</h3>
      <p>Los datos de cuenta y escaneo se conservan mientras su cuenta este activa y se eliminan al eliminar la cuenta. Los datos locales permanecen en su dispositivo hasta que borre los datos o desinstale la app.</p>
      <h3>Sus derechos</h3>
      <p>Puede solicitar acceso, correccion, eliminacion o portabilidad de sus datos. Contacto: vgaillard85@gmail.com.app</p>
      <h3>Transferencias internacionales</h3>
      <p>Algunos proveedores pueden procesar datos fuera de su pais. Usamos salvaguardas apropiadas cuando es necesario.</p>
      <h3>Cambios</h3>
      <p>Podemos actualizar esta politica y cambiar la fecha anterior.</p>`,
    terms: `      <h1>Terminos de servicio - Numeline</h1>
      <p><strong>Ultima actualizacion: 14 de enero de 2026</strong></p>
      <p>Estos terminos regulan el uso de Numeline, una aplicacion movil operada por Olympe et odin (SIRET 91457466000025).</p>
      <h3>Servicio</h3>
      <ul>
        <li>Escanear codigos de barras y numeros de lote.</li>
        <li>Verificar productos con fuentes publicas de retiro.</li>
        <li>Recibir alertas de retiro y conservar historial de escaneos.</li>
      </ul>
      <p>La cobertura de retiros se limita a productos alimenticios vendidos en Estados Unidos. Fuentes: FDA, USDA y Open Food Facts.</p>
      <h3>Cuentas y seguridad</h3>
      <p>Usted es responsable de la seguridad de sus credenciales y de la actividad en su cuenta.</p>
      <h3>Uso aceptable</h3>
      <ul>
        <li>No use la app con fines ilegales.</li>
        <li>No intente evadir limites de escaneo o controles de seguridad.</li>
        <li>No descompile ni abuse del servicio.</li>
      </ul>
      <h3>Suscripciones y compras</h3>
      <p>Los pagos son procesados por la tienda. Los precios, renovaciones y cancelaciones se gestionan en la tienda.</p>
      <h3>Aviso</h3>
      <p>La app ofrece informacion de retiros solo con fines informativos y no proporciona asesoramiento medico o legal. Verifique siempre con fuentes oficiales.</p>
      <h3>Limitacion de responsabilidad</h3>
      <p>En la maxima medida permitida por la ley, la app se ofrece tal cual sin garantias. No somos responsables de danos indirectos o consecuentes.</p>
      <h3>Ley aplicable</h3>
      <p>Estos terminos se rigen por la ley francesa.</p>
      <h3>Contacto</h3>
      <p>Contacto: contact@eatsok.app</p>`,
    notice: `      <h1>Aviso legal - Numeline</h1>
      <p><strong>Ultima actualizacion: 14 de enero de 2026</strong></p>
      <h3>Editor</h3>
      <p>Olympe et odin (SIRET 91457466000025) - contact@eatsok.app</p>
      <h3>Alojamiento</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Propiedad intelectual</h3>
      <p>Marca, logotipo y contenidos protegidos. Requiere autorizacion para reutilizar.</p>
      <h3>Proteccion de datos</h3>
      <p>Para cualquier solicitud: vgaillard85@gmail.com.app</p>`,
    disclaimer: `
      <h1>Descargo de responsabilidad</h1>
      <p>La app ofrece informacion de retiros en EE. UU. solo con fines informativos.</p>
      <p>Fuentes publicas (FDA, USDA). No se garantiza exactitud o actualidad.</p>
      <p>No reemplaza avisos oficiales. Verifica con fuentes oficiales.</p>
      <p>La ausencia de retiro no garantiza seguridad. No es consejo medico.</p>
      <p>Puede haber errores en el reconocimiento de codigos/lotes. El usuario verifica los detalles.</p>
    `
  },
  it: {
    privacy: `      <h1>Informativa sulla privacy - Numeline</h1>
      <p><strong>Ultimo aggiornamento: 14 gennaio 2026</strong></p>
      <p>Numeline e una app mobile gestita da Olympe et odin (SIRET 91457466000025). Questa informativa spiega come raccogliamo e usiamo le informazioni.</p>
      <h3>Titolare del trattamento</h3>
      <p>Olympe et odin, Francia. Contatto: vgaillard85@gmail.com.app</p>
      <h3>Informazioni che raccogliamo</h3>
      <ul>
        <li>Dati account: indirizzo email e identificativi di autenticazione (Firebase Authentication).</li>
        <li>Dati profilo forniti da te o dal tuo provider di accesso (nome visualizzato, foto profilo).</li>
        <li>Dati di scansione: marca, numero di lotto, nome prodotto, URL immagine prodotto, timestamp, stato richiamo.</li>
        <li>Dati organizzazione (funzioni team): nome organizzazione, email membri, ruoli.</li>
        <li>Dati abbonamento: piano, limiti e validita se selezioni un piano.</li>
        <li>Preferenze memorizzate sul dispositivo: lingua, tema, notifiche, stato onboarding.</li>
        <li>Comunicazioni di supporto che ci invii.</li>
        <li>Dati dispositivo e sicurezza da Firebase (identificativi dispositivo, indirizzo IP, log di sicurezza).</li>
      </ul>
      <h3>Immagini camera e OCR</h3>
      <ul>
        <li>Le immagini catturate per il riconoscimento di barcode o lotti sono elaborate sul dispositivo e cancellate dopo l'elaborazione.</li>
        <li>Se il fallback Cloud Vision e attivo, le immagini possono essere inviate a Google Cloud Vision per estrarre il testo.</li>
      </ul>
      <h3>Informazioni che non raccogliamo</h3>
      <ul>
        <li>Posizione precisa.</li>
        <li>Contatti o rubrica.</li>
        <li>Dati della carta di pagamento (pagamenti gestiti dallo store).</li>
      </ul>
      <h3>Come usiamo i dati</h3>
      <ul>
        <li>Fornire il servizio, gestire account e archiviare la cronologia delle scansioni.</li>
        <li>Verificare i prodotti con le fonti di richiamo e inviare avvisi se le notifiche sono attive.</li>
        <li>Mantenere la sicurezza, prevenire abusi e migliorare il servizio.</li>
        <li>Rispondere alle richieste di supporto.</li>
      </ul>
      <h3>Condivisione e fornitori</h3>
      <p>Non vendiamo i tuoi dati personali. Condividiamo solo con i fornitori necessari:</p>
      <ul>
        <li>Google Firebase (Authentication e database Firestore).</li>
        <li>Google Sign-In (se scegli l'accesso con Google).</li>
        <li>Google Cloud Vision (solo se il fallback OCR e attivo).</li>
        <li>Open Food Facts per la ricerca barcode e FDA/USDA per i richiami.</li>
      </ul>
      <h3>Conservazione</h3>
      <p>I dati di account e scansione sono conservati finche il tuo account e attivo e rimossi alla cancellazione. I dati locali restano sul dispositivo finche non cancelli i dati o disinstalli l'app.</p>
      <h3>I tuoi diritti</h3>
      <p>Puoi richiedere accesso, rettifica, cancellazione o portabilita dei dati. Contatto: vgaillard85@gmail.com.app</p>
      <h3>Trasferimenti internazionali</h3>
      <p>Alcuni fornitori possono trattare dati fuori dal tuo paese. Usiamo garanzie appropriate quando necessario.</p>
      <h3>Modifiche</h3>
      <p>Possiamo aggiornare questa informativa e modificare la data sopra.</p>`,
    terms: `      <h1>Termini di servizio - Numeline</h1>
      <p><strong>Ultimo aggiornamento: 14 gennaio 2026</strong></p>
      <p>Questi termini regolano l'uso di Numeline, una app mobile gestita da Olympe et odin (SIRET 91457466000025).</p>
      <h3>Servizio</h3>
      <ul>
        <li>Scansionare barcode e numeri di lotto.</li>
        <li>Verificare prodotti con fonti pubbliche di richiamo.</li>
        <li>Ricevere avvisi di richiamo e conservare la cronologia delle scansioni.</li>
      </ul>
      <p>La copertura dei richiami e limitata ai prodotti alimentari venduti negli Stati Uniti. Fonti: FDA, USDA e Open Food Facts.</p>
      <h3>Account e sicurezza</h3>
      <p>Sei responsabile della sicurezza delle tue credenziali e delle attivita sul tuo account.</p>
      <h3>Uso accettabile</h3>
      <ul>
        <li>Non usare l'app per fini illegali.</li>
        <li>Non aggirare limiti di scansione o controlli di sicurezza.</li>
        <li>Non decompilare o abusare del servizio.</li>
      </ul>
      <h3>Abbonamenti e acquisti</h3>
      <p>I pagamenti sono gestiti dallo store. Prezzi, rinnovi e cancellazioni sono gestiti nello store.</p>
      <h3>Avvertenza</h3>
      <p>L'app fornisce informazioni sui richiami a scopo informativo e non fornisce consulenza medica o legale. Verifica sempre con fonti ufficiali.</p>
      <h3>Limitazione di responsabilita</h3>
      <p>Nella misura massima consentita dalla legge, l'app e fornita in stato attuale senza garanzie. Non siamo responsabili di danni indiretti o consequenziali.</p>
      <h3>Legge applicabile</h3>
      <p>Questi termini sono regolati dalla legge francese.</p>
      <h3>Contatto</h3>
      <p>Contatto: contact@eatsok.app</p>`,
    notice: `      <h1>Note legali - Numeline</h1>
      <p><strong>Ultimo aggiornamento: 14 gennaio 2026</strong></p>
      <h3>Editore</h3>
      <p>Olympe et odin (SIRET 91457466000025) - contact@eatsok.app</p>
      <h3>Hosting</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Proprieta intellettuale</h3>
      <p>Marchio, logo e contenuti protetti. Riutilizzo soggetto ad autorizzazione.</p>
      <h3>Protezione dei dati</h3>
      <p>Per qualsiasi richiesta: vgaillard85@gmail.com.app</p>`,
    disclaimer: `
      <h1>Disclaimer richiami alimentari</h1>
      <p>Informazioni sui richiami negli Stati Uniti solo a scopo informativo.</p>
      <p>Fonti pubbliche (FDA, USDA). Nessuna garanzia di accuratezza o aggiornamento.</p>
      <p>Non sostituisce gli avvisi ufficiali. Verificare con fonti ufficiali.</p>
      <p>L'assenza di richiamo non garantisce sicurezza. Nessun consiglio medico.</p>
      <p>Possibili errori nel riconoscimento di codici/lotto. L'utente verifica i dettagli.</p>
    `
  },
  pt: {
    privacy: `      <h1>Politica de privacidade - Numeline</h1>
      <p><strong>Ultima atualizacao: 14 de janeiro de 2026</strong></p>
      <p>Numeline e um aplicativo movel operado por Olympe et odin (SIRET 91457466000025). Esta politica explica como coletamos e usamos informacoes.</p>
      <h3>Responsavel pelo tratamento</h3>
      <p>Olympe et odin, Franca. Contato: vgaillard85@gmail.com.app</p>
      <h3>Informacoes que coletamos</h3>
      <ul>
        <li>Dados da conta: endereco de email e identificadores de autenticacao (Firebase Authentication).</li>
        <li>Dados de perfil fornecidos por voce ou pelo provedor de login (nome de exibicao, foto de perfil).</li>
        <li>Dados de scan: marca, numero de lote, nome do produto, URL da imagem do produto, timestamps, status de recall.</li>
        <li>Dados de organizacao (funcoes de equipe): nome da organizacao, emails dos membros, papeis.</li>
        <li>Dados de assinatura: plano, limites e vigencia se voce selecionar um plano.</li>
        <li>Preferencias armazenadas no dispositivo: idioma, tema, notificacoes, estado de onboarding.</li>
        <li>Comunicacoes de suporte que voce envia.</li>
        <li>Dados de dispositivo e seguranca do Firebase (identificadores de dispositivo, endereco IP, logs de seguranca).</li>
      </ul>
      <h3>Imagens de camera e OCR</h3>
      <ul>
        <li>As imagens capturadas para reconhecimento de codigo de barras ou lote sao processadas no dispositivo e apagadas apos o processamento.</li>
        <li>Se o fallback Cloud Vision estiver ativado, as imagens podem ser enviadas ao Google Cloud Vision para extracao de texto.</li>
      </ul>
      <h3>Informacoes que nao coletamos</h3>
      <ul>
        <li>Localizacao precisa.</li>
        <li>Seus contatos ou agenda.</li>
        <li>Dados de cartao de pagamento (pagamentos gerenciados pela loja).</li>
      </ul>
      <h3>Como usamos os dados</h3>
      <ul>
        <li>Fornecer o servico, gerenciar contas e armazenar historico de scans.</li>
        <li>Verificar produtos com fontes de recall e enviar alertas se as notificacoes estiverem ativadas.</li>
        <li>Manter a seguranca, prevenir abusos e melhorar o servico.</li>
        <li>Responder a solicitacoes de suporte.</li>
      </ul>
      <h3>Compartilhamento e fornecedores</h3>
      <p>Nao vendemos seus dados pessoais. Compartilhamos apenas com fornecedores necessarios:</p>
      <ul>
        <li>Google Firebase (Authentication e base Firestore).</li>
        <li>Google Sign-In (se voce escolher login com Google).</li>
        <li>Google Cloud Vision (somente se o fallback OCR estiver ativado).</li>
        <li>Open Food Facts para busca de codigo de barras e FDA/USDA para recalls.</li>
      </ul>
      <h3>Retencao</h3>
      <p>Dados de conta e scan sao mantidos enquanto sua conta estiver ativa e removidos apos exclusao. Dados locais permanecem no dispositivo ate que voce limpe os dados ou desinstale o app.</p>
      <h3>Seus direitos</h3>
      <p>Voce pode solicitar acesso, correcao, exclusao ou portabilidade dos seus dados. Contato: vgaillard85@gmail.com.app</p>
      <h3>Transferencias internacionais</h3>
      <p>Alguns fornecedores podem processar dados fora do seu pais. Usamos salvaguardas apropriadas quando necessario.</p>
      <h3>Mudancas</h3>
      <p>Podemos atualizar esta politica e alterar a data acima.</p>`,
    terms: `      <h1>Termos de servico - Numeline</h1>
      <p><strong>Ultima atualizacao: 14 de janeiro de 2026</strong></p>
      <p>Estes termos regem o uso do Numeline, um aplicativo movel operado por Olympe et odin (SIRET 91457466000025).</p>
      <h3>Servico</h3>
      <ul>
        <li>Escanear codigos de barras e numeros de lote.</li>
        <li>Verificar produtos com fontes publicas de recall.</li>
        <li>Receber alertas de recall e manter historico de scans.</li>
      </ul>
      <p>A cobertura de recalls e limitada a produtos alimentares vendidos nos Estados Unidos. Fontes: FDA, USDA e Open Food Facts.</p>
      <h3>Contas e seguranca</h3>
      <p>Voce e responsavel pela seguranca das suas credenciais e pela atividade em sua conta.</p>
      <h3>Uso aceitavel</h3>
      <ul>
        <li>Nao use o app para fins ilegais.</li>
        <li>Nao tente contornar limites de scan ou controles de seguranca.</li>
        <li>Nao descompile nem abuse do servico.</li>
      </ul>
      <h3>Assinaturas e compras</h3>
      <p>Os pagamentos sao processados pela loja. Precos, renovacoes e cancelamentos sao gerenciados na loja.</p>
      <h3>Aviso</h3>
      <p>O app fornece informacoes de recall apenas para fins informativos e nao oferece aconselhamento medico ou legal. Verifique sempre com fontes oficiais.</p>
      <h3>Limitacao de responsabilidade</h3>
      <p>Na maxima extensao permitida por lei, o app e fornecido no estado em que se encontra, sem garantias. Nao somos responsaveis por danos indiretos ou consequenciais.</p>
      <h3>Lei aplicavel</h3>
      <p>Estes termos sao regidos pela lei francesa.</p>
      <h3>Contato</h3>
      <p>Contato: contact@eatsok.app</p>`,
    notice: `      <h1>Aviso legal - Numeline</h1>
      <p><strong>Ultima atualizacao: 14 de janeiro de 2026</strong></p>
      <h3>Editor</h3>
      <p>Olympe et odin (SIRET 91457466000025) - contact@eatsok.app</p>
      <h3>Hospedagem</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Propriedade intelectual</h3>
      <p>Marca, logotipo e conteudos protegidos. Reutilizacao requer autorizacao.</p>
      <h3>Protecao de dados</h3>
      <p>Para qualquer solicitacao: vgaillard85@gmail.com.app</p>`,
    disclaimer: `
      <h1>Isencao de responsabilidade</h1>
      <p>Informacoes sobre recalls nos EUA apenas para fins informativos.</p>
      <p>Fontes publicas (FDA, USDA). Sem garantia de exatidao ou atualizacao.</p>
      <p>Nao substitui avisos oficiais. Verifique com fontes oficiais.</p>
      <p>A ausencia de recall nao garante seguranca. Nao e conselho medico.</p>
      <p>Possiveis erros em codigos/lotes. O usuario verifica os detalhes.</p>
    `
  },
  de: {
    privacy: `      <h1>Datenschutzerklaerung - Numeline</h1>
      <p><strong>Letzte Aktualisierung: 14. Januar 2026</strong></p>
      <p>Numeline ist eine mobile App von Olympe et odin (SIRET 91457466000025). Diese Richtlinie erklaert, wie wir Informationen erheben und nutzen.</p>
      <h3>Verantwortlicher</h3>
      <p>Olympe et odin, Frankreich. Kontakt: vgaillard85@gmail.com.app</p>
      <h3>Welche Daten wir erheben</h3>
      <ul>
        <li>Kontodaten: E-Mail-Adresse und Authentifizierungskennungen (Firebase Authentication).</li>
        <li>Profilinformationen, die Sie oder Ihr Anmeldeanbieter bereitstellen (Anzeigename, Profilfoto).</li>
        <li>Scan-Daten: Marke, Chargennummer, Produktname, Produktbild-URL, Zeitstempel, Rueckrufstatus.</li>
        <li>Organisationsdaten (Team-Funktionen): Organisationsname, Mitglieder-E-Mails, Rollen.</li>
        <li>Abo-Daten: Plan, Limits und Laufzeit, wenn Sie einen Plan waehlen.</li>
        <li>Einstellungen auf Ihrem Geraet: Sprache, Theme, Benachrichtigungen, Onboarding-Status.</li>
        <li>Support-Kommunikation, die Sie an uns senden.</li>
        <li>Geraete- und Sicherheitsdaten von Firebase (Geraete-IDs, IP-Adresse, Sicherheitsprotokolle).</li>
      </ul>
      <h3>Kamerabilder und OCR</h3>
      <ul>
        <li>Bilder, die fuer Barcode- oder Chargenerkennung aufgenommen werden, werden auf dem Geraet verarbeitet und nach der Verarbeitung geloescht.</li>
        <li>Wenn der Cloud-Vision-Fallback aktiviert ist, koennen Bilder an Google Cloud Vision gesendet werden, um Text zu extrahieren.</li>
      </ul>
      <h3>Welche Daten wir nicht erheben</h3>
      <ul>
        <li>Genauer Standort.</li>
        <li>Ihre Kontakte oder Adressbuch.</li>
        <li>Zahlungskartendaten (Zahlungen ueber den Store).</li>
      </ul>
      <h3>Wie wir Daten nutzen</h3>
      <ul>
        <li>Bereitstellung des Dienstes, Kontoverwaltung und Speicherung der Scan-Historie.</li>
        <li>Pruefung von Produkten mit Rueckrufquellen und Versand von Warnungen, wenn Benachrichtigungen aktiviert sind.</li>
        <li>Sicherheit aufrechterhalten, Missbrauch verhindern und den Dienst verbessern.</li>
        <li>Support-Anfragen beantworten.</li>
      </ul>
      <h3>Weitergabe und Anbieter</h3>
      <p>Wir verkaufen keine personenbezogenen Daten. Wir teilen Daten nur mit notwendigen Anbietern:</p>
      <ul>
        <li>Google Firebase (Authentication und Firestore-Datenbank).</li>
        <li>Google Sign-In (wenn Sie Google-Anmeldung waehlen).</li>
        <li>Google Cloud Vision (nur wenn der OCR-Fallback aktiviert ist).</li>
        <li>Open Food Facts fuer Barcode-Suche sowie FDA/USDA fuer Rueckrufe.</li>
      </ul>
      <h3>Speicherdauer</h3>
      <p>Konto- und Scan-Daten werden gespeichert, solange Ihr Konto aktiv ist, und bei Loeschung entfernt. Lokale Daten verbleiben auf Ihrem Geraet, bis Sie App-Daten loeschen oder die App deinstallieren.</p>
      <h3>Ihre Rechte</h3>
      <p>Sie koennen Auskunft, Berichtigung, Loeschung oder Datenuebertragbarkeit verlangen. Kontakt: vgaillard85@gmail.com.app</p>
      <h3>Internationale Uebermittlungen</h3>
      <p>Einige Anbieter koennen Daten ausserhalb Ihres Landes verarbeiten. Wir verwenden geeignete Schutzmassnahmen, wenn erforderlich.</p>
      <h3>Aenderungen</h3>
      <p>Wir koennen diese Richtlinie aktualisieren und das Datum oben anpassen.</p>`,
    terms: `      <h1>Nutzungsbedingungen - Numeline</h1>
      <p><strong>Letzte Aktualisierung: 14. Januar 2026</strong></p>
      <p>Diese Bedingungen regeln die Nutzung von Numeline, einer mobilen App von Olympe et odin (SIRET 91457466000025).</p>
      <h3>Dienst</h3>
      <ul>
        <li>Barcodes und Chargennummern scannen.</li>
        <li>Produkte mit oeffentlichen Rueckrufquellen pruefen.</li>
        <li>Rueckrufwarnungen erhalten und Scan-Historie speichern.</li>
      </ul>
      <p>Die Rueckrufabdeckung ist auf in den USA verkaufte Lebensmittel beschraenkt. Quellen: FDA, USDA und Open Food Facts.</p>
      <h3>Konten und Sicherheit</h3>
      <p>Sie sind fuer die Sicherheit Ihrer Zugangsdaten und fuer Aktivitaeten in Ihrem Konto verantwortlich.</p>
      <h3>Zulaessige Nutzung</h3>
      <ul>
        <li>Die App nicht fuer illegale Zwecke nutzen.</li>
        <li>Keine Scan-Limits oder Sicherheitskontrollen umgehen.</li>
        <li>Den Dienst nicht dekompilieren oder missbrauchen.</li>
      </ul>
      <h3>Abonnements und Kaeufe</h3>
      <p>Zahlungen werden ueber den Store abgewickelt. Preise, Verlaengerungen und Kuendigungen werden im Store verwaltet.</p>
      <h3>Hinweis</h3>
      <p>Die App liefert Rueckrufinformationen nur zu Informationszwecken und bietet keine medizinische oder rechtliche Beratung. Bitte immer bei offiziellen Quellen pruefen.</p>
      <h3>Haftungsbeschraenkung</h3>
      <p>Soweit gesetzlich zulaessig, wird die App ohne Gewaehrleistung bereitgestellt. Wir haften nicht fuer indirekte oder Folgeschaeden.</p>
      <h3>Anwendbares Recht</h3>
      <p>Diese Bedingungen unterliegen franzoesischem Recht.</p>
      <h3>Kontakt</h3>
      <p>Kontakt: contact@eatsok.app</p>`,
    notice: `      <h1>Rechtlicher Hinweis - Numeline</h1>
      <p><strong>Letzte Aktualisierung: 14. Januar 2026</strong></p>
      <h3>Herausgeber</h3>
      <p>Olympe et odin (SIRET 91457466000025) - contact@eatsok.app</p>
      <h3>Hosting</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Urheberrecht</h3>
      <p>Marke, Logo und Inhalte sind geschuetzt. Wiederverwendung erfordert Genehmigung.</p>
      <h3>Datenschutz</h3>
      <p>Fuer Anfragen: vgaillard85@gmail.com.app</p>`,
    disclaimer: `
      <h1>Haftungsausschluss</h1>
      <p>Rueckrufinformationen fuer die USA nur zu Informationszwecken.</p>
      <p>Oeffentliche Quellen (FDA, USDA). Keine Garantie fuer Genauigkeit oder Aktualitaet.</p>
      <p>Kein Ersatz fuer offizielle Mitteilungen. Immer mit offiziellen Quellen pruefen.</p>
      <p>Kein medizinischer Rat. Nutzer pruefen Produktdetails und Rueckrufstatus.</p>
    `
  }
};

function normalizeLocale(locale?: string): LegalLocale {
  const lang = (locale || 'en').split('-')[0].toLowerCase();
  if (['en', 'fr', 'es', 'it', 'pt', 'de'].includes(lang)) {
    return lang as LegalLocale;
  }
  return 'en';
}

export function getLegalDocumentHtml(type: LegalDocType, locale?: string): string {
  const lang = normalizeLocale(locale);
  return LEGAL_HTML[lang][type] ?? LEGAL_HTML.en[type];
}



