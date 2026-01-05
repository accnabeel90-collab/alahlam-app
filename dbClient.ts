
import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || '';

// إنشاء العميل فقط إذا كان الرابط موجوداً
export const sql = databaseUrl ? neon(databaseUrl) : null;

if (!sql) {
  console.warn("إعدادات DATABASE_URL الخاصة بـ Neon غير موجودة. التطبيق يعمل في وضع التخزين المحلي.");
}

export const isNeonEnabled = !!sql;
