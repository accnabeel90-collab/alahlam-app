
import { Transaction, User, UserRole, TransactionType, TransactionStatus, Category } from './types';

export const INITIAL_USERS: User[] = [
  { id: '1', name: 'أحمد المدير', username: 'admin', password: '123', role: UserRole.ADMIN, email: 'admin@cashbox.com' },
  { id: '2', name: 'سارة المحاسبة', username: 'sara', password: '123', role: UserRole.STAFF, email: 'sara@cashbox.com' },
  { id: '3', name: 'محمد الموظف', username: 'mohamed', password: '123', role: UserRole.STAFF, email: 'mohamed@cashbox.com' },
];

export const CATEGORIES: Category[] = [
  { id: 'c1', name: 'مبيعات', type: TransactionType.INCOME },
  { id: 'c2', name: 'استثمار', type: TransactionType.INCOME },
  { id: 'c3', name: 'رواتب', type: TransactionType.EXPENSE },
  { id: 'c4', name: 'إيجار', type: TransactionType.EXPENSE },
  { id: 'c5', name: 'مستلزمات مكتبية', type: TransactionType.EXPENSE },
  { id: 'c6', name: 'صيانة', type: TransactionType.EXPENSE },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: 't1',
    amount: 5000,
    type: TransactionType.INCOME,
    category: 'مبيعات',
    description: 'تحصيل مبيعات الأسبوع الأول',
    date: '2024-03-10T10:00:00Z',
    userId: '2',
    userName: 'سارة المحاسبة',
    status: TransactionStatus.APPROVED
  },
  {
    id: 't2',
    amount: 1200,
    type: TransactionType.EXPENSE,
    category: 'مستلزمات مكتبية',
    description: 'شراء ورق وأحبار طابعات',
    date: '2024-03-11T14:30:00Z',
    userId: '3',
    userName: 'محمد الموظف',
    status: TransactionStatus.APPROVED
  },
  {
    id: 't3',
    amount: 2500,
    type: TransactionType.EXPENSE,
    category: 'إيجار',
    description: 'إيجار المكتب الفرعي',
    date: '2024-03-12T09:15:00Z',
    userId: '2',
    userName: 'سارة المحاسبة',
    status: TransactionStatus.PENDING
  }
];
