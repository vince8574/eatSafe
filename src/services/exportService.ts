import * as FileSystem from 'expo-file-system/legacy';
import { EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';
import * as XLSX from 'xlsx';
import { ScannedProduct } from '../types';
import { t, getCurrentLanguage } from '../i18n/i18n';

export type ExportFormat = 'pdf' | 'csv' | 'xlsx';

interface ExportOptions {
  products: ScannedProduct[];
  format: ExportFormat;
  regulatoryFormat?: boolean;
  companyName?: string;
  siteName?: string;
}

function getLocale(): string {
  const lang = getCurrentLanguage();
  const localeMap: Record<string, string> = {
    fr: 'fr-FR', en: 'en-US', de: 'de-DE', es: 'es-ES', it: 'it-IT',
    ar: 'ar-SA', zh: 'zh-CN', ja: 'ja-JP', nl: 'nl-NL', pt: 'pt-PT',
    ru: 'ru-RU', sq: 'sq-AL', sr: 'sr-RS', me: 'sr-ME'
  };
  return localeMap[lang] || 'en-US';
}

function formatDate(dateStr: string): string {
  return dateStr ? new Date(dateStr).toLocaleDateString(getLocale()) : '';
}

function generateCSV(products: ScannedProduct[], regulatoryFormat: boolean = false): string {
  if (regulatoryFormat) {
    const headers = [
      t('export.controlDate'),
      t('export.brand'),
      t('export.lotNumber'),
      t('export.status'),
      t('export.recallReference'),
      t('export.controller'),
      t('export.observations')
    ].join(',');

    const rows = products.map(p => [
      formatDate(p.scannedAt),
      `"${p.brand}"`,
      `"${p.lotNumber}"`,
      p.recallStatus === 'recalled' ? t('export.recalled') : t('export.compliant'),
      p.recallReference || 'N/A',
      '',
      ''
    ].join(','));

    return [headers, ...rows].join('\n');
  } else {
    const headers = [
      t('export.date'),
      t('export.brand'),
      t('export.lotNumber'),
      t('export.status'),
      t('export.recallReference')
    ].join(',');

    const rows = products.map(p => [
      formatDate(p.scannedAt),
      `"${p.brand}"`,
      `"${p.lotNumber}"`,
      p.recallStatus === 'recalled' ? t('export.recalled') : t('export.secured'),
      p.recallReference || 'N/A'
    ].join(','));

    return [headers, ...rows].join('\n');
  }
}

async function generateExcel(products: ScannedProduct[], regulatoryFormat: boolean = false): Promise<string> {
  const worksheet = regulatoryFormat
    ? XLSX.utils.json_to_sheet(
        products.map(p => ({
          [t('export.controlDate')]: formatDate(p.scannedAt),
          [t('export.brand')]: p.brand,
          [t('export.lotNumber')]: p.lotNumber,
          [t('export.status')]: p.recallStatus === 'recalled' ? t('export.recalled') : t('export.compliant'),
          [t('export.recallReference')]: p.recallReference || 'N/A',
          [t('export.controller')]: '',
          [t('export.observations')]: ''
        }))
      )
    : XLSX.utils.json_to_sheet(
        products.map(p => ({
          [t('export.date')]: formatDate(p.scannedAt),
          [t('export.brand')]: p.brand,
          [t('export.lotNumber')]: p.lotNumber,
          [t('export.status')]: p.recallStatus === 'recalled' ? t('export.recalled') : t('export.secured'),
          [t('export.recallReference')]: p.recallReference || 'N/A'
        }))
      );

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, t('export.sheetName'));

  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });

  const fileName = `history_${Date.now()}.xlsx`;
  const fileUri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: EncodingType.Base64
  });

  return fileUri;
}

