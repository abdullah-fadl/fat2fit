import { auth } from "@/lib/auth"
import { hasPermission } from "@/lib/permissions"
import { PERMISSIONS } from "@/lib/permissions"
import { redirect } from "next/navigation"
import Link from "next/link"
import { signOut } from "@/lib/auth"
import Image from "next/image"
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  Ticket,
  FileText,
  LogIn,
  BarChart3,
  UserCircle,
  LogOut,
  Settings,
  Fingerprint,
  History,
  Megaphone,
  Messages,
  Shield,
} from "lucide-react"
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  if (!session) {
    redirect("/login")
  }

  const userRole = (session.user as any)?.role || "RECEPTION"

  // Navigation items based on permissions
  const navItems = [
    {
      name: "لوحة الاستقبال",
      href: "/dashboard",
      icon: LayoutDashboard,
      permission: PERMISSIONS.CLIENTS_VIEW,
    },
    {
      name: "العميلات",
      href: "/dashboard/clients",
      icon: Users,
      permission: PERMISSIONS.CLIENTS_VIEW,
    },
    {
      name: "الاشتراكات",
      href: "/dashboard/subscriptions",
      icon: CreditCard,
      permission: PERMISSIONS.SUBSCRIPTIONS_VIEW,
    },
    {
      name: "الباقات",
      href: "/dashboard/packages",
      icon: Package,
      permission: PERMISSIONS.PACKAGES_VIEW,
    },
    {
      name: "الكوبونات",
      href: "/dashboard/coupons",
      icon: Ticket,
      permission: PERMISSIONS.COUPONS_VIEW,
    },
    {
      name: "الفواتير",
      href: "/dashboard/invoices",
      icon: FileText,
      permission: PERMISSIONS.INVOICES_VIEW,
    },
    {
      name: "تسجيل دخول",
      href: "/dashboard/checkin",
      icon: LogIn,
      permission: PERMISSIONS.CHECKIN,
    },
    {
      name: "الموظفات والمدربات",
      href: "/dashboard/staff",
      icon: UserCircle,
      permission: PERMISSIONS.STAFF_VIEW,
    },
    {
      name: "التقارير",
      href: "/dashboard/reports",
      icon: BarChart3,
      permission: PERMISSIONS.REPORTS_VIEW,
    },
    {
      name: "أجهزة البصمة ZK",
      href: "/dashboard/zk-devices",
      icon: Fingerprint,
      permission: PERMISSIONS.ZK_DEVICES_VIEW,
    },
    {
      name: "سجل الأنشطة",
      href: "/dashboard/audit-logs",
      icon: History,
      permission: PERMISSIONS.AUDIT_LOG_VIEW,
    },
    {
      name: "الحملات التسويقية",
      href: "/dashboard/campaigns",
      icon: Megaphone,
      permission: PERMISSIONS.CAMPAIGNS_VIEW,
    },
    {
      name: "الرسائل",
      href: "/dashboard/messages",
      icon: Messages,
      permission: PERMISSIONS.MESSAGES_VIEW,
    },
    {
      name: "الأمان والخصوصية",
      href: "/dashboard/security",
      icon: Shield,
      permission: PERMISSIONS.STAFF_VIEW, // ADMIN only
    },
  ].filter((item) => {
    return hasPermission(userRole, item.permission)
  })

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed right-0 top-0 z-40 h-screen w-56 transform border-l border-pink-400/20 bg-gradient-to-b from-pink-500 to-purple-600 shadow-lg transition-transform lg:translate-x-0">
        <div className="flex h-full flex-col">
          {/* Logo/Header */}
          <div className="flex h-14 items-center justify-center border-b border-white/20 px-4">
            <Link href="/dashboard" className="flex items-center justify-center">
              <Image
                src="/logo.png"
                alt="Fat2Fit Logo"
                width={100}
                height={35}
                className="h-auto w-auto max-h-10 object-contain"
                priority
              />
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 py-6">
            <ul className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white/90 transition-colors hover:bg-white/20 hover:text-white"
                    >
                      <Icon className="h-5 w-5" />
                      <span>{item.name}</span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* User Info & Logout */}
          <div className="border-t border-white/20 p-4">
            <div className="mb-2 flex items-center gap-3 px-4 py-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/20 backdrop-blur-sm">
                <UserCircle className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {session.user?.name || "مستخدم"}
                </p>
                <p className="text-xs text-white/70">
                  {userRole === "ADMIN" ? "مديرة" : userRole === "RECEPTION" ? "استقبال" : "مدربة"}
                </p>
              </div>
            </div>
            <form
              action={async () => {
                "use server"
                await signOut({ redirectTo: "/login" })
              }}
            >
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-white/20"
              >
                <LogOut className="h-5 w-5" />
                <span>تسجيل الخروج</span>
              </button>
            </form>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pr-56 lg:pr-56">
        <div className="min-h-screen bg-gray-50">{children}</div>
      </main>
    </div>
  )
}

