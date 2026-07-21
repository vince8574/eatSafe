export type RecallStatus = 'unknown' | 'safe' | 'recalled' | 'warning';

export type CountryCode = 'FR' | 'US' | 'CH';

export type ScannedProduct = {
  id: string;
  brand: string;
  lotNumber: string;
  scannedAt: number;
  recallStatus: RecallStatus;
  recallReference?: string;
  lastCheckedAt?: number;
  productName?: string;
  productImage?: string;
  scannedBy?: string; // User ID who scanned this product
};

export type RecallRecord = {
  id: string;
  title: string;
  description?: string;
  lotNumbers: string[];
  // Texte d'identification BRUT publié par la FDA (code_info) / USDA
  // (field_product_items). Quand lotNumbers est vide (rappel sans lots publiés,
  // ex. Taylor Farms : lots dans un PDF), c'est la SEULE info d'identification
  // (dates "Best if Used By", descriptions produit…) → affichée telle quelle à
  // l'utilisateur pour qu'il vérifie lui-même son produit.
  codeInfo?: string;
  brand?: string;
  productCategory?: string;
  country: CountryCode;
  publishedAt: string;
  link?: string;
  imageUrl?: string;
  // Provenance de l'enregistrement :
  // - 'fda-press' : flux RSS OFFICIEL de la FDA "Recalls, Market Withdrawals &
  //   Safety Alerts" (servi par le proxy fdaPress ; Google News n'est que le
  //   repli réseau du même flux). Récents, peu nombreux, dignes d'une alerte →
  //   SEULE source autorisée à produire le statut 'warning' (rappel sans lot).
  // - 'fda' / 'usda' : bases enforcement. Leurs milliers d'anciens
  //   enregistrements sans lot n'alertent JAMAIS (source du spam du 20/07) ;
  //   ils matchent par numéro de lot uniquement.
  source?: 'fda' | 'usda' | 'fda-press';
};

export type OCRResult = {
  text: string;
  confidence?: number;
  lines: Array<{ content: string; confidence?: number }>;
  source?: 'mlkit' | 'vision-fallback' | 'claude-fallback' | 'cloud-ocr' | 'none';
};

export type ApiError = {
  message: string;
  code?: string;
  status?: number;
};
