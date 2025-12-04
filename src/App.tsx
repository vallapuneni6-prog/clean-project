import { useEffect, useState } from 'react'
import { Home } from './components/Home'
import { Login } from './components/Login'
import { Sidebar } from './components/Sidebar'
import { Vouchers } from './components/Vouchers'
import { VouchersTable } from './components/VouchersTable'
import { UserDashboard } from './components/UserDashboard'
import { Packages } from './components/Packages'
import { Users } from './components/Users'
import { Outlets } from './components/Outlets'
import { Invoices } from './components/Invoices'
import { Notifications } from './components/Notifications'
import { StaffSales } from './components/StaffSales'
import { Voucher, Outlet, CustomerPackage, VoucherStatus, User } from './types'
import { getVouchers, getOutlets, getPackages } from './api'
import './App.css'

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false)
  const [currentView, setCurrentView] = useState<string>('vouchers')
  const [vouchers, setVouchers] = useState<Voucher[]>([])
  const [packages, setPackages] = useState<CustomerPackage[]>([])
  const [outlets, setOutlets] = useState<Outlet[]>([])
  const [isAdmin, setIsAdmin] = useState<boolean>(false)
  const [currentUser, setCurrentUser] = useState<User>({ id: '', username: '', name: undefined, role: 'user', isSuperAdmin: false, outletId: null, outletIds: [] })
  
    // Update localStorage whenever currentUser changes
    useEffect(() => {
      if (currentUser.id) {
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
      }
    }, [currentUser])

  useEffect(() => {
    const token = localStorage.getItem('authToken')
    const storedAdminStatus = localStorage.getItem('isAdmin') === 'true'
    const storedSuperAdminStatus = localStorage.getItem('isSuperAdmin') === 'true'
    const storedView = localStorage.getItem('currentView') || 'vouchers'
    
    if (token) {
      // Try to fetch user info from session-based auth endpoint
      fetch('/api/user-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => res.json())
        .then(data => {
          console.log('User info response:', data);
          if (data.id) {
            const isAdminUser = data.role === 'admin';
            setIsLoggedIn(true);
            setIsAdmin(isAdminUser);
            localStorage.setItem('isAdmin', isAdminUser.toString());
            localStorage.setItem('isSuperAdmin', (data.isSuperAdmin || false).toString());
            const userObj: User = { 
              id: data.id, 
              username: data.username, 
              name: data.name || data.username, 
              role: data.role, 
              isSuperAdmin: data.isSuperAdmin || false, 
              outletId: data.outletId || null, 
              outletIds: data.outletIds || [] 
            };
            setCurrentUser(userObj);
            localStorage.setItem('currentUser', JSON.stringify(userObj));
            setCurrentView(storedView);
            loadData();
          } else {
            // Session expired, redirect to login
            setIsLoggedIn(false);
            localStorage.removeItem('authToken');
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('isSuperAdmin');
            localStorage.removeItem('currentView');
          }
        })
        .catch((error) => {
          console.error('Failed to fetch user info:', error);
          // If user-info fails, redirect to login
          setIsLoggedIn(false);
          localStorage.removeItem('authToken');
          localStorage.removeItem('isAdmin');
          localStorage.removeItem('isSuperAdmin');
          localStorage.removeItem('currentView');
          localStorage.removeItem('currentUser');
        })
    }
  }, [])

  const loadData = async () => {
    try {
      // Fetch data from your API using authenticated requests
      const [vouchersData, outletsData, packagesData] = await Promise.all([
        getVouchers().catch(() => []),
        getOutlets().catch(() => []),
        getPackages().catch(() => [])
      ])
      
      setVouchers(vouchersData.map((v: any) => ({
        ...v,
        issueDate: new Date(v.issueDate),
        expiryDate: new Date(v.expiryDate),
        redeemedDate: v.redeemedDate ? new Date(v.redeemedDate) : undefined
      })))
      setOutlets(outletsData)
      setPackages(packagesData.map((p: any) => ({
        ...p,
        assignedDate: new Date(p.assignedDate)
      })))
    } catch (error) {
      console.error('Failed to load data:', error)
    }
  }

  const handleLogin = (adminStatus: boolean, isSuperAdmin: boolean = false) => {
    setIsLoggedIn(true)
    setIsAdmin(adminStatus)
    setCurrentView('vouchers')
    localStorage.setItem('isAdmin', adminStatus.toString())
    localStorage.setItem('isSuperAdmin', isSuperAdmin.toString())
    // Set current user state properly
    const userObj: User = {
      id: '',
      username: '',
      name: undefined,
      role: adminStatus ? 'admin' : 'user',
      isSuperAdmin: isSuperAdmin,
      outletId: null,
      outletIds: []
    };
    setCurrentUser(userObj);
    localStorage.setItem('currentUser', JSON.stringify(userObj));
    loadData()
  }

  const handleLogout = () => {
    setIsLoggedIn(false)
    setIsAdmin(false)
    localStorage.removeItem('authToken')
    localStorage.removeItem('isAdmin')
    localStorage.removeItem('isSuperAdmin')
    localStorage.removeItem('currentView')
    localStorage.removeItem('currentUser')
  }

  // Save currentView to localStorage whenever it changes
  useEffect(() => {
    if (isLoggedIn) {
      localStorage.setItem('currentView', currentView)
    }
  }, [currentView, isLoggedIn])

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />
  }

  const renderView = () => {
    switch (currentView) {
      case 'home-super':
      case 'home':
        return <Home vouchers={vouchers} packages={packages} outlets={outlets} isAdmin={isAdmin} currentUser={currentUser} />
      case 'vouchers':
        return isAdmin ? <VouchersTable vouchers={vouchers} outlets={outlets} currentUser={currentUser} /> : <Vouchers />
      case 'packages':
        return isAdmin ? <Packages currentUser={currentUser} outlets={outlets} /> : <UserDashboard currentUser={currentUser} outlets={outlets} />
      case 'invoices':
        return <Invoices currentUser={currentUser} outlets={outlets} isAdmin={isAdmin} />
      case 'notifications':
        return <Notifications />
      case 'staff-sales':
        return <StaffSales currentUser={currentUser} />
      case 'users':
        return <Users currentUser={currentUser} />
      case 'outlets':
        return <Outlets currentUser={currentUser} />
      default:
        return isAdmin ? <Home vouchers={vouchers} packages={packages} outlets={outlets} isAdmin={isAdmin} currentUser={currentUser} /> : <UserDashboard currentUser={currentUser} outlets={outlets} />
    }
  }

  return (
    <div className="min-h-screen bg-brand-background flex flex-col md:flex-row">
      <Sidebar currentView={currentView} onViewChange={setCurrentView} isAdmin={isAdmin} onLogout={handleLogout} currentUser={currentUser} />
      
      <div className="flex-1 flex flex-col">
        <nav className="bg-white dark:bg-gray-900 shadow-sm border-b border-brand-border">
          <div className="px-4 sm:px-6 lg:px-8 py-3 flex justify-end items-center">
            <div className="flex items-center gap-4">
              <p className="text-sm font-semibold text-brand-text-primary">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold text-white ${currentUser.isSuperAdmin ? 'bg-purple-600' : currentUser.role === 'admin' ? 'bg-brand-primary' : 'bg-gray-500'}`}>
                  {currentUser.isSuperAdmin ? 'Super Admin' : currentUser.role === 'admin' ? 'Admin' : 'User'}
                </span>
              </p>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
              >
                Logout
              </button>
            </div>

          </div>
        </nav>
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8 overflow-auto">
          {renderView()}
        </main>
      </div>
    </div>
  )
}

export default App