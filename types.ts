
export enum UserRole {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF'
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum TransactionStatus {
  APPROVED = 'APPROVED',
  PENDING = 'PENDING',
  REJECTED = 'REJECTED'
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: UserRole;
  email: string;
}

export interface Transaction {
  id: string;
  amount: number;
  type: TransactionType;
  category: string;
  description: string;
  date: string;
  userId: string;
  userName: string;
  status: TransactionStatus;
}

export interface Category {
  id: string;
  name: string;
  type: TransactionType;
}
