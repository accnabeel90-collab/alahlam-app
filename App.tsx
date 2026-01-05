
import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Users as UsersIcon, 
  FileText, 
  LogOut, 
  Plus, 
  CheckCircle, 
  XCircle, 
  Clock,
  PieChart as PieChartIcon,
  Sparkles,
  Lock,
  User as UserIcon,
  Edit,
  Trash2,
  Database,
  Loader2,
  AlertCircle,
  TrendingUp,
  ShieldCheck,
  Zap,
  Info,
  Search
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell
} from 'recharts';
import { User, Transaction, UserRole, TransactionType, TransactionStatus } from './types';
import { CATEGORIES, INITIAL_USERS, INITIAL_TRANSACTIONS } from './constants';
import { analyzeFinancials } from './geminiService';
import { sql, isNeonEnabled } from './dbClient';

const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ElementType; color: string; trend?: string }> = ({ title, value, icon: Icon, color, trend }) => (
  <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col justify-between transition-all hover:shadow-xl hover:-translate-y-1 group">
    <div className="flex items-center justify-between mb-4">
      <div className="p-4 rounded-2xl transition-all group-hover:scale-110" style={{ backgroundColor: `${color}10`, color }}>
        <Icon size={24} />
      </div>
      {trend && <span className="text-[10px] font-black px-3 py-1 rounded-full bg-slate-50 text-slate-400 border border-slate-100">{trend}</span>}
    </div>
    <div>
      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mb-1">{title}</p>
      <h3 className="text-2xl font-black text-slate-800 tracking-tight">{value}</h3>
    </div>
  </div>
);

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'transactions' | 'reports' | 'users'>('dashboard');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [aiReport, setAiReport] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  const [newTx, setNewTx] = useState({
    amount: '',
    type: TransactionType.EXPENSE,
    category: CATEGORIES[0].name,
    description: ''
  });

  const [userForm, setUserForm] = useState<Omit<User, 'id'>>({
    name: '',
    username: '',
    password: '',
    role: UserRole.STAFF,
    email: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      if (isNeonEnabled && sql) {
        // محاولة جلب البيانات من Neon
        try {
          const dbUsers = await sql`SELECT * FROM users`;
          const dbTransactions = await sql`SELECT * FROM transactions ORDER BY date DESC`;
          
          if (dbUsers && dbUsers.length > 0) setUsers(dbUsers as any);
          else initializeLocalUsers();

          if (dbTransactions) setTransactions(dbTransactions as any);
          else initializeLocalTransactions();
        } catch (dbErr) {
          console.warn("فشل الاتصال بـ Neon، التحول للوضع المحلي:", dbErr);
          initializeLocalUsers();
          initializeLocalTransactions();
        }
      } else {
        initializeLocalUsers();
        initializeLocalTransactions();
      }
    } catch (e) {
      console.error("General Data Load Error:", e);
      setInitError("حدث خطأ غير متوقع أثناء تحميل البيانات.");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeLocalUsers = () => {
    const local = localStorage.getItem('cashbox_users');
    if (local) setUsers(JSON.parse(local));
    else {
      setUsers(INITIAL_USERS);
      localStorage.setItem('cashbox_users', JSON.stringify(INITIAL_USERS));
    }
  };

  const initializeLocalTransactions = () => {
    const local = localStorage.getItem('cashbox_txs');
    if (local) setTransactions(JSON.parse(local));
    else {
      setTransactions(INITIAL_TRANSACTIONS);
      localStorage.setItem('cashbox_txs', JSON.stringify(INITIAL_TRANSACTIONS));
    }
  };

  const handleLogin = (e?: React.FormEvent) => {
    e?.preventDefault();
    const user = users.find(u => u.username === loginForm.username && u.password === loginForm.password);
    if (user) {
      setCurrentUser(user);
      setLoginError('');
    } else {
      setLoginError('بيانات الدخول غير صحيحة');
    }
  };

  const quickLogin = () => {
    const adminUser = users.find(u => u.username === 'admin') || INITIAL_USERS[0];
    setCurrentUser(adminUser);
  };

  const handleAddTransaction = async () => {
    if (!newTx.amount || !currentUser) return;
    
    const tx: Transaction = {
      id: Math.random().toString(36).substr(2, 9),
      amount: parseFloat(newTx.amount),
      type: newTx.type,
      category: newTx.category,
      description: newTx.description,
      date: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      status: currentUser.role === UserRole.ADMIN ? TransactionStatus.APPROVED : TransactionStatus.PENDING
    };

    if (isNeonEnabled && sql) {
      try {
        await sql`
          INSERT INTO transactions (id, amount, type, category, description, date, "userId", "userName", status)
          VALUES (${tx.id}, ${tx.amount}, ${tx.type}, ${tx.category}, ${tx.description}, ${tx.date}, ${tx.userId}, ${tx.userName}, ${tx.status})
        `;
      } catch(e) { console.error("Neon Insert Error:", e); }
    } 
    
    const updated = [tx, ...transactions];
    setTransactions(updated);
    localStorage.setItem('cashbox_txs', JSON.stringify(updated));
    
    setShowAddModal(false);
    setNewTx({ amount: '', type: TransactionType.EXPENSE, category: CATEGORIES[0].name, description: '' });
  };

  const updateStatus = async (id: string, status: TransactionStatus) => {
    const updated = transactions.map(t => t.id === id ? { ...t, status } : t);
    setTransactions(updated);
    localStorage.setItem('cashbox_txs', JSON.stringify(updated));
    
    if (isNeonEnabled && sql) {
      try { await sql`UPDATE transactions SET status = ${status} WHERE id = ${id}`; } catch(e) { console.error("Neon Status Update Error:", e); }
    }
  };

  const saveUser = async () => {
    const newUser = { ...userForm, id: editingUser?.id || Math.random().toString(36).substr(2, 9) };
    const updatedUsers = editingUser 
      ? users.map(u => u.id === editingUser.id ? (newUser as User) : u)
      : [...users, newUser as User];
    
    setUsers(updatedUsers);
    localStorage.setItem('cashbox_users', JSON.stringify(updatedUsers));
    
    if (isNeonEnabled && sql) {
      try {
        if (editingUser) {
          await sql`UPDATE users SET name = ${newUser.name}, username = ${newUser.username}, password = ${newUser.password}, role = ${newUser.role}, email = ${newUser.email} WHERE id = ${newUser.id}`;
        } else {
          await sql`INSERT INTO users (id, name, username, password, role, email) VALUES (${newUser.id}, ${newUser.name}, ${newUser.username}, ${newUser.password}, ${newUser.role}, ${newUser.email})`;
        }
      } catch(e) { console.error("Neon User Save Error:", e); }
    }
    
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ name: '', username: '', password: '', role: UserRole.STAFF, email: '' });
  };

  const deleteUser = async (id: string) => {
    if (!confirm('سيتم حذف الموظف نهائياً، هل أنت متأكد؟')) return;
    
    const updated = users.filter(usr => usr.id !== id);
    setUsers(updated);
    localStorage.setItem('cashbox_users', JSON.stringify(updated));
    
    if (isNeonEnabled && sql) {
      try { await sql`DELETE FROM users WHERE id = ${id}`; } catch(e) { console.error("Neon Delete Error:", e); }
    }
  };

  const metrics = useMemo(() => {
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    const income = approved.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = approved.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    return {
      balance: income - expense,
      income,
      expense,
      pending: transactions.filter(t => t.status === TransactionStatus.PENDING).length
    };
  }, [transactions]);

  const chartData = useMemo(() => {
    return CATEGORIES.map(cat => ({
      name: cat.name,
      value: transactions
        .filter(t => t.category === cat.name && t.status === TransactionStatus.APPROVED)
        .reduce((acc, t) => acc + t.amount, 0),
      type: cat.type
    })).filter(d => d.value > 0);
  }, [transactions]);

  const handleGenerateReport = async () => {
    setIsGeneratingAi(true);
    setAiReport(null);
    try {
      const report = await analyzeFinancials(transactions);
      setAiReport(report);
    } catch (e) {
      setAiReport("عذراً، المحرك الذكي غير متاح حالياً.");
    } finally {
      setIsGeneratingAi(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={48} />
        <p className="font-bold text-slate-500">جاري تهيئة النظام المالي...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-rose-50 p-6 text-center">
        <AlertCircle className="text-rose-600 mb-6" size={64} />
        <h1 className="text-2xl font-black text-slate-900 mb-2">عذراً، حدث خطأ في النظام</h1>
        <p className="text-slate-500 mb-8">{initError}</p>
        <button onClick={() => window.location.reload()} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold">إعادة تحميل الصفحة</button>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F5F9] p-6">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl w-full max-w-md border border-white relative overflow-hidden animate-in fade-in zoom-in duration-500">
          <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/5 blur-[80px] -mr-20 -mt-20"></div>
          
          <div className="text-center mb-10 relative">
            <div className="inline-flex bg-slate-900 p-6 rounded-[2.5rem] shadow-2xl shadow-slate-200 mb-6 group transition-all hover:bg-indigo-600">
              <Database size={44} className="text-white group-hover:scale-110 transition-transform" />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">إدارة الصندوق</h1>
            <p className="text-slate-400 mt-2 font-medium">الوصول الآمن لبيانات المؤسسة</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6 relative">
            <div className="space-y-4">
              <div className="relative group">
                <UserIcon className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input 
                  type="text" 
                  value={loginForm.username}
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full pr-14 pl-6 py-5 rounded-[1.8rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-bold transition-all placeholder:text-slate-300"
                  placeholder="اسم المستخدم"
                  required 
                />
              </div>
              <div className="relative group">
                <Lock className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-600 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full pr-14 pl-6 py-5 rounded-[1.8rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-bold transition-all placeholder:text-slate-300"
                  placeholder="كلمة المرور"
                  required 
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-2xl text-[10px] font-black flex items-center gap-2 border border-rose-100">
                <AlertCircle size={16} /> {loginError}
              </div>
            )}

            <button type="submit" className="w-full bg-slate-900 text-white py-6 rounded-[1.8rem] font-black text-lg hover:bg-indigo-700 shadow-2xl transition-all active:scale-95 flex items-center justify-center gap-3">
              تسجيل الدخول
            </button>

            <button 
              type="button" 
              onClick={quickLogin}
              className="w-full py-4 rounded-[1.5rem] text-slate-400 font-black text-[10px] hover:text-indigo-600 transition-colors uppercase tracking-widest"
            >
              دخول سريع كمشرف
            </button>
          </form>

          <div className="mt-12 pt-6 border-t border-slate-50 flex items-center justify-center gap-3">
            <div className={`w-2 h-2 rounded-full animate-pulse ${isNeonEnabled ? 'bg-indigo-500 shadow-[0_0_12px_#6366f1]' : 'bg-amber-500'}`}></div>
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em]">
              {isNeonEnabled ? 'Neon SQL DB' : 'Local Storage Mode'}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-[#F8FAFC] font-sans">
      {/* Sidebar - Pro Design */}
      <aside className="w-80 bg-white border-l border-slate-100 hidden lg:flex flex-col shadow-sm">
        <div className="p-10 flex items-center gap-4">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-xl shadow-slate-200">
            <TrendingUp size={28} className="text-white" />
          </div>
          <span className="font-black text-2xl text-slate-900 tracking-tighter">صندوقي</span>
        </div>
        
        <nav className="flex-1 p-6 space-y-2">
          {[
            { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
            { id: 'transactions', label: 'العمليات المالية', icon: FileText },
            { id: 'reports', label: 'تحليلات ذكية', icon: Sparkles, adminOnly: true },
            { id: 'users', label: 'الموظفين', icon: UsersIcon, adminOnly: true },
          ].map((item) => (
            (!item.adminOnly || currentUser.role === UserRole.ADMIN) && (
              <button 
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-[2rem] transition-all duration-300 ${activeTab === item.id ? 'bg-slate-900 text-white shadow-2xl font-bold translate-x-1' : 'text-slate-400 hover:bg-slate-50 hover:text-indigo-600'}`}
              >
                <item.icon size={20} />
                <span className="font-bold text-sm">{item.label}</span>
              </button>
            )
          ))}
        </nav>

        <div className="p-8 border-t border-slate-50">
          <div className="bg-slate-50 p-6 rounded-[2.5rem] mb-6 flex items-center gap-4 border border-slate-100 group transition-all hover:bg-indigo-50">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center font-black text-xl shadow-lg">
              {currentUser.name.charAt(0)}
            </div>
            <div className="overflow-hidden">
              <p className="font-black text-slate-900 truncate text-sm">{currentUser.name}</p>
              <p className="text-[9px] text-indigo-600 font-black uppercase tracking-widest">{currentUser.role === UserRole.ADMIN ? 'مدير نظام' : 'محاسب'}</p>
            </div>
          </div>
          <button onClick={() => setCurrentUser(null)} className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-2xl text-rose-500 font-black text-sm hover:bg-rose-50 transition-all">
            <LogOut size={18} />
            <span>خروج</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 p-8 lg:p-14 overflow-y-auto">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-16">
          <div className="animate-in slide-in-from-right duration-500">
            <h2 className="text-4xl font-black text-slate-900 tracking-tight">
              {activeTab === 'dashboard' && 'الرئيسية'}
              {activeTab === 'transactions' && 'العمليات المالية'}
              {activeTab === 'reports' && 'الاستشاري الذكي'}
              {activeTab === 'users' && 'إدارة الفريق'}
            </h2>
            <p className="text-slate-400 mt-2 font-medium flex items-center gap-2">
               <ShieldCheck size={14} className="text-indigo-500" /> نظام مالي مشفر ومؤمن بالكامل
            </p>
          </div>
          <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 flex items-center gap-3">
            <Plus size={24} />
            إضافة عملية
          </button>
        </header>

        {activeTab === 'dashboard' && (
          <div className="space-y-14 animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              <MetricCard title="الرصيد الكلي" value={`${metrics.balance.toLocaleString()} ر.س`} icon={TrendingUp} color="#4f46e5" trend="+12.5%" />
              <MetricCard title="إجمالي الوارد" value={`${metrics.income.toLocaleString()} ر.س`} icon={ArrowUpCircle} color="#10b981" />
              <MetricCard title="إجمالي الصرف" value={`${metrics.expense.toLocaleString()} ر.س`} icon={ArrowDownCircle} color="#f43f5e" />
              <MetricCard title="بانتظار الموافقة" value={metrics.pending} icon={Clock} color="#f59e0b" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100">
                <h3 className="font-black text-slate-900 text-xl mb-12 flex items-center gap-3">
                  <PieChartIcon className="text-indigo-600" /> تحليل فئات الصرف والقبض
                </h3>
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12, fontWeight: 800}} />
                      <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                      <Tooltip cursor={{fill: '#F8FAFC'}} contentStyle={{ borderRadius: '24px', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)', fontFamily: 'Tajawal' }} />
                      <Bar dataKey="value" radius={[14, 14, 0, 0]} barSize={60}>
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.type === TransactionType.INCOME ? '#10b981' : '#f43f5e'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-12 rounded-[4rem] shadow-sm border border-slate-100 overflow-hidden">
                <h3 className="font-black text-slate-900 text-xl mb-12 flex items-center gap-3">
                  <Clock className="text-indigo-600" /> آخر النشاطات
                </h3>
                <div className="space-y-8">
                  {transactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className={`p-3.5 rounded-2xl ${t.type === TransactionType.INCOME ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                          {t.type === TransactionType.INCOME ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm">{t.category}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{new Date(t.date).toLocaleDateString('ar-SA')}</p>
                        </div>
                      </div>
                      <span className={`font-black text-sm ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.type === TransactionType.INCOME ? '+' : '-'}{t.amount.toLocaleString()}
                      </span>
                    </div>
                  ))}
                  {transactions.length === 0 && <p className="text-center text-slate-200 py-10 font-bold italic">لا توجد عمليات مسجلة</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in slide-in-from-bottom-10 duration-700">
             <div className="p-10 border-b border-slate-50 flex items-center justify-between">
              <div className="relative w-full max-w-md">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input type="text" placeholder="بحث في العمليات..." className="w-full pr-12 pl-6 py-4 rounded-[1.5rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-bold text-sm" />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-right">
                <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="p-10 border-b border-slate-100">البيان</th>
                    <th className="p-10 border-b border-slate-100">القيمة</th>
                    <th className="p-10 border-b border-slate-100">المسؤول</th>
                    <th className="p-10 border-b border-slate-100">الحالة</th>
                    {currentUser.role === UserRole.ADMIN && <th className="p-10 border-b border-slate-100">الإجراء</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-10">
                        <div className="flex items-center gap-6">
                          <div className={`p-4 rounded-[1.5rem] ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600 shadow-xl shadow-emerald-50' : 'bg-rose-100 text-rose-600 shadow-xl shadow-rose-50'}`}>
                            {t.type === TransactionType.INCOME ? <ArrowUpCircle size={26} /> : <ArrowDownCircle size={26} />}
                          </div>
                          <div>
                            <p className="font-black text-slate-900 text-lg">{t.category}</p>
                            <p className="text-xs text-slate-400 font-bold mt-1 max-w-sm truncate leading-relaxed">{t.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-10">
                        <span className={`text-2xl font-black ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.amount.toLocaleString()} <span className="text-[10px] font-black">ر.س</span>
                        </span>
                      </td>
                      <td className="p-10">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-xs">
                            {t.userName?.charAt(0) || '؟'}
                          </div>
                          <span className="font-bold text-slate-700 text-sm">{t.userName}</span>
                        </div>
                      </td>
                      <td className="p-10">
                        <span className={`px-6 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 ${
                          t.status === TransactionStatus.APPROVED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                          t.status === TransactionStatus.PENDING ? 'bg-amber-50 text-amber-700 border-amber-100' : 
                          'bg-rose-50 text-rose-700 border-rose-100'
                        }`}>
                          {t.status === TransactionStatus.APPROVED ? 'معتمد' : t.status === TransactionStatus.PENDING ? 'مراجعة' : 'مرفوض'}
                        </span>
                      </td>
                      {currentUser.role === UserRole.ADMIN && (
                        <td className="p-10">
                          {t.status === TransactionStatus.PENDING && (
                            <div className="flex items-center gap-4">
                              <button onClick={() => updateStatus(t.id, TransactionStatus.APPROVED)} className="p-3.5 bg-emerald-600 text-white rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all"><CheckCircle size={22} /></button>
                              <button onClick={() => updateStatus(t.id, TransactionStatus.REJECTED)} className="p-3.5 bg-rose-600 text-white rounded-2xl hover:shadow-2xl hover:-translate-y-1 transition-all"><XCircle size={22} /></button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reports' && (
          <div className="space-y-12 animate-in zoom-in-95 duration-700">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-3xl font-black text-slate-900">التحليل المالي الذكي</h3>
                <p className="text-slate-400 font-medium">استشارات مبنية على بيانات حقيقية ومعالجة بواسطة Gemini 3</p>
              </div>
              <button 
                onClick={handleGenerateReport} 
                disabled={isGeneratingAi || transactions.length === 0} 
                className="bg-indigo-600 text-white px-12 py-6 rounded-[2.5rem] font-black text-xl shadow-2xl shadow-indigo-100 flex items-center gap-4 hover:bg-slate-900 disabled:opacity-50 transition-all active:scale-95"
              >
                <Sparkles size={28} className={isGeneratingAi ? 'animate-pulse' : ''} />
                {isGeneratingAi ? 'جاري التحليل...' : 'توليد تقرير شامل'}
              </button>
            </div>

            {aiReport ? (
              <div className="bg-white p-14 rounded-[4.5rem] shadow-sm border border-slate-100 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-rose-600"></div>
                <div className="flex items-center gap-6 mb-12">
                  <div className="bg-indigo-50 p-5 rounded-[2rem] text-indigo-600 shadow-xl shadow-indigo-50"><Sparkles size={40} /></div>
                  <h4 className="text-3xl font-black text-slate-900 tracking-tight">تقرير الكفاءة المالية</h4>
                </div>
                <div className="text-slate-600 leading-[2.4] text-xl font-medium whitespace-pre-wrap font-sans">
                  {aiReport}
                </div>
              </div>
            ) : (
              <div className="bg-white p-36 rounded-[4.5rem] border-4 border-dashed border-slate-100 text-center">
                <div className="bg-slate-50 w-36 h-36 rounded-[3rem] flex items-center justify-center mx-auto mb-12 shadow-inner">
                  <Sparkles size={56} className="text-slate-200" />
                </div>
                <h4 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">اضغط على الزر بالأعلى لبدء التحليل</h4>
                <p className="text-slate-400 font-medium max-w-md mx-auto leading-relaxed">سيقوم المحرك بمراجعة كافة العمليات المالية وتقديم توصيات مخصصة لرفع كفاءة التدفق النقدي.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden animate-in fade-in duration-700">
            <div className="p-12 border-b border-slate-50 flex items-center justify-between">
              <h3 className="text-2xl font-black text-slate-900">إدارة فريق العمل</h3>
              <button onClick={() => { setEditingUser(null); setShowUserModal(true); }} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-indigo-600 transition-all active:scale-95 shadow-xl">
                <Plus size={20} /> إضافة موظف جديد
              </button>
            </div>
            <table className="w-full text-right">
              <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                <tr>
                  <th className="p-10">الموظف</th>
                  <th className="p-10">اسم المستخدم</th>
                  <th className="p-10">الدور</th>
                  <th className="p-10">البريد</th>
                  <th className="p-10">إجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-10 font-black text-slate-900 text-xl">{u.name}</td>
                    <td className="p-10"><code className="bg-indigo-50 px-5 py-2.5 rounded-xl text-indigo-600 font-mono font-black text-sm">{u.username}</code></td>
                    <td className="p-10">
                      <span className={`px-6 py-2.5 rounded-2xl text-[9px] font-black border-2 tracking-widest ${u.role === UserRole.ADMIN ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-50 text-slate-700 border-slate-200'}`}>
                        {u.role === UserRole.ADMIN ? 'مدير نظام' : 'محاسب مالي'}
                      </span>
                    </td>
                    <td className="p-10 text-slate-400 font-bold text-sm">{u.email}</td>
                    <td className="p-10">
                      <div className="flex items-center gap-4">
                        <button onClick={() => { setEditingUser(u); setUserForm({...u}); setShowUserModal(true); }} className="p-3.5 text-indigo-600 hover:bg-indigo-50 rounded-2xl transition-all"><Edit size={22} /></button>
                        {u.id !== currentUser.id && (
                          <button onClick={() => deleteUser(u.id)} className="p-3.5 text-rose-600 hover:bg-rose-50 rounded-2xl transition-all"><Trash2 size={22} /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* --- Modals --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] w-full max-w-2xl shadow-2xl overflow-hidden">
            <div className="p-12 bg-slate-50 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">تسجيل عملية نقدية</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-300 hover:text-slate-900"><XCircle size={40} /></button>
            </div>
            <div className="p-14 space-y-12">
              <div className="flex gap-6">
                <button onClick={() => setNewTx({...newTx, type: TransactionType.EXPENSE})} className={`flex-1 py-7 rounded-[2rem] border-4 font-black text-xl transition-all ${newTx.type === TransactionType.EXPENSE ? 'border-rose-500 bg-rose-50 text-rose-600 shadow-xl shadow-rose-100' : 'border-slate-100 text-slate-300'}`}>صرف مصروف</button>
                <button onClick={() => setNewTx({...newTx, type: TransactionType.INCOME})} className={`flex-1 py-7 rounded-[2rem] border-4 font-black text-xl transition-all ${newTx.type === TransactionType.INCOME ? 'border-emerald-500 bg-emerald-50 text-emerald-600 shadow-xl shadow-emerald-100' : 'border-slate-100 text-slate-300'}`}>قبض وارد</button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <input type="number" value={newTx.amount} onChange={e => setNewTx({...newTx, amount: e.target.value})} className="w-full p-7 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none text-3xl font-black text-center transition-all shadow-inner" placeholder="0.00" />
                <select value={newTx.category} onChange={e => setNewTx({...newTx, category: e.target.value})} className="w-full p-7 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-bold appearance-none transition-all shadow-inner">
                  {CATEGORIES.filter(c => c.type === newTx.type).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
              </div>
              <textarea value={newTx.description} onChange={e => setNewTx({...newTx, description: e.target.value})} className="w-full p-7 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-indigo-600 focus:bg-white outline-none font-bold resize-none transition-all shadow-inner" rows={4} placeholder="وصف العملية المالي بدقة..." />
              <button onClick={handleAddTransaction} className="w-full py-7 rounded-[2rem] bg-slate-900 text-white font-black text-2xl hover:bg-indigo-600 shadow-2xl transition-all active:scale-95 mt-4">حفظ العملية</button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-2xl z-[100] flex items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="bg-white rounded-[4rem] w-full max-xl shadow-2xl overflow-hidden">
             <div className="p-12 bg-slate-50 flex items-center justify-between border-b border-slate-100">
              <h3 className="text-3xl font-black text-slate-900 tracking-tight">{editingUser ? 'تحديث موظف' : 'إضافة موظف'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-slate-300 hover:text-slate-900 transition-colors"><XCircle size={40} /></button>
            </div>
            <div className="p-14 space-y-8">
              <input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-bold" placeholder="الاسم الكامل" />
              <input type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-bold" placeholder="اسم المستخدم" />
              <input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-bold" placeholder="كلمة المرور" />
              <div className="grid grid-cols-2 gap-6">
                <select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-bold"><option value={UserRole.STAFF}>محاسب</option><option value={UserRole.ADMIN}>مدير</option></select>
                <input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full p-6 rounded-2xl bg-slate-50 border-2 border-transparent focus:border-indigo-600 outline-none font-bold" placeholder="البريد الإلكتروني" />
              </div>
              <button onClick={saveUser} className="w-full py-7 bg-slate-900 text-white rounded-[2rem] font-black text-xl hover:bg-indigo-600 shadow-2xl mt-6 transition-all active:scale-95">{editingUser ? 'حفظ التحديثات' : 'تثبيت الموظف في النظام'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
