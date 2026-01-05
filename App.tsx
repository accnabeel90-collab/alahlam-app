
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
  Key,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { User, Transaction, UserRole, TransactionType, TransactionStatus } from './types';
import { CATEGORIES } from './constants';
import { analyzeFinancials } from './geminiService';
import { supabase } from './supabaseClient';

// Reusable Components
const Card: React.FC<{ title: string; value: string | number; icon: React.ReactNode; color: string }> = ({ title, value, icon, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
    <div>
      <p className="text-gray-500 text-sm font-medium">{title}</p>
      <h3 className="text-2xl font-bold mt-1" style={{ color }}>{value}</h3>
    </div>
    <div className="p-3 rounded-full opacity-80" style={{ backgroundColor: `${color}20` }}>
      {icon}
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
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');

  // New Transaction State
  const [newTx, setNewTx] = useState({
    amount: '',
    type: TransactionType.EXPENSE,
    category: CATEGORIES.find(c => c.type === TransactionType.EXPENSE)?.name || '',
    description: ''
  });

  // User Form State
  const [userForm, setUserForm] = useState<Omit<User, 'id'>>({
    name: '',
    username: '',
    password: '',
    role: UserRole.STAFF,
    email: ''
  });

  // Fetch initial data
  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchTransactions();
    }
  }, [currentUser]);

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*');
    if (error) {
      console.error('Error fetching users:', error);
    } else {
      setUsers(data || []);
    }
    setIsLoading(false);
  };

  const fetchTransactions = async () => {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    if (error) {
      console.error('Error fetching transactions:', error);
    } else {
      setTransactions(data || []);
    }
  };

  // Auth Handling
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', loginForm.username)
      .eq('password', loginForm.password)
      .single();

    if (data) {
      setCurrentUser(data);
      setActiveTab('dashboard');
      setLoginError('');
      setLoginForm({ username: '', password: '' });
    } else {
      setLoginError('اسم المستخدم أو كلمة المرور غير صحيحة');
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setAiReport(null);
    setTransactions([]);
  };

  // Financial Metrics
  const metrics = useMemo(() => {
    const approved = transactions.filter(t => t.status === TransactionStatus.APPROVED);
    const income = approved.filter(t => t.type === TransactionType.INCOME).reduce((acc, t) => acc + t.amount, 0);
    const expense = approved.filter(t => t.type === TransactionType.EXPENSE).reduce((acc, t) => acc + t.amount, 0);
    const pendingCount = transactions.filter(t => t.status === TransactionStatus.PENDING).length;
    return { balance: income - expense, income, expense, pendingCount };
  }, [transactions]);

  // Chart Data
  const chartData = useMemo(() => {
    const data = CATEGORIES.map(cat => {
      const amount = transactions
        .filter(t => t.category === cat.name && t.status === TransactionStatus.APPROVED)
        .reduce((acc, t) => acc + t.amount, 0);
      return { name: cat.name, value: amount, type: cat.type };
    }).filter(d => d.value > 0);
    return data;
  }, [transactions]);

  // Actions
  const addTransaction = async () => {
    if (!currentUser || !newTx.amount || !newTx.category) return;

    const transaction = {
      amount: parseFloat(newTx.amount),
      type: newTx.type,
      category: newTx.category,
      description: newTx.description,
      date: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      status: currentUser.role === UserRole.ADMIN ? TransactionStatus.APPROVED : TransactionStatus.PENDING
    };

    const { error } = await supabase.from('transactions').insert([transaction]);
    if (error) {
      alert('خطأ في إضافة الحركة');
    } else {
      fetchTransactions();
      setShowAddModal(false);
      setNewTx({ amount: '', type: TransactionType.EXPENSE, category: '', description: '' });
    }
  };

  const saveUser = async () => {
    if (editingUser) {
      const { error } = await supabase.from('users').update(userForm).eq('id', editingUser.id);
      if (error) alert('خطأ في تحديث المستخدم');
    } else {
      const { error } = await supabase.from('users').insert([userForm]);
      if (error) alert('خطأ في إضافة المستخدم');
    }
    fetchUsers();
    setShowUserModal(false);
    setEditingUser(null);
    setUserForm({ name: '', username: '', password: '', role: UserRole.STAFF, email: '' });
  };

  const deleteUser = async (id: string) => {
    if (confirm('هل أنت متأكد من رغبتك في حذف هذا المستخدم؟')) {
      const { error } = await supabase.from('users').delete().eq('id', id);
      if (error) alert('خطأ في حذف المستخدم');
      else fetchUsers();
    }
  };

  const updateStatus = async (id: string, status: TransactionStatus) => {
    const { error } = await supabase.from('transactions').update({ status }).eq('id', id);
    if (error) alert('خطأ في تحديث الحالة');
    else fetchTransactions();
  };

  const generateAiInsight = async () => {
    setIsGeneratingAi(true);
    const report = await analyzeFinancials(transactions);
    setAiReport(report);
    setIsGeneratingAi(false);
  };

  // Login Screen
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-50 to-blue-100 p-4">
        <div className="bg-white p-10 rounded-3xl shadow-2xl w-full max-w-md border border-white/50 backdrop-blur-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="bg-indigo-600 p-5 rounded-3xl mb-6 shadow-lg shadow-indigo-200">
              <LayoutDashboard size={48} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">نظام إدارة الصندوق</h1>
            <p className="text-gray-500 text-center mt-3 font-medium">الرجاء إدخال بيانات الاعتماد للوصول</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">اسم المستخدم</label>
              <div className="relative">
                <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="text" 
                  value={loginForm.username}
                  onChange={e => setLoginForm({...loginForm, username: e.target.value})}
                  className="w-full pr-11 pl-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  placeholder="اسم المستخدم"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">كلمة المرور</label>
              <div className="relative">
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <input 
                  type="password" 
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  className="w-full pr-11 pl-4 py-4 rounded-2xl bg-gray-50 border border-gray-200 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none transition-all font-medium"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {loginError && (
              <div className="bg-rose-50 text-rose-600 p-4 rounded-xl text-sm font-bold flex items-center gap-2 border border-rose-100">
                <XCircle size={18} />
                {loginError}
              </div>
            )}

            <button 
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 active:scale-[0.98] transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2"
            >
              {isLoading && <Loader2 size={20} className="animate-spin" />}
              تسجيل الدخول
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-l border-gray-200 hidden md:flex flex-col">
        <div className="p-6 flex items-center gap-3 border-b border-gray-100">
          <div className="bg-indigo-600 p-2 rounded-lg">
            <LayoutDashboard className="text-white" size={24} />
          </div>
          <span className="font-bold text-lg text-gray-800">صندوقي</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <LayoutDashboard size={20} />
            <span>لوحة التحكم</span>
          </button>
          <button onClick={() => setActiveTab('transactions')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'transactions' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
            <FileText size={20} />
            <span>الحركات المالية</span>
          </button>
          {currentUser.role === UserRole.ADMIN && (
            <>
              <button onClick={() => setActiveTab('reports')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'reports' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                <PieChartIcon size={20} />
                <span>التقارير التحليلية</span>
              </button>
              <button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${activeTab === 'users' ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-gray-600 hover:bg-gray-50'}`}>
                <UsersIcon size={20} />
                <span>إدارة المستخدمين</span>
              </button>
            </>
          )}
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="bg-gray-50 p-4 rounded-xl mb-4">
            <p className="text-xs text-gray-500 mb-1">مسجل دخول بصفة</p>
            <p className="font-bold text-sm text-gray-800">{currentUser.name}</p>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-600 hover:bg-red-50 transition-colors">
            <LogOut size={20} />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="bg-white border-b border-gray-200 p-6 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-xl font-bold text-gray-800">
            {activeTab === 'dashboard' && 'نظرة عامة'}
            {activeTab === 'transactions' && 'قائمة العمليات'}
            {activeTab === 'reports' && 'تقارير الأداء'}
            {activeTab === 'users' && 'إدارة المستخدمين'}
          </h2>
          <div className="flex items-center gap-4">
            {activeTab === 'users' ? (
              <button onClick={() => { setEditingUser(null); setUserForm({ name: '', username: '', password: '', role: UserRole.STAFF, email: '' }); setShowUserModal(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm">
                <Plus size={20} />
                <span>إضافة مستخدم</span>
              </button>
            ) : (
              <button onClick={() => setShowAddModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-sm">
                <Plus size={20} />
                <span>إضافة حركة</span>
              </button>
            )}
          </div>
        </header>

        <div className="p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card title="الرصيد الحالي" value={`${metrics.balance.toLocaleString()} ر.س`} icon={<LayoutDashboard size={24} className="text-indigo-600" />} color="#4f46e5" />
                <Card title="إجمالي الوارد" value={`${metrics.income.toLocaleString()} ر.س`} icon={<ArrowUpCircle size={24} className="text-emerald-600" />} color="#10b981" />
                <Card title="إجمالي المصروف" value={`${metrics.expense.toLocaleString()} ر.س`} icon={<ArrowDownCircle size={24} className="text-rose-600" />} color="#f43f5e" />
                <Card title="بانتظار الموافقة" value={metrics.pendingCount} icon={<Clock size={24} className="text-amber-600" />} color="#d97706" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ArrowUpCircle className="text-indigo-600" size={20} />
                    توزيع المصاريف والواردات
                  </h3>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.type === TransactionType.INCOME ? '#10b981' : '#f43f5e'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
                   <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <Clock className="text-indigo-600" size={20} />
                    أحدث العمليات
                  </h3>
                  <div className="space-y-4 flex-1">
                    {transactions.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {t.type === TransactionType.INCOME ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-gray-800">{t.category}</p>
                            <p className="text-xs text-gray-500">{new Date(t.date).toLocaleDateString('ar-SA')}</p>
                          </div>
                        </div>
                        <div className="text-left">
                          <p className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>{t.type === TransactionType.INCOME ? '+' : '-'}{t.amount}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => setActiveTab('transactions')} className="text-indigo-600 text-sm font-bold mt-4 hover:underline">عرض الكل</button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50 text-gray-600 text-sm font-bold">
                  <tr>
                    <th className="p-4 border-b">العملية</th>
                    <th className="p-4 border-b">المبلغ</th>
                    <th className="p-4 border-b">الموظف</th>
                    <th className="p-4 border-b">التاريخ</th>
                    <th className="p-4 border-b">الحالة</th>
                    <th className="p-4 border-b">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {transactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${t.type === TransactionType.INCOME ? 'bg-emerald-100 text-emerald-600' : 'bg-rose-100 text-rose-600'}`}>
                            {t.type === TransactionType.INCOME ? <ArrowUpCircle size={18} /> : <ArrowDownCircle size={18} />}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{t.category}</p>
                            <p className="text-xs text-gray-500 line-clamp-1">{t.description}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`font-bold ${t.type === TransactionType.INCOME ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {t.amount.toLocaleString()} ر.س
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-bold text-indigo-600">
                            {t.userName?.charAt(0) || '؟'}
                          </div>
                          <span className="text-sm text-gray-700">{t.userName}</span>
                        </div>
                      </td>
                      <td className="p-4 text-sm text-gray-500">{new Date(t.date).toLocaleDateString('ar-SA')}</td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          t.status === TransactionStatus.APPROVED ? 'bg-emerald-100 text-emerald-700' : 
                          t.status === TransactionStatus.PENDING ? 'bg-amber-100 text-amber-700' : 
                          'bg-rose-100 text-rose-700'
                        }`}>
                          {t.status === TransactionStatus.APPROVED ? 'مقبول' : t.status === TransactionStatus.PENDING ? 'قيد المراجعة' : 'مرفوض'}
                        </span>
                      </td>
                      <td className="p-4">
                        {currentUser.role === UserRole.ADMIN && t.status === TransactionStatus.PENDING && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => updateStatus(t.id, TransactionStatus.APPROVED)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"><CheckCircle size={18} /></button>
                            <button onClick={() => updateStatus(t.id, TransactionStatus.REJECTED)} className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"><XCircle size={18} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {transactions.length === 0 && <div className="p-12 text-center text-gray-500">لا توجد حركات مالية مسجلة بعد.</div>}
            </div>
          )}

          {activeTab === 'users' && currentUser.role === UserRole.ADMIN && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
               <table className="w-full text-right border-collapse">
                <thead className="bg-gray-50 text-gray-600 text-sm font-bold">
                  <tr>
                    <th className="p-4 border-b">المستخدم</th>
                    <th className="p-4 border-b">اسم الدخول</th>
                    <th className="p-4 border-b">الدور الوظيفي</th>
                    <th className="p-4 border-b">البريد الإلكتروني</th>
                    <th className="p-4 border-b">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                            {u.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{u.name}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4"><code className="bg-gray-100 px-2 py-1 rounded text-indigo-600 text-sm">{u.username}</code></td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          u.role === UserRole.ADMIN ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {u.role === UserRole.ADMIN ? 'مدير نظام' : 'موظف مالي'}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500 text-sm">{u.email}</td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button onClick={() => { setEditingUser(u); setUserForm({ ...u }); setShowUserModal(true); }} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">
                            <Edit size={18} />
                          </button>
                          {u.id !== currentUser.id && (
                            <button onClick={() => deleteUser(u.id)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors">
                              <Trash2 size={18} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'reports' && currentUser.role === UserRole.ADMIN && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-gray-800">تحليلات الأداء المالي</h3>
                <button onClick={generateAiInsight} disabled={isGeneratingAi} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-indigo-700 disabled:bg-indigo-400 shadow-md transition-all">
                  <Sparkles size={20} className={isGeneratingAi ? 'animate-pulse' : ''} />
                  <span>{isGeneratingAi ? 'جاري التحليل...' : 'توليد تقرير ذكي'}</span>
                </button>
              </div>
              {aiReport && (
                <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-xl prose prose-invert max-w-none">
                  <div className="flex items-center gap-3 mb-6"><Sparkles size={24} /><h4 className="text-xl font-bold">تقرير الذكاء الاصطناعي للمدير</h4></div>
                  <div className="whitespace-pre-wrap text-indigo-50 leading-relaxed">{aiReport}</div>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Transaction Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">إضافة حركة مالية جديدة</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="flex gap-4">
                <button onClick={() => setNewTx({ ...newTx, type: TransactionType.EXPENSE, category: CATEGORIES.find(c => c.type === TransactionType.EXPENSE)?.name || '' })} className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold ${newTx.type === TransactionType.EXPENSE ? 'border-rose-500 bg-rose-50 text-rose-600' : 'border-gray-100 text-gray-500'}`}>صرف</button>
                <button onClick={() => setNewTx({ ...newTx, type: TransactionType.INCOME, category: CATEGORIES.find(c => c.type === TransactionType.INCOME)?.name || '' })} className={`flex-1 py-3 rounded-xl border-2 transition-all font-bold ${newTx.type === TransactionType.INCOME ? 'border-emerald-500 bg-emerald-50 text-emerald-600' : 'border-gray-100 text-gray-500'}`}>قبض</button>
              </div>
              <div className="space-y-4">
                <input type="number" value={newTx.amount} onChange={e => setNewTx({ ...newTx, amount: e.target.value })} className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="المبلغ (ر.س)" />
                <select value={newTx.category} onChange={e => setNewTx({ ...newTx, category: e.target.value })} className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none">
                  {CATEGORIES.filter(c => c.type === newTx.type).map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                </select>
                <textarea value={newTx.description} onChange={e => setNewTx({ ...newTx, description: e.target.value })} rows={3} className="w-full p-4 rounded-xl border border-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none" placeholder="الوصف..." />
              </div>
              <button onClick={addTransaction} className="w-full py-4 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-all shadow-lg">تأكيد الإضافة</button>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="p-6 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-800">{editingUser ? 'تعديل مستخدم' : 'إضافة مستخدم جديد'}</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
            </div>
            <div className="p-8 space-y-4">
              <div><label className="block text-sm font-bold text-gray-700 mb-1">الاسم الكامل</label><input type="text" value={userForm.name} onChange={e => setUserForm({...userForm, name: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="الاسم الكامل" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">اسم الدخول</label><input type="text" value={userForm.username} onChange={e => setUserForm({...userForm, username: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="اسم الدخول" /></div>
              <div><label className="block text-sm font-bold text-gray-700 mb-1">كلمة المرور</label><input type="password" value={userForm.password} onChange={e => setUserForm({...userForm, password: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="••••••••" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-bold text-gray-700 mb-1">الدور</label><select value={userForm.role} onChange={e => setUserForm({...userForm, role: e.target.value as UserRole})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"><option value={UserRole.STAFF}>موظف مالي</option><option value={UserRole.ADMIN}>مدير نظام</option></select></div>
                <div><label className="block text-sm font-bold text-gray-700 mb-1">البريد</label><input type="email" value={userForm.email} onChange={e => setUserForm({...userForm, email: e.target.value})} className="w-full p-3 rounded-xl border border-gray-200 outline-none focus:ring-2 focus:ring-indigo-500" placeholder="البريد" /></div>
              </div>
              <button onClick={saveUser} className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-lg mt-4 transition-all">{editingUser ? 'حفظ التغييرات' : 'إضافة المستخدم'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
