import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { ScannedProduct } from '../types';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

interface ExportOptions {
  products: ScannedProduct[];
  format: ExportFormat;
  regulatoryFormat?: boolean;
  companyName?: string;
  siteName?: string;
}

// Expo SDK 54: certaines builds retournent EncodingType undefined.
// On fournit un fallback pour éviter les erreurs "Cannot read property 'Base64' of undefined".
const Encoding = (FileSystem as any)?.EncodingType ?? { UTF8: 'utf8', Base64: 'base64' };

/**
 * Génère un CSV à partir des produits scannés
 */
function generateCSV(products: ScannedProduct[], regulatoryFormat: boolean = false): string {
  if (regulatoryFormat) {
    // Format réglementaire pour crèches/écoles
    const headers = [
      'Date de contrôle',
      'Marque',
      'Numéro de lot',
      'Statut',
      'Référence rappel',
      'Contrôleur',
      'Observations'
    ].join(',');

    const rows = products.map(p => [
      p.scannedAt ? new Date(p.scannedAt).toLocaleDateString('fr-FR') : '',
      `"${p.brand}"`,
      `"${p.lotNumber}"`,
      p.recallStatus === 'recalled' ? 'RAPPELÉ' : 'CONFORME',
      p.recallReference || 'N/A',
      '', // Contrôleur - à remplir
      '' // Observations - à remplir
    ].join(','));

    return [headers, ...rows].join('\n');
  } else {
    // Format standard
    const headers = ['Date', 'Marque', 'Numéro de lot', 'Statut', 'Référence rappel'].join(',');
    const rows = products.map(p => [
      p.scannedAt ? new Date(p.scannedAt).toLocaleDateString('fr-FR') : '',
      `"${p.brand}"`,
      `"${p.lotNumber}"`,
      p.recallStatus === 'recalled' ? 'RAPPELÉ' : 'SÉCURISÉ',
      p.recallReference || 'N/A'
    ].join(','));

    return [headers, ...rows].join('\n');
  }
}

/**
 * Génère un fichier Excel (.xlsx) à partir des produits scannés
 */
async function generateExcel(products: ScannedProduct[], regulatoryFormat: boolean = false): Promise<string> {
  const worksheet = regulatoryFormat
    ? XLSX.utils.json_to_sheet(
        products.map(p => ({
          'Date de contrôle': p.scannedAt ? new Date(p.scannedAt).toLocaleDateString('fr-FR') : '',
          'Marque': p.brand,
          'Numéro de lot': p.lotNumber,
          'Statut': p.recallStatus === 'recalled' ? 'RAPPELÉ' : 'CONFORME',
          'Référence rappel': p.recallReference || 'N/A',
          'Contrôleur': '',
          'Observations': ''
        }))
      )
    : XLSX.utils.json_to_sheet(
        products.map(p => ({
          'Date': p.scannedAt ? new Date(p.scannedAt).toLocaleDateString('fr-FR') : '',
          'Marque': p.brand,
          'Numéro de lot': p.lotNumber,
          'Statut': p.recallStatus === 'recalled' ? 'RAPPELÉ' : 'SÉCURISÉ',
          'Référence rappel': p.recallReference || 'N/A'
        }))
      );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Historique');

  // Convertir en base64
  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

  // Sauvegarder le fichier
  const fileName = `historique_${Date.now()}.xlsx`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: Encoding.Base64
  });

  return fileUri;
}

/**
 * Génère un HTML pour le PDF
 */
function generateHTMLForPDF(products: ScannedProduct[], regulatoryFormat: boolean = false, companyName?: string, siteName?: string): string {
  const now = new Date().toLocaleDateString('fr-FR');

  if (regulatoryFormat) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0A1F1F; border-bottom: 3px solid #0A1F1F; padding-bottom: 10px; }
          .header { margin-bottom: 30px; }
          .info { margin: 5px 0; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
          th { background-color: #0A1F1F; color: white; font-weight: bold; }
          .recalled { background-color: #ffe6e6; color: #c00; font-weight: bold; }
          .safe { background-color: #e6ffe6; color: #060; font-weight: bold; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
          .signature { margin-top: 60px; }
          .signature-line { border-top: 1px solid #000; width: 200px; margin-top: 40px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REGISTRE DE CONTRÔLE DES LOTS</h1>
          ${companyName ? `<p class="info"><strong>Établissement:</strong> ${companyName}</p>` : ''}
          ${siteName ? `<p class="info"><strong>Site:</strong> ${siteName}</p>` : ''}
          <p class="info"><strong>Date d'édition:</strong> ${now}</p>
          <p class="info"><strong>Nombre de produits contrôlés:</strong> ${products.length}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Date de contrôle</th>
              <th>Marque</th>
              <th>Numéro de lot</th>
              <th>Statut</th>
              <th>Référence rappel</th>
              <th>Contrôleur</th>
              <th>Observations</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>${p.scannedAt ? new Date(p.scannedAt).toLocaleDateString('fr-FR') : ''}</td>
                <td>${p.brand}</td>
                <td>${p.lotNumber}</td>
                <td class="${p.recallStatus === 'recalled' ? 'recalled' : 'safe'}">
                  ${p.recallStatus === 'recalled' ? 'RAPPELÉ' : 'CONFORME'}
                </td>
                <td>${p.recallReference || 'N/A'}</td>
                <td></td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signature">
          <p><strong>Signature du responsable:</strong></p>
          <div class="signature-line"></div>
        </div>

        <div class="footer">
          <p>Document généré automatiquement par Numeline</p>
          <p><em>Ce document doit être conservé conformément à la réglementation en vigueur.</em></p>
        </div>
      </body>
      </html>
    `;
  } else {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          h1 { color: #0A1F1F; }
          .info { margin-bottom: 20px; color: #666; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
          th { background-color: #0A1F1F; color: white; }
          .recalled { background-color: #ffe6e6; color: #c00; font-weight: bold; }
          .safe { color: #060; }
          .footer { margin-top: 30px; font-size: 12px; color: #999; }
        </style>
      </head>
      <body>
        <h1>Historique des scans</h1>
        <p class="info">Généré le ${now} • ${products.length} produits</p>

        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Marque</th>
              <th>Numéro de lot</th>
              <th>Statut</th>
              <th>Référence rappel</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>${p.scannedAt ? new Date(p.scannedAt).toLocaleDateString('fr-FR') : ''}</td>
                <td>${p.brand}</td>
                <td>${p.lotNumber}</td>
                <td class="${p.recallStatus === 'recalled' ? 'recalled' : 'safe'}">
                  ${p.recallStatus === 'recalled' ? 'RAPPELÉ' : 'SÉCURISÉ'}
                </td>
                <td>${p.recallReference || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Document généré par Numeline</p>
        </div>
      </body>
      </html>
    `;
  }
}

/**
 * Génère un PDF à partir des produits scannés
 * Utilise expo-print au lieu de react-native-html-to-pdf
 */
async function generatePDF(products: ScannedProduct[], regulatoryFormat: boolean = false, companyName?: string, siteName?: string): Promise<string> {
  const html = generateHTMLForPDF(products, regulatoryFormat, companyName, siteName);

  try {
    // Générer le PDF avec expo-print
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });

    return uri;
  } catch (error) {
    console.error('Erreur lors de la génération du PDF:', error);
    throw new Error('Impossible de générer le PDF. Vérifiez que expo-print est bien installé.');
  }
}

/**
 * Exporte les produits scannés dans le format spécifié
 */
export async function exportProducts(options: ExportOptions): Promise<void> {
  const { products, format, regulatoryFormat = false, companyName, siteName } = options;

  if (products.length === 0) {
    throw new Error('Aucun produit à exporter');
  }

  let fileUri: string;
  let fileName: string;

  switch (format) {
    case 'csv':
      fileName = `historique_${Date.now()}.csv`;
      fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const csvContent = generateCSV(products, regulatoryFormat);
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: Encoding.UTF8
      });
      break;

    case 'xlsx':
      fileUri = await generateExcel(products, regulatoryFormat);
      break;

    case 'pdf':
      fileUri = await generatePDF(products, regulatoryFormat, companyName, siteName);
      break;

    default:
      throw new Error(`Format non supporté: ${format}`);
  }

  // Partager le fichier
  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri);
  } else {
    throw new Error('Le partage de fichiers n\'est pas disponible sur cet appareil');
  }
}

/**
 * Vérifie si l'export est disponible pour le format donné
 */
export function canExport(format: ExportFormat, allowedFormats: ExportFormat[]): boolean {
  return allowedFormats.includes(format);
}