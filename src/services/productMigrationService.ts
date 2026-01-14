import AsyncStorage from '@react-native-async-storage/async-storage';
import { db as sqliteDb } from './dbService';
import { addProduct, getAllProducts as getFirestoreProducts } from './firebaseProductsService';
import { getCurrentUserId } from './authService';
import type { ScannedProduct } from '../types';

const MIGRATION_KEY = 'products_migrated_to_firestore';

/**
 * Check if products have already been migrated to Firestore
 */
export async function isMigrationComplete(): Promise<boolean> {
  try {
    const migrated = await AsyncStorage.getItem(MIGRATION_KEY);
    return migrated === 'true';
  } catch (error) {
    console.error('[ProductMigration] Failed to check migration status:', error);
    return false;
  }
}

/**
 * Mark migration as complete
 */
async function markMigrationComplete(): Promise<void> {
  await AsyncStorage.setItem(MIGRATION_KEY, 'true');
  console.log('[ProductMigration] Migration marked as complete');
}

/**
 * Migrate all products from SQLite to Firestore
 * This is a one-time operation that should run on first launch after update
 */
export async function migrateLocalScansToFirestore(): Promise<{
  success: boolean;
  migrated: number;
  skipped: number;
  error?: string;
}> {
  try {
    console.log('[ProductMigration] Starting migration from SQLite to Firestore...');

    // Check if already migrated
    const alreadyMigrated = await isMigrationComplete();
    if (alreadyMigrated) {
      console.log('[ProductMigration] Migration already completed, skipping');
      return {
        success: true,
        migrated: 0,
        skipped: 0
      };
    }

    // Get current user ID
    const userId = await getCurrentUserId();

    // Get all products from SQLite
    const sqliteProducts = await sqliteDb.getAll();
    console.log(`[ProductMigration] Found ${sqliteProducts.length} products in SQLite`);

    if (sqliteProducts.length === 0) {
      await markMigrationComplete();
      return {
        success: true,
        migrated: 0,
        skipped: 0
      };
    }

    // Get existing products from Firestore to avoid duplicates
    const firestoreProducts = await getFirestoreProducts();
    const existingIds = new Set(firestoreProducts.map(p => p.id));

    let migratedCount = 0;
    let skippedCount = 0;

    // Migrate each product
    for (const product of sqliteProducts) {
      try {
        // Skip if already in Firestore
        if (existingIds.has(product.id)) {
          console.log(`[ProductMigration] Product ${product.id} already in Firestore, skipping`);
          skippedCount++;
          continue;
        }

        // Add scannedBy field if missing
        const productWithUser: ScannedProduct = {
          ...product,
          scannedBy: product.scannedBy || userId
        };

        // Add to Firestore
        await addProduct({
          brand: productWithUser.brand,
          lotNumber: productWithUser.lotNumber,
          productName: productWithUser.productName,
          productImage: productWithUser.productImage,
          recallReference: productWithUser.recallReference,
          lastCheckedAt: productWithUser.lastCheckedAt
        });

        migratedCount++;
        console.log(`[ProductMigration] Migrated product ${product.id}`);
      } catch (error) {
        console.error(`[ProductMigration] Failed to migrate product ${product.id}:`, error);
        // Continue with other products even if one fails
      }
    }

    // Mark migration as complete
    await markMigrationComplete();

    console.log(`[ProductMigration] Migration complete: ${migratedCount} migrated, ${skippedCount} skipped`);

    return {
      success: true,
      migrated: migratedCount,
      skipped: skippedCount
    };
  } catch (error) {
    console.error('[ProductMigration] Migration failed:', error);
    return {
      success: false,
      migrated: 0,
      skipped: 0,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Reset migration flag (for testing purposes only)
 */
export async function resetMigration(): Promise<void> {
  await AsyncStorage.removeItem(MIGRATION_KEY);
  console.log('[ProductMigration] Migration flag reset');
}