function generateHTMLForPDF(products: ScannedProduct[], regulatoryFormat: boolean = false, companyName?: string, siteName?: string): string {
  const now = new Date().toLocaleDateString(getLocale());

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
          <h1>${t('export.pdfTitle')}</h1>
          ${companyName ? `<p class="info"><strong>${t('export.establishment')}:</strong> ${companyName}</p>` : ''}
          ${siteName ? `<p class="info"><strong>${t('export.site')}:</strong> ${siteName}</p>` : ''}
          <p class="info"><strong>${t('export.editionDate')}:</strong> ${now}</p>
          <p class="info"><strong>${t('export.productsControlled')}:</strong> ${products.length}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t('export.controlDate')}</th>
              <th>${t('export.brand')}</th>
              <th>${t('export.lotNumber')}</th>
              <th>${t('export.status')}</th>
              <th>${t('export.recallReference')}</th>
              <th>${t('export.controller')}</th>
              <th>${t('export.observations')}</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>${formatDate(p.scannedAt)}</td>
                <td>${p.brand}</td>
                <td>${p.lotNumber}</td>
                <td class="${p.recallStatus === 'recalled' ? 'recalled' : 'safe'}">
                  ${p.recallStatus === 'recalled' ? t('export.recalled') : t('export.compliant')}
                </td>
                <td>${p.recallReference || 'N/A'}</td>
                <td></td>
                <td></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="signature">
          <p><strong>${t('export.signatureLabel')}:</strong></p>
          <div class="signature-line"></div>
        </div>

        <div class="footer">
          <p>${t('export.footerRegulatory')}</p>
          <p><em>${t('export.footerRegulatoryNote')}</em></p>
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
        <h1>${t('export.scanHistoryTitle')}</h1>
        <p class="info">${t('export.generatedOn', { date: now })} &bull; ${products.length} ${t('export.products')}</p>

        <table>
          <thead>
            <tr>
              <th>${t('export.date')}</th>
              <th>${t('export.brand')}</th>
              <th>${t('export.lotNumber')}</th>
              <th>${t('export.status')}</th>
              <th>${t('export.recallReference')}</th>
            </tr>
          </thead>
          <tbody>
            ${products.map(p => `
              <tr>
                <td>${formatDate(p.scannedAt)}</td>
                <td>${p.brand}</td>
                <td>${p.lotNumber}</td>
                <td class="${p.recallStatus === 'recalled' ? 'recalled' : 'safe'}">
                  ${p.recallStatus === 'recalled' ? t('export.recalled') : t('export.secured')}
                </td>
                <td>${p.recallReference || 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>${t('export.footerStandard')}</p>
        </div>
      </body>
      </html>
    `;
  }
}

async function generatePDF(products: ScannedProduct[], regulatoryFormat: boolean = false, companyName?: string, siteName?: string): Promise<string> {
  const html = generateHTMLForPDF(products, regulatoryFormat, companyName, siteName);

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false
    });

    return uri;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error(t('export.pdfError'));
  }
}

export async function exportProducts(options: ExportOptions): Promise<void> {
  const { products, format, regulatoryFormat = false, companyName, siteName } = options;

  if (products.length === 0) {
    throw new Error(t('export.noProducts'));
  }

  let fileUri: string;
  let fileName: string;

  switch (format) {
    case 'csv':
      fileName = `history_${Date.now()}.csv`;
      fileUri = `${FileSystem.documentDirectory}${fileName}`;
      const csvContent = generateCSV(products, regulatoryFormat);
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: EncodingType.UTF8
      });
      break;

    case 'xlsx':
      fileUri = await generateExcel(products, regulatoryFormat);
      break;

    case 'pdf':
      fileUri = await generatePDF(products, regulatoryFormat, companyName, siteName);
      break;

    default:
      throw new Error(t('export.unsupportedFormat', { format }));
  }

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(fileUri);
  } else {
    throw new Error(t('export.sharingNotAvailable'));
  }
}

export function canExport(format: ExportFormat, allowedFormats: ExportFormat[]): boolean {
  return allowedFormats.includes(format);
}
