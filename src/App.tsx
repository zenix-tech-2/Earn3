import { useState, useEffect, useRef } from 'react'
import { supabase, COUNTRIES, getCountry, formatCurrency, Profile, Product, Transaction, PendingPayment } from '@/lib/supabase'
import { HomeIcon, WalletIcon, UsersIcon, ChatBubbleLeftRightIcon, UserIcon, ChevronLeftIcon, XMarkIcon, LanguageIcon, Cog6ToothIcon, ArrowUpIcon, ArrowDownIcon, ClipboardDocumentIcon, BellIcon, QuestionMarkCircleIcon, InformationCircleIcon, ShieldCheckIcon, DocumentTextIcon, PhoneIcon, EnvelopeIcon, TrophyIcon, GiftIcon, PlayIcon, VideoCameraIcon, BanknotesIcon, GlobeAltIcon, ArrowsRightLeftIcon, ChartBarIcon, MagnifyingGlassIcon, PaperAirplaneIcon, ClockIcon, PhotoIcon, FilmIcon, DocumentIcon, CheckIcon } from '@/components/icons'
import { translations, Language } from '@/i18n'

type Page = 'auth' | 'login' | 'signup' | 'forgot-password' | 'home' | 'deposit' | 'withdraw' | 'affiliate' | 'affiliateStats' | 'updates' | 'chat' | 'account' | 'recentChats' | 'adminPanel' | 'adminUsers' | 'adminPayments' | 'adminApiKeys' | 'adminProducts' | 'adminPostUpdate' | 'adminPostVideo' | 'adminPostFile' | 'adminPostLink' | 'adminAccountLogin' | 'adminChats' | 'adminFinance' | 'adminApproveUsers' | 'adminAiSettings' | 'products' | 'settings' | 'editProfile' | 'help' | 'about' | 'terms' | 'privacy' | 'faq' | 'contact' | 'videoRewards' | 'gameRewards' | 'playGame' | 'campaigns' | 'productCreate'
type Tab = 'home' | 'affiliate' | 'updates' | 'chat' | 'account'

