type LegalDocType = 'privacy' | 'terms' | 'notice' | 'disclaimer';

type LegalLocale = 'en' | 'fr' | 'es' | 'it' | 'pt' | 'de';

type LegalContent = Record<LegalLocale, Record<LegalDocType, string>>;

const LEGAL_HTML: LegalContent = {
  en: {
    privacy: `
      <h1>Privacy Policy - Numeline</h1>
      <p><strong>Last updated: December 12, 2025</strong></p>
      <p>Numeline protects your personal data. We collect only what is necessary to run the app and keep you informed about recalls.</p>
      <h3>Data we do not keep</h3>
      <ul>
        <li>Product photos (deleted right after analysis)</li>
        <li>Navigation history, contacts, precise location, or payment data</li>
      </ul>
      <h3>Data stored</h3>
      <ul>
        <li>Language preference</li>
        <li>Scan history on your device</li>
        <li>Optional profile information you provide</li>
      </ul>
      <h3>Your rights</h3>
      <p>You can request access, correction, deletion, or portability of your data. Contact: privacy@eatsok.app</p>
      <p><em>Your privacy matters to us.</em></p>
    `,
    terms: `
      <h1>Terms of Service - Numeline</h1>
      <p><strong>Last updated: December 12, 2025</strong></p>
      <h3>Purpose</h3>
      <p>These terms govern the use of the Numeline mobile app.</p>
      <h3>Service</h3>
      <ul>
        <li>Scan products to check recall status</li>
        <li>Receive alerts for recalls</li>
        <li>Keep a scan history</li>
      </ul>
      <h3>User responsibility</h3>
      <p>Use the app as intended and verify information with official sources.</p>
      <h3>Limitation of liability</h3>
      <p>No warranty, express or implied, is provided regarding the accuracy or completeness of the information.</p>
      <p>Contact: contact@eatsok.app</p>
    `,
    notice: `
      <h1>Legal Notice - Numeline</h1>
      <p><strong>Last updated: December 12, 2025</strong></p>
      <h3>Publisher</h3>
      <p>Numeline â€” contact@eatsok.app</p>
      <h3>Hosting</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Intellectual property</h3>
      <p>Brand, logo, and content are protected. Reuse requires prior authorization.</p>
      <h3>Data protection</h3>
      <p>For any request: privacy@eatsok.app</p>
    `,
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
    privacy: `
      <h1>Politique de confidentialite - Numeline</h1>
      <p><strong>Derniere mise a jour : 12 decembre 2025</strong></p>
      <p>Numeline protege vos donnees personnelles et collecte uniquement ce qui est necessaire pour fonctionner.</p>
      <h3>Donnees non conservees</h3>
      <ul>
        <li>Photos de produits (supprimees apres analyse)</li>
        <li>Historique de navigation, contacts, localisation precise, donnees bancaires</li>
      </ul>
      <h3>Donnees stockees</h3>
      <ul>
        <li>Preference de langue</li>
        <li>Historique des scans sur votre appareil</li>
        <li>Informations facultatives fournies par vous</li>
      </ul>
      <h3>Vos droits</h3>
      <p>Acces, rectification, suppression, portabilite : privacy@eatsok.app</p>
      <p><em>Votre vie privee compte pour nous.</em></p>
    `,
    terms: `
      <h1>Conditions Generales d'Utilisation - Numeline</h1>
      <p><strong>Derniere mise a jour : 12 decembre 2025</strong></p>
      <h3>Objet</h3>
      <p>Ces conditions encadrent l'usage de l'application mobile Numeline.</p>
      <h3>Service</h3>
      <ul>
        <li>Scanner les produits pour verifier leur statut de rappel</li>
        <li>Recevoir des alertes de rappel</li>
        <li>Consulter l'historique des scans</li>
      </ul>
      <h3>Responsabilite utilisateur</h3>
      <p>Utiliser l'application de maniere conforme et verifier les informations aupres des sources officielles.</p>
      <h3>Limitation de responsabilite</h3>
      <p>Aucune garantie, explicite ou implicite, n'est fournie sur l'exactitude ou l'exhaustivite des informations.</p>
      <p>Contact : contact@eatsok.app</p>
    `,
    notice: `
      <h1>Mentions legales - Numeline</h1>
      <p><strong>Derniere mise a jour : 12 decembre 2025</strong></p>
      <h3>Editeur</h3>
      <p>Numeline â€” contact@eatsok.app</p>
      <h3>Hebergement</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Propriete intellectuelle</h3>
      <p>Marque, logo et contenus proteges. Reutilisation soumise a autorisation.</p>
      <h3>Donnees personnelles</h3>
      <p>Pour toute demande : privacy@eatsok.app</p>
    `,
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
    privacy: `
      <h1>Politica de privacidad - Numeline</h1>
      <p><strong>Ultima actualizacion: 12 de diciembre de 2025</strong></p>
      <p>Protegemos tus datos y solo recopilamos lo necesario para operar la aplicacion.</p>
      <h3>Datos que no guardamos</h3>
      <ul>
        <li>Fotos de productos (se borran tras el analisis)</li>
        <li>Historial de navegacion, contactos, ubicacion precisa o pagos</li>
      </ul>
      <h3>Datos almacenados</h3>
      <ul>
        <li>Idioma preferido</li>
        <li>Historial de escaneos en tu dispositivo</li>
        <li>Informacion opcional que proporciones</li>
      </ul>
      <h3>Tus derechos</h3>
      <p>Acceso, rectificacion o borrado: privacy@eatsok.app</p>
    `,
    terms: `
      <h1>Terminos de servicio - Numeline</h1>
      <p><strong>Ultima actualizacion: 12 de diciembre de 2025</strong></p>
      <h3>Servicio</h3>
      <ul>
        <li>Escanear productos y revisar alertas de retiro</li>
        <li>Recibir alertas</li>
        <li>Historial de escaneos</li>
      </ul>
      <h3>Responsabilidad</h3>
      <p>Usa la app como previsto y verifica siempre con fuentes oficiales.</p>
      <h3>Limitacion de responsabilidad</h3>
      <p>No se ofrece garantia expresa ni implicita sobre la exactitud o integridad de la informacion.</p>
    `,
    notice: `
      <h1>Aviso legal - Numeline</h1>
      <p><strong>Ultima actualizacion: 12 de diciembre de 2025</strong></p>
      <h3>Editor</h3>
      <p>Numeline â€” contact@eatsok.app</p>
      <h3>Alojamiento</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Propiedad intelectual</h3>
      <p>Marca, logotipo y contenidos protegidos. Requiere autorizacion para reutilizar.</p>
    `,
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
    privacy: `
      <h1>Informativa sulla privacy - Numeline</h1>
      <p><strong>Ultimo aggiornamento: 12 dicembre 2025</strong></p>
      <p>Tutela dei dati personali con raccolta minima per far funzionare l'app.</p>
      <h3>Dati non conservati</h3>
      <ul>
        <li>Foto dei prodotti (cancellate dopo l'analisi)</li>
        <li>Cronologia di navigazione, contatti, posizione precisa o pagamenti</li>
      </ul>
      <h3>Dati conservati</h3>
      <ul>
        <li>Lingua preferita</li>
        <li>Cronologia delle scansioni sul dispositivo</li>
        <li>Dati facoltativi forniti dall'utente</li>
      </ul>
      <h3>Diritti</h3>
      <p>Accesso, rettifica o cancellazione: privacy@eatsok.app</p>
    `,
    terms: `
      <h1>Termini di servizio - Numeline</h1>
      <p><strong>Ultimo aggiornamento: 12 dicembre 2025</strong></p>
      <h3>Servizio</h3>
      <ul>
        <li>Scanner per verificare i richiami</li>
        <li>Avvisi e cronologia</li>
      </ul>
      <h3>Responsabilita</h3>
      <p>Usare l'app correttamente e verificare con fonti ufficiali.</p>
      <h3>Limitazione di responsabilita</h3>
      <p>Nessuna garanzia espressa o implicita sull'esattezza o completezza delle informazioni.</p>
    `,
    notice: `
      <h1>Note legali - Numeline</h1>
      <p><strong>Ultimo aggiornamento: 12 dicembre 2025</strong></p>
      <h3>Editore</h3>
      <p>Numeline â€” contact@eatsok.app</p>
      <h3>Hosting</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Proprieta intellettuale</h3>
      <p>Marchio, logo e contenuti protetti. Riutilizzo solo con autorizzazione.</p>
    `,
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
    privacy: `
      <h1>Politica de privacidade - Numeline</h1>
      <p><strong>Ultima atualizacao: 12 de dezembro de 2025</strong></p>
      <p>Protegemos os seus dados e coletamos apenas o necessario.</p>
      <h3>Dados nao mantidos</h3>
      <ul>
        <li>Fotos de produtos (apagadas apos analise)</li>
        <li>Historico de navegacao, contatos, localizacao precisa ou pagamentos</li>
      </ul>
      <h3>Dados mantidos</h3>
      <ul>
        <li>Idioma preferido</li>
        <li>Historico de scans no dispositivo</li>
        <li>Informacoes opcionais fornecidas por voce</li>
      </ul>
      <h3>Seus direitos</h3>
      <p>Acesso, correcao ou exclusao: privacy@eatsok.app</p>
    `,
    terms: `
      <h1>Termos de servico - Numeline</h1>
      <p><strong>Ultima atualizacao: 12 de dezembro de 2025</strong></p>
      <h3>Servico</h3>
      <ul>
        <li>Escanear produtos e verificar recalls</li>
        <li>Alertas e historico</li>
      </ul>
      <h3>Responsabilidade</h3>
      <p>Usar o app corretamente e verificar com fontes oficiais.</p>
      <h3>Limitacao de responsabilidade</h3>
      <p>Nenhuma garantia expressa ou implicita sobre precisao ou completude das informacoes.</p>
    `,
    notice: `
      <h1>Aviso legal - Numeline</h1>
      <p><strong>Ultima atualizacao: 12 de dezembro de 2025</strong></p>
      <h3>Editora</h3>
      <p>Numeline â€” contact@eatsok.app</p>
      <h3>Hospedagem</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Propriedade intelectual</h3>
      <p>Marca, logotipo e conteudos protegidos. Reutilizacao somente com autorizacao.</p>
    `,
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
    privacy: `
      <h1>Datenschutzerklarung - Numeline</h1>
      <p><strong>Letzte Aktualisierung: 12. Dezember 2025</strong></p>
      <p>Wir schuetzen Ihre Daten und erheben nur das Notwendige.</p>
      <h3>Nicht gespeicherte Daten</h3>
      <ul>
        <li>Produktfotos (werden nach der Analyse geloescht)</li>
        <li>Surfverlauf, Kontakte, exakte Standortdaten oder Zahlungsdaten</li>
      </ul>
      <h3>Gespeicherte Daten</h3>
      <ul>
        <li>Sprachwahl</li>
        <li>Scanverlauf auf Ihrem Geraet</li>
        <li>Optionale Angaben von Ihnen</li>
      </ul>
      <h3>Ihre Rechte</h3>
      <p>Auskunft, Berichtigung oder Loeschung: privacy@eatsok.app</p>
    `,
    terms: `
      <h1>Nutzungsbedingungen - Numeline</h1>
      <p><strong>Letzte Aktualisierung: 12. Dezember 2025</strong></p>
      <h3>Service</h3>
      <ul>
        <li>Produkte scannen und Rueckrufe pruefen</li>
        <li>Warnungen und Verlauf</li>
      </ul>
      <h3>Verantwortung</h3>
      <p>App korrekt nutzen und immer mit offiziellen Quellen abgleichen.</p>
      <h3>Haftungsbeschraenkung</h3>
      <p>Keine ausdrueckliche oder stillschweigende Garantie fuer Richtigkeit oder Vollstaendigkeit.</p>
    `,
    notice: `
      <h1>Rechtliche Hinweise - Numeline</h1>
      <p><strong>Letzte Aktualisierung: 12. Dezember 2025</strong></p>
      <h3>Herausgeber</h3>
      <p>Numeline â€” contact@eatsok.app</p>
      <h3>Hosting</h3>
      <p>Google Firebase, 1600 Amphitheatre Parkway, Mountain View, CA 94043, USA</p>
      <h3>Urheberrecht</h3>
      <p>Marke, Logo und Inhalte sind geschuetzt. Wiederverwendung nur mit Zustimmung.</p>
    `,
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

