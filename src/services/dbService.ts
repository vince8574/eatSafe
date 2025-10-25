import * as SQLite from 'expo-sqlite';
import { useEffect } from 'react';
import { ScannedProduct } from '../types';

const DB_NAME = 'eatsafe.db';
const TABLE = 'scans';

function openDatabase() {
  return SQLite.openDatabase(DB_NAME);
}

const database = openDatabase();

database.transaction((tx) => {
  tx.executeSql(
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
    );`,
    [],
    () => undefined,
    (_, error) => {
      console.warn('Failed to create database table', error);
      return false;
    }
  );
});

function runQuery<T = SQLite.SQLResultSet>(query: string, params: unknown[] = []) {
  return new Promise<T>((resolve, reject) => {
    database.transaction((tx) => {
      tx.executeSql(
        query,
        params,
        (_, result) => resolve(result as T),
        (_, error) => {
          reject(error);
          return false;
        }
      );
    });
  });
}

async function getAll(): Promise<ScannedProduct[]> {
  const result = await runQuery<SQLite.SQLResultSet>(`SELECT * FROM ${TABLE} ORDER BY scannedAt DESC`);
  return result.rows._array as ScannedProduct[];
}

async function getById(id: string): Promise<ScannedProduct | null> {
  const result = await runQuery<SQLite.SQLResultSet>(`SELECT * FROM ${TABLE} WHERE id = ? LIMIT 1`, [id]);
  if (result.rows.length === 0) {
    return null;
  }
  return result.rows.item(0) as ScannedProduct;
}

async function insert(product: ScannedProduct) {
  await runQuery(
    `INSERT OR REPLACE INTO ${TABLE} (id, brand, productName, lotNumber, barcode, country, scannedAt, photoUri, recallStatus, recallReference, lastCheckedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
  const merged = { ...current, ...payload };
  await insert(merged);
}

async function remove(id: string) {
  await runQuery(`DELETE FROM ${TABLE} WHERE id = ?`, [id]);
}

async function removeMany(ids: string[]) {
  const placeholders = ids.map(() => '?').join(',');
  await runQuery(`DELETE FROM ${TABLE} WHERE id IN (${placeholders})`, ids);
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
    database.transaction((tx) => {
      tx.executeSql('PRAGMA journal_mode = WAL;');
    });
  }, []);
}
