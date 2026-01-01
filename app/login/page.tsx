"use client"

import { useState, useEffect } from "react"
import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    if (status === "authenticated" && session) {
      window.location.replace("/dashboard")
    }
  }, [status, session])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      // Clear any stored callback URLs before signing in
      if (typeof window !== "undefined") {
        sessionStorage.removeItem("nextauth.callbackUrl")
        localStorage.removeItem("nextauth.callbackUrl")
        // Clear all cookies that might contain callback URL
        document.cookie.split(";").forEach((c) => {
          const eqPos = c.indexOf("=")
          const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim()
          if (name.includes("callback") || name.includes("redirect")) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`
          }
        })
      }

      // Use redirect: false and handle redirect manually
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        // Handle different error types
        let errorMessage = result.error
        if (result.error === "Configuration" || result.error.includes("Configuration")) {
          errorMessage = "حدث خطأ في إعدادات النظام. يرجى التحقق من الإعدادات."
        } else if (result.error === "CredentialsSignin") {
          errorMessage = "البريد الإلكتروني أو كلمة المرور غير صحيحة"
        }
        setError(errorMessage)
        setLoading(false)
      } else if (result?.ok) {
        // Log for debugging
        console.log("Login successful, redirecting to /dashboard")
        
        // Immediately redirect - don't wait
        // Use absolute URL to avoid any relative path issues
        const baseUrl = window.location.origin
        console.log("Redirecting to:", `${baseUrl}/dashboard`)
        
        // Clear all potential callback URLs from URL params
        const url = new URL(window.location.href)
        url.searchParams.delete("callbackUrl")
        url.searchParams.delete("redirect")
        url.pathname = "/dashboard"
        
        window.location.href = url.toString()
      }
    } catch (err: any) {
      console.error("Login error:", err)
      let errorMessage = "حدث خطأ أثناء تسجيل الدخول"
      if (err?.message?.includes("Configuration")) {
        errorMessage = "حدث خطأ في إعدادات النظام. يرجى التحقق من ملف .env"
      } else if (err?.message) {
        errorMessage = err.message
      }
      setError(errorMessage)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-pink-50 to-purple-50 px-4">
      <div className="w-full max-w-md">
        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold text-gray-900">Fat2Fit</h1>
            <p className="mt-2 text-gray-600">نظام إدارة النادي النسائي</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                البريد الإلكتروني
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                placeholder="example@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                كلمة المرور
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-pink-500 focus:ring-pink-500"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-gradient-to-r from-pink-500 to-purple-600 px-4 py-3 font-medium text-white transition-colors hover:from-pink-600 hover:to-purple-700 disabled:opacity-50"
            >
              {loading ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}






