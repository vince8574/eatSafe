import { RecallRecord } from '../types';

/**
 * Extracts the recall reason from the title or description
 */
export function extractRecallReason(recall: RecallRecord): string {
  const title = recall.title.toLowerCase();
  const description = recall.description?.toLowerCase() || '';
  const text = `${title} ${description}`;

  // Common recall reasons (English keywords for FDA/USDA data)
  if (text.includes('salmonella')) {
    return 'Salmonella contamination';
  }
  if (text.includes('listeria')) {
    return 'Listeria contamination';
  }
  if (text.includes('e.coli') || text.includes('e. coli')) {
    return 'E. coli contamination';
  }
  if (text.includes('allergen') || text.includes('undeclared')) {
    return 'Undeclared allergen';
  }
  if (text.includes('foreign') && (text.includes('object') || text.includes('material') || text.includes('body'))) {
    return 'Foreign object contamination';
  }
  if (text.includes('glass')) {
    return 'Glass fragments detected';
  }
  if (text.includes('metal')) {
    return 'Metal particles detected';
  }
  if (text.includes('mold') || text.includes('mould')) {
    return 'Mold contamination';
  }
  if (text.includes('toxin') || text.includes('botulism')) {
    return 'Toxin contamination';
  }
  if (text.includes('contamination')) {
    return 'Microbiological contamination';
  }
  if (text.includes('pesticide')) {
    return 'Pesticide residue';
  }
  if (text.includes('histamine')) {
    return 'Elevated histamine levels';
  }

  // If no specific reason found, return empty
  // The full title will be displayed in the RecallAlert component
  return '';
}

/**
 * Determines the severity of the recall based on the reason
 */
export function getRecallSeverity(recall: RecallRecord): 'high' | 'medium' | 'low' {
  const title = recall.title.toLowerCase();
  const description = recall.description?.toLowerCase() || '';
  const text = `${title} ${description}`;

  // High severity - serious health risks
  const highSeverityKeywords = [
    'salmonella',
    'listeria',
    'e.coli',
    'toxin',
    'botulism',
    'glass',
    'metal',
    'contamination'
  ];

  if (highSeverityKeywords.some(keyword => text.includes(keyword))) {
    return 'high';
  }

  // Medium severity - allergens and other risks
  const mediumSeverityKeywords = [
    'allergen',
    'undeclared',
    'mold',
    'mould',
    'pesticide',
    'histamine'
  ];

  if (mediumSeverityKeywords.some(keyword => text.includes(keyword))) {
    return 'medium';
  }

  // Low severity - other reasons
  return 'low';
}
