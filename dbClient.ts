
import { neon } from '@neondatabase/serverless';

// وظيفة للحصول على متغير البيئة بأمان
const getEnv = (key: string): string => {
  try {
    return (window as any).process?.env?.[key] || (process?.env?.[key]) || "";
  } catch (e) {
    return "";
  }
};

const databaseUrl = getEnv('DATABASE_URL');

// إنشاء العميل مع معالجة الخطأ إذا لم يكن الرابط صالحاً
let dbSql = null;
if (databaseUrl && databaseUrl.startsWith('postgres')) {
  try {
    dbSql = neon(databaseUrl);
  } catch (e) {
    console.error("خطأ في تهيئة عميل Neon:", e);
  }
}

export const sql = dbSql;
export const isNeonEnabled = !!sql;

if (!isNeonEnabled) {
  console.log("نظام Neon غير متصل. يتم استخدام التخزين المحلي فقط.");
}
