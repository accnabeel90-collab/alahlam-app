
import { neon } from '@neondatabase/serverless';

/**
 * ملاحظة للمبرمج:
 * يرجى تشغيل الاستعلامات التالية في SQL Editor الخاص بـ Neon لتهيئة الجداول:
 * 
 * CREATE TABLE IF NOT EXISTS users (
 *   id TEXT PRIMARY KEY,
 *   name TEXT NOT NULL,
 *   username TEXT UNIQUE NOT NULL,
 *   password TEXT NOT NULL,
 *   role TEXT NOT NULL,
 *   email TEXT
 * );
 * 
 * CREATE TABLE IF NOT EXISTS transactions (
 *   id TEXT PRIMARY KEY,
 *   amount NUMERIC NOT NULL,
 *   type TEXT NOT NULL,
 *   category TEXT NOT NULL,
 *   description TEXT,
 *   date TIMESTAMPTZ DEFAULT NOW(),
 *   "userId" TEXT REFERENCES users(id),
 *   "userName" TEXT,
 *   status TEXT NOT NULL
 * );
 */

const databaseUrl = process.env.DATABASE_URL || '';

// إنشاء العميل فقط إذا كان الرابط موجوداً لتجنب الأخطاء
export const sql = databaseUrl ? neon(databaseUrl) : null;

export const isNeonEnabled = !!sql;

if (!isNeonEnabled) {
  console.warn("تنبيه: DATABASE_URL غير معرف. النظام يعمل الآن في وضع التخزين المحلي (LocalStorage).");
}
