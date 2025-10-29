import { openDatabaseSync } from 'expo-sqlite';
import { useEffect } from 'react';
import { ScannedProduct } from '../types';

const DB_NAME = 'eatsafe.db';
const TABLE = 'scans';

const database = openDatabaseSync(DB_NAME);

try {
  database.execSync(
    `CREATE TABLE IF NOT EXISTS ${TABLE} (
      id TEXT PRIMARY KEY NOT NULL,
      brand TEXT,
      productName TEXT,
      lotNumber TEXT NOT NULL,
      barcode TEXT,
      country TEXT NOT NULL,
      scannedAt INTEGER NOT NULL,
      photoUri TEXT,
      recallStatus TEXT,
      recallReference TEXT,
      lastCheckedAt INTEGER
    );`
  );
} catch (error) {
  console.warn('Failed to create database table', error);
}

type NullableScannedProduct = Omit<
  ScannedProduct,
  'productName' | 'barcode' | 'photoUri' | 'recallReference' | 'lastCheckedAt'
> & {
  productName: string | null;
  barcode: string | null;
  photoUri: string | null;
  recallReference: string | null;
  lastCheckedAt: number | null;
};

function normalizeProduct(row: NullableScannedProduct): ScannedProduct {
  return {
    ...row,
    productName: row.productName ?? undefined,
    barcode: row.barcode ?? undefined,
    photoUri: row.photoUri ?? undefined,
    recallReference: row.recallReference ?? undefined,
    lastCheckedAt: row.lastCheckedAt ?? undefined
  };
}

async function getAll(): Promise<ScannedProduct[]> {
  const rows = database.getAllSync<NullableScannedProduct>(
    `SELECT * FROM ${TABLE} ORDER BY scannedAt DESC`
  );
  return rows.map(normalizeProduct);
}

async function getById(id: string): Promise<ScannedProduct | null> {
  const row = database.getFirstSync<NullableScannedProduct>(
    `SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`,
    [id]
  );
  return row ? normalizeProduct(row) : null;
}

async function insert(product: ScannedProduct) {
  database.runSync(
    `INSERT OR REPLACE INTO ${TABLE} (
      id,
      brand,
      productName,
      lotNumber,
      barcode,
      country,
      scannedAt,
      photoUri,
      recallStatus,
      recallReference,
      lastCheckedAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      product.id,
      product.brand,
      product.productName ?? null,
      product.lotNumber,
      product.barcode ?? null,
      product.country,
      product.scannedAt,
      product.photoUri ?? null,
      product.recallStatus,
      product.recallReference ?? null,
      product.lastCheckedAt ?? null
    ]
  );
}

async function update(id: string, payload: Partial<ScannedProduct>) {
  const current = await getById(id);
  if (!current) {
    throw new Error('Cannot update missing product');
  }
  const merged: ScannedProduct = { ...current, ...payload };
  await insert(merged);
}

async function remove(id: string) {
  database.runSync(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
}

async function removeMany(ids: string[]) {
  if (ids.length === 0) {
    return;
  }
  const placeholders = ids.map(() => '?').join(',');
  database.runSync(`DELETE FROM ${TABLE} WHERE id IN (${placeholders})`, ids);
}

export const db = {
  getAll,
  getById,
  insert,
  update,
  remove,
  removeMany
};

export function useDatabaseWarmup() {
  useEffect(() => {
    try {
      database.execSync('PRAGMA journal_mode = WAL;');
    } catch (error) {
      console.warn('Failed to configure database', error);
    }
  }, []);
}