export default function App() {
  const [lang, setLang] = useState<Language>('en')
  const [page, setPage] = useState<Page>('auth')
  const [tab, setTab] = useState<Tab>('home')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [pwaInstallPrompt, setPwaInstallPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)
  
  // Auth state
  const [session, setSession] = useState<any>(null)
  const [user, setUser] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(false)
  const [authForm, setAuthForm] = useState({ email: '', password: '', name: '', username: '', phone: '', country: 'NG' })
  
  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([])
  const [adminConfigs, setAdminConfigs] = useState<Record<string, any>>({})
  const [rewardsEnabled, setRewardsEnabled] = useState(true)
  
  // UI state
  const [toast, setToast] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [selectedAdminChat, setSelectedAdminChat] = useState<string | null>(null)
  const [depositMethod, setDepositMethod] = useState<'chariow' | 'manual'>('chariow')
  const [amount, setAmount] = useState('')
  const [withdrawMethod, setWithdrawMethod] = useState<'paypal' | 'mobileMoney' | 'bank' | 'crypto'>('paypal')
  const [withdrawDetails, setWithdrawDetails] = useState({ accountName: '', accountNumber: '', operator: 'MTN' })
  const [productForm, setProductForm] = useState({
    title: '', description: '', category: '', type: '', platform: '', link: '',
    credential1Label: 'Email', credential1Value: '',
    credential2Label: 'Password', credential2Value: '',
    accountSlots: [{ id: '1', credential1: '', credential2: '' }]
  })
  const [showTypeSheet, setShowTypeSheet] = useState(false)
  const [showCategorySheet, setShowCategorySheet] = useState(false)
  const [gameScore, setGameScore] = useState(0)
  const [playingGame, setPlayingGame] = useState(false)
  const [watchingVideo, setWatchingVideo] = useState(false)
  const [videoProgress, setVideoProgress] = useState(0)
  
  const t = translations[lang]
  const tx = (key: string) => t[key as keyof typeof t] || key
  const userCountry = user ? getCountry(user.country) : getCountry('NG')

  // PWA Install Prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault()
      setPwaInstallPrompt(e)
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
  }, [])

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) fetchProfile(session.user.id)
    })
  }, [])

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (!error && data) setUser(data as Profile)
  }

  const fetchProducts = async () => {
    const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false })
    if (!error) setProducts(data as Product[])
  }

  const fetchTransactions = async () => {
    if (!user) return
    const { data, error } = await supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    if (!error) setTransactions(data as Transaction[])
  }

  const fetchPendingPayments = async () => {
    const { data, error } = await supabase.from('pending_payments').select('*').eq('status', 'pending').order('created_at', { ascending: false })
    if (!error) setPendingPayments(data as PendingPayment[])
  }

  const fetchAdminConfigs = async () => {
    const { data, error } = await supabase.from('admin_configs').select('*')
    if (!error && data) {
      const configs: Record<string, any> = {}
      data.forEach((c: any) => configs[c.key] = c.value)
      setAdminConfigs(configs)
      setRewardsEnabled(configs['rewards_enabled']?.enabled ?? true)
    }
  }

  useEffect(() => {
    if (user) {
      fetchProducts()
      fetchTransactions()
    }
    if (user?.is_admin) {
      fetchPendingPayments()
      fetchAdminConfigs()
    }
  }, [user])

  // Auth handlers
  const handleLogin = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({
      email: authForm.email,
      password: authForm.password
    })
    if (error) showToast(error.message)
    else if (data.user) fetchProfile(data.user.id)
    setLoading(false)
  }

  const handleSignup = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signUp({
      email: authForm.email,
      password: authForm.password,
      options: {
        data: {
          name: authForm.name,
          username: authForm.username,
          phone: authForm.phone,
          country: authForm.country,
          currency: getCountry(authForm.country).currency,
          referral_code: 'EAR-' + Math.random().toString(36).substring(2, 8).toUpperCase()
        }
      }
    })
    if (error) showToast(error.message)
    else {
      showToast('Check email for confirmation!')
      setPage('login')
    }
    setLoading(false)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    })
    if (error) showToast(error.message)
    setLoading(false)
  }

  const handleForgotPassword = async () => {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(authForm.email, {
      redirectTo: window.location.origin + '#reset-password'
    })
    if (error) showToast(error.message)
    else {
      showToast('Reset email sent!')
      setPage('login')
    }
    setLoading(false)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setPage('auth')
  }

  const handleUpdateProfile = async () => {
    if (!user) return
    const { error } = await supabase.from('profiles').update({
      name: authForm.name || user.name,
      username: authForm.username || user.username,
      phone: authForm.phone || user.phone,
      country: authForm.country || user.country,
      currency: getCountry(authForm.country || user.country).currency
    }).eq('id', user.id)
    if (error) showToast(error.message)
    else {
      showToast('Profile updated!')
      fetchProfile(user.id)
      setPage('account')
    }
  }

  const handleDeposit = async () => {
    if (!user || !amount) return
    setLoading(true)
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'deposit',
      amount: Number(amount),
      method: depositMethod,
      status: 'completed'
    })
    if (error) showToast(error.message)
    else {
      showToast('Deposit successful!')
      setAmount('')
      fetchTransactions()
    }
    setLoading(false)
  }

  const handleWithdraw = async () => {
    if (!user || !amount || Number(amount) > (user.balance || 0)) return
    setLoading(true)
    const { error } = await supabase.from('transactions').insert({
      user_id: user.id,
      type: 'withdraw',
      amount: Number(amount),
      method: withdrawMethod === 'mobileMoney' ? withdrawDetails.operator : withdrawMethod,
      status: 'pending'
    })
    if (error) showToast(error.message)
    else {
      showToast('Withdrawal submitted!')
      setAmount('')
      fetchTransactions()
    }
    setLoading(false)
  }

  const handlePaymentApproval = async (paymentId: string, approve: boolean) => {
    const { error } = await supabase.from('pending_payments').update({
      status: approve ? 'approved' : 'rejected',
      reviewed_by: user?.id,
      reviewed_at: new Date().toISOString()
    }).eq('id', paymentId)
    if (!error) fetchPendingPayments()
  }

  const handleCreateProduct = async () => {
    if (!productForm.title || !productForm.category || !productForm.type) return
    const { error } = await supabase.from('products').insert({
      title: productForm.title,
      description: productForm.description,
      category: productForm.category,
      icon: productForm.type === 'ebook' ? '📚' : productForm.type === 'file' ? '📄' : '📦',
      is_free: true,
      link: productForm.link || undefined,
      platform: productForm.platform || undefined
    })
    if (error) showToast(error.message)
    else {
      showToast('Product created!')
      setProductForm({ title: '', description: '', category: '', type: '', platform: '', link: '', credential1Label: 'Email', credential1Value: '', credential2Label: 'Password', credential2Value: '', accountSlots: [{ id: '1', credential1: '', credential2: '' }] })
      fetchProducts()
      setPage('products')
    }
  }

  const handleSaveRewardApi = async () => {
    const { error } = await supabase.from('admin_configs').upsert({
      key: 'rewards_api_endpoint',
      value: { url: productForm.platform, key: productForm.credential1Value }
    })
    if (!error) showToast('Reward API saved!')
  }

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const installPwa = () => {
    if (pwaInstallPrompt) {
      pwaInstallPrompt.prompt()
      setPwaInstallPrompt(null)
      setCanInstall(false)
    }
  }

  const isAdmin = user?.is_admin || false
  const isPaid = user?.is_paid || false

  // Bottom sheets handlers
  const PRODUCT_TYPES = [
    { value: 'ebook', label: 'Ebook / PDF', icon: '📚' },
    { value: 'file', label: 'Digital File', icon: '📄' },
    { value: 'social_account', label: 'Social Media Account', icon: '📱' },
    { value: 'source_code', label: 'Source Code / Script', icon: '💻' },
    { value: 'course', label: 'Online Course', icon: '🎓' },
    { value: 'other', label: 'Other', icon: '📦' }
  ]

  const CATEGORIES = [
    { value: 'Finance', label: 'Finance', icon: '💰' },
    { value: 'Marketing', label: 'Marketing', icon: '📈' },
    { value: 'Social Media', label: 'Social Media', icon: '📱' },
    { value: 'Education', label: 'Education', icon: '🎓' },
    { value: 'Technology', label: 'Technology', icon: '💻' },
    { value: 'Other', label: 'Other', icon: '📦' }
  ]

  const navigate = (p: Page) => {
    window.history.pushState({}, '', `#${p}`)
    setPage(p)
  }

  // Auth Page
  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-lg">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black text-gray-900">EARNIZI</h1>
            <p className="text-gray-500 text-sm mt-1">earn.sellizi.store</p>
          </div>

          {page === 'auth' && (
            <div className="space-y-4">
              <button onClick={() => setPage('login')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Login</button>
              <button onClick={() => setPage('signup')} className="w-full border border-gray-200 py-3 rounded-xl font-bold">Sign Up</button>
            </div>
          )}

          {(page === 'login' || page === 'signup') && (
            <div className="space-y-4">
              {page === 'signup' && (
                <>
                  <input type="text" placeholder="Full Name" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
                  <input type="text" placeholder="Username" value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
                  <input type="tel" placeholder="Phone Number" value={authForm.phone} onChange={e => setAuthForm({ ...authForm, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
                  <select value={authForm.country} onChange={e => setAuthForm({ ...authForm, country: e.target.value })} className="w-full px-4 py-3 rounded-xl border">
                    {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
                  </select>
                </>
              )}
              <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              <input type="password" placeholder="Password" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              
              <button onClick={page === 'login' ? handleLogin : handleSignup} disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">
                {loading ? 'Loading...' : page === 'login' ? 'Login' : 'Sign Up'}
              </button>
              
              <button onClick={handleGoogleLogin} disabled={loading} className="w-full border border-gray-200 py-3 rounded-xl font-bold flex items-center justify-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.18-2.27H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.88 7.49-2.37l-3.57-2.77c-.89.66-1.97 1.08-3.12 1.08-2.48 0-4.54-1.82-5.27-4.27H3.58v4.39c1.93 2.77 5.05 4.77 8.92 4.77z"/><path fill="#FBBC05" d="M6.73 15.71c-.24-.71-.37-1.48-.37-2.29s.13-1.58.37-2.29V6.82H3.58A11.98 11.98 0 0012 4c2.97 0 5.46.88 7.49 2.37l-3.57 2.77c-.89-.66-1.97-1.08-3.12-1.08-2.48 0-4.54-1.82-5.27-4.27H3.58v4.39z"/><path fill="#EA4335" d="M19.61 8.29c1.93 2.77 5.05 4.77 8.92 4.77-.7 3.31-2.91 5.97-6.22 7.22l3.57-2.77c1.84-1.65 2.97-4.01 2.97-6.75 0-.91-.1-1.79-.27-2.67L12 6.82v2.39z"/></svg>
                Google
              </button>

              {page === 'login' && (
                <button onClick={() => setPage('forgot-password')} className="text-sm text-center text-gray-600 underline">Forgot Password?</button>
              )}
              
              <button onClick={() => setPage('auth')} className="text-sm text-center text-gray-600">← Back</button>
            </div>
          )}

          {page === 'forgot-password' && (
            <div className="space-y-4">
              <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              <button onClick={handleForgotPassword} disabled={loading} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Reset Password</button>
              <button onClick={() => setPage('login')} className="text-sm text-center text-gray-600">← Back to Login</button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Main App
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="fixed top-0 left-0 right-0 h-14 bg-white z-40 flex items-center justify-between px-4 border-b">
        <button onClick={() => setDrawerOpen(true)} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-50">
          <HomeIcon className="w-6 h-6 text-gray-700" />
        </button>
        <span className="text-lg font-black">EARNIZI</span>
        <div className="flex items-center gap-2">
          <button className="w-10 h-10 flex items-center justify-center rounded-full border"><BellIcon className="w-5 h-5" /></button>
          <button onClick={() => navigate('account')} className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-900 text-white"><UserIcon className="w-5 h-5" /></button>
        </div>
      </header>

      {/* Content */}
      <main className="pt-16 pb-20 px-4">
        {page === 'home' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-xl font-bold">
                {user?.name?.[0]}
              </div>
              <h2 className="text-xl font-bold">Welcome, {user?.name}!</h2>
              <p className="text-gray-500">Balance: {formatCurrency(user?.balance || 0, userCountry.symbol)}</p>
            </div>

            {!isPaid && (
              <div className="bg-amber-50 rounded-2xl p-4 mb-4 border border-amber-200">
                <h3 className="font-bold text-amber-800">Unlock Full Access</h3>
                <p className="text-sm text-amber-600">Pay {formatCurrency(2300, userCountry.symbol)} to access all features</p>
                <button onClick={() => navigate('deposit')} className="mt-2 bg-gray-900 text-white px-4 py-2 rounded-xl text-sm font-bold">Pay Now</button>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              {[{ icon: TrophyIcon, label: 'Earn', page: 'affiliate' }, { icon: PlayIcon, label: 'Games', page: 'gameRewards' }, { icon: VideoCameraIcon, label: 'Videos', page: 'videoRewards' }, { icon: BanknotesIcon, label: 'Withdraw', page: 'withdraw' }].map((item, i) => (
                <button key={i} onClick={() => navigate(item.page as Page)} className="bg-white rounded-2xl p-4 text-center border">
                  <item.icon className="w-8 h-8 mx-auto mb-2" />
                  <div className="text-sm font-bold">{item.label}</div>
                </button>
              ))}
            </div>

            <div className="bg-white rounded-2xl p-4 border">
              <h3 className="font-bold mb-2">Recent Transactions</h3>
              {transactions.slice(0, 3).map(tx => (
                <div key={tx.id} className="flex justify-between py-2 border-b text-sm">
                  <span>{tx.type}</span>
                  <span className={tx.type === 'deposit' || tx.type === 'earn' ? 'text-green-600' : 'text-red-600'}>
                    {tx.type === 'deposit' || tx.type === 'earn' ? '+' : '-'}{formatCurrency(tx.amount, userCountry.symbol)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === 'products' && (
          <div>
            <h2 className="text-lg font-bold mb-4">Free Products</h2>
            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 mb-3 border">
                <div className="text-3xl mb-2">{p.icon}</div>
                <h3 className="font-bold">{p.title}</h3>
                <p className="text-sm text-gray-500">{p.description}</p>
                {p.link && <a href={p.link} className="text-blue-500 text-sm mt-2 inline-block">Open Link</a>}
              </div>
            ))}
            {isAdmin && (
              <button onClick={() => navigate('productCreate')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold mt-4">Add Product</button>
            )}
          </div>
        )}

        {page === 'productCreate' && isAdmin && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('products')} className="w-10 h-10 flex items-center justify-center rounded-full"><ChevronLeftIcon className="w-6 h-6" /></button>
              <h2 className="text-lg font-bold">Create Product</h2>
            </div>

            <div className="space-y-3">
              <input type="text" placeholder="Title" value={productForm.title} onChange={e => setProductForm({ ...productForm, title: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              <textarea placeholder="Description" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              
              <button onClick={() => setShowTypeSheet(true)} className="w-full bg-gray-100 py-3 rounded-xl font-bold text-left px-4">
                Type: {productForm.type ? PRODUCT_TYPES.find(t => t.value === productForm.type)?.label : 'Select'}
              </button>
              
              <button onClick={() => setShowCategorySheet(true)} className="w-full bg-gray-100 py-3 rounded-xl font-bold text-left px-4">
                Category: {productForm.category || 'Select'}
              </button>

              <input type="text" placeholder="Link (optional)" value={productForm.link || ''} onChange={e => setProductForm({ ...productForm, link: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />

              <button onClick={handleCreateProduct} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Create</button>
            </div>

            {/* Type Bottom Sheet */}
            {showTypeSheet && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowTypeSheet(false)}>
                <div className="bg-gray-900 w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
                  {PRODUCT_TYPES.map(t => (
                    <button key={t.value} onClick={() => { setProductForm({ ...productForm, type: t.value }); setShowTypeSheet(false) }} className="w-full py-4 text-left text-white flex items-center gap-3">
                      <span className="text-2xl">{t.icon}</span>
                      <span>{t.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Category Bottom Sheet */}
            {showCategorySheet && (
              <div className="fixed inset-0 z-50 bg-black/50 flex items-end" onClick={() => setShowCategorySheet(false)}>
                <div className="bg-gray-900 w-full rounded-t-2xl p-4" onClick={e => e.stopPropagation()}>
                  {CATEGORIES.map(c => (
                    <button key={c.value} onClick={() => { setProductForm({ ...productForm, category: c.value }); setShowCategorySheet(false) }} className="w-full py-4 text-left text-white flex items-center gap-3">
                      <span className="text-2xl">{c.icon}</span>
                      <span>{c.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {page === 'account' && (
          <div>
            <div className="text-center mb-6">
              <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-3 text-white text-2xl font-bold">{user?.name?.[0]}</div>
              <h2 className="text-xl font-bold">{user?.name}</h2>
              <p className="text-gray-500">{user?.email}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 mb-4 border">
              <div className="flex justify-between py-2 border-b"><span>Balance</span><span className="font-bold">{formatCurrency(user?.balance || 0, userCountry.symbol)}</span></div>
              <div className="flex justify-between py-2 border-b"><span>Total Earnings</span><span className="font-bold">{formatCurrency(user?.total_earnings || 0, userCountry.symbol)}</span></div>
              <div className="flex justify-between py-2"><span>Status</span><span className={isPaid ? 'text-green-600' : 'text-red-600'}>{isPaid ? 'Active' : 'Inactive'}</span></div>
            </div>

            <div className="bg-white rounded-2xl border">
              <button onClick={() => navigate('deposit')} className="w-full py-3 px-4 border-b flex items-center gap-3"><ArrowDownIcon className="w-5 h-5 text-green-600" /><span>Deposit</span></button>
              <button onClick={() => navigate('withdraw')} className="w-full py-3 px-4 border-b flex items-center gap-3"><ArrowUpIcon className="w-5 h-5 text-red-600" /><span>Withdraw</span></button>
              <button onClick={() => navigate('editProfile')} className="w-full py-3 px-4 border-b flex items-center gap-3"><UserIcon className="w-5 h-5" /><span>Edit Profile</span></button>
              <button onClick={handleLogout} className="w-full py-3 px-4 text-red-600 font-bold">Logout</button>
              {canInstall && (
                <button onClick={installPwa} className="w-full py-3 px-4 bg-blue-500 text-white font-bold mt-2 rounded-xl">Install App</button>
              )}
            </div>
          </div>
        )}

        {page === 'editProfile' && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('account')} className="w-10 h-10 flex items-center justify-center rounded-full"><ChevronLeftIcon className="w-6 h-6" /></button>
              <h2 className="text-lg font-bold">Edit Profile</h2>
            </div>

            <div className="bg-white rounded-2xl p-4 border space-y-3">
              <input type="text" placeholder="Full Name" value={authForm.name || user?.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              <input type="text" placeholder="Username" value={authForm.username || user?.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              <input type="tel" placeholder="Phone" value={authForm.phone || user?.phone} onChange={e => setAuthForm({ ...authForm, phone: e.target.value })} className="w-full px-4 py-3 rounded-xl border" />
              <select value={authForm.country || user?.country} onChange={e => setAuthForm({ ...authForm, country: e.target.value })} className="w-full px-4 py-3 rounded-xl border">
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
              <button onClick={handleUpdateProfile} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Save Changes</button>
            </div>
          </div>
        )}

        {page === 'adminPanel' && isAdmin && (
          <div>
            <h2 className="text-lg font-bold mb-4">Admin Panel</h2>
            <div className="grid grid-cols-2 gap-3">
              {[{ page: 'adminApiKeys', label: 'API Keys', icon: '🔑' }, { page: 'adminApproveUsers', label: 'Approvals', icon: '✅' }, { page: 'adminProducts', label: 'Products', icon: '📦' }, { page: 'adminChats', label: 'Chats', icon: '💬' }].map(item => (
                <button key={item.page} onClick={() => navigate(item.page as Page)} className="bg-white rounded-2xl p-4 text-center border">
                  <div className="text-3xl mb-2">{item.icon}</div>
                  <div className="font-bold text-sm">{item.label}</div>
                </button>
              ))}
            </div>
            <div className="mt-4 p-3 bg-gray-100 rounded-xl text-sm">
              <div className="font-bold mb-2">Quick Stats</div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white rounded-xl p-2 text-center"><div className="text-xl font-bold">{products.length}</div><div className="text-xs">Products</div></div>
                <div className="bg-white rounded-xl p-2 text-center"><div className="text-xl font-bold">{pendingPayments.length}</div><div className="text-xs">Pending</div></div>
              </div>
            </div>
          </div>
        )}

        {page === 'adminApiKeys' && isAdmin && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('adminPanel')} className="w-10 h-10 flex items-center justify-center rounded-full"><ChevronLeftIcon className="w-6 h-6" /></button>
              <h2 className="text-lg font-bold">API Settings</h2>
            </div>

            <div className="bg-white rounded-2xl p-4 border space-y-3">
              <div>
                <label className="text-sm font-bold">Rewards API Endpoint</label>
                <input type="text" placeholder="https://api.rapido.com/v1" value={productForm.platform} onChange={e => setProductForm({ ...productForm, platform: e.target.value })} className="w-full px-4 py-3 rounded-xl border mt-2" />
              </div>
              <div>
                <label className="text-sm font-bold">Rewards API Key</label>
                <input type="password" placeholder="Enter API key" value={productForm.credential1Value} onChange={e => setProductForm({ ...productForm, credential1Value: e.target.value })} className="w-full px-4 py-3 rounded-xl border mt-2" />
              </div>
              <button onClick={handleSaveRewardApi} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold">Save API Config</button>
              <div className="flex items-center justify-between mt-4">
                <span>Rewards Enabled</span>
                <button onClick={() => setRewardsEnabled(!rewardsEnabled)} className={"w-12 h-6 rounded-full " + (rewardsEnabled ? "bg-green-500" : "bg-gray-300")}>
                  <div className={"w-5 h-5 bg-white rounded-full transition-transform " + (rewardsEnabled ? "translate-x-6" : "translate-x-0.5") + " mt-0.5"} />
                </button>
              </div>
            </div>
          </div>
        )}

        {page === 'adminApproveUsers' && isAdmin && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('adminPanel')} className="w-10 h-10 flex items-center justify-center rounded-full"><ChevronLeftIcon className="w-6 h-6" /></button>
              <h2 className="text-lg font-bold">Pending Approvals ({pendingPayments.length})</h2>
            </div>

            {pendingPayments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">No pending approvals ✨</div>
            ) : (
              pendingPayments.map(p => (
                <div key={p.id} className="bg-white rounded-2xl p-4 mb-3 border">
                  <div className="font-bold">{p.user_name}</div>
                  <div className="text-sm text-gray-500">{p.user_email}</div>
                  <div className="text-sm">Amount: {formatCurrency(p.amount, userCountry.symbol)}</div>
                  <div className="text-xs text-gray-400">{p.method}</div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handlePaymentApproval(p.id, true)} className="flex-1 bg-green-500 text-white py-2 rounded-xl font-bold">Approve</button>
                    <button onClick={() => handlePaymentApproval(p.id, false)} className="flex-1 bg-red-500 text-white py-2 rounded-xl font-bold">Reject</button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {page === 'adminProducts' && isAdmin && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('adminPanel')} className="w-10 h-10 flex items-center justify-center rounded-full"><ChevronLeftIcon className="w-6 h-6" /></button>
              <h2 className="text-lg font-bold">Products ({products.length})</h2>
            </div>

            <button onClick={() => navigate('productCreate')} className="w-full bg-gray-900 text-white py-3 rounded-xl font-bold mb-4">Add Product</button>

            {products.map(p => (
              <div key={p.id} className="bg-white rounded-2xl p-4 mb-3 border">
                <div className="text-2xl mb-2">{p.icon}</div>
                <div className="font-bold">{p.title}</div>
                <div className="text-sm text-gray-500">{p.category}</div>
              </div>
            ))}
          </div>
        )}

        {page === 'adminChats' && isAdmin && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => navigate('adminPanel')} className="w-10 h-10 flex items-center justify-center rounded-full"><ChevronLeftIcon className="w-6 h-6" /></button>
              <h2 className="text-lg font-bold">Support Chats</h2>
            </div>

            <div className="bg-white rounded-2xl p-4 border">
              <div className="text-center text-gray-500 py-8">Chat system ready - connect Supabase for real-time messaging</div>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Tab Bar */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t flex items-center justify-around">
        {[{ id: 'home', icon: HomeIcon, label: 'Home' }, { id: 'affiliate', icon: UsersIcon, label: 'Affiliate' }, { id: 'updates', icon: VideoCameraIcon, label: 'Updates' }, { id: 'chat', icon: ChatBubbleLeftRightIcon, label: 'Chat' }, { id: 'account', icon: UserIcon, label: 'Account' }].map(t => (
          <button key={t.id} onClick={() => navigate(t.id as Page)} className="flex flex-col items-center">
            <t.icon className={"w-6 h-6 " + (tab === t.id ? "text-amber-500" : "text-gray-400")} />
            <span className="text-[10px]">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* Toast */}
      {toast && <div className="fixed top-20 left-4 right-4 bg-gray-900 text-white py-3 px-4 rounded-xl z-50">{toast}</div>}

      {/* Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setDrawerOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white p-4" onClick={e => e.stopPropagation()}>
            <button onClick={() => setDrawerOpen(false)} className="mb-4"><XMarkIcon className="w-6 h-6" /></button>
            <button onClick={() => { navigate('home'); setDrawerOpen(false) }} className="block w-full py-2">Home</button>
            <button onClick={() => { navigate('products'); setDrawerOpen(false) }} className="block w-full py-2">Products</button>
            <button onClick={() => { navigate('affiliate'); setDrawerOpen(false) }} className="block w-full py-2">Affiliate</button>
            {isAdmin && <button onClick={() => { navigate('adminPanel'); setDrawerOpen(false) }} className="block w-full py-2">Admin Panel</button>}
          </div>
        </div>
      )}
    </div>
  )
}