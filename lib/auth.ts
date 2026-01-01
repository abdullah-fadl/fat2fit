import NextAuth, { type NextAuthConfig } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import * as bcrypt from "bcryptjs"

export const authOptions: NextAuthConfig = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null
          }

          // تسجيل دخول تجريبي ثابت للديمو (بدون قاعدة بيانات)
          if (
            credentials.email === "demo@fat2fit.com" &&
            credentials.password === "123456"
          ) {
            return {
              id: "demo-admin-001",
              email: "demo@fat2fit.com",
              name: "مديرة النظام (ديمو)",
              role: "ADMIN",
            }
          }

          // تسجيل دخول موظفة استقبال تجريبية
          if (
            credentials.email === "demo-reception@fat2fit.com" &&
            credentials.password === "123456"
          ) {
            return {
              id: "demo-reception-001",
              email: "demo-reception@fat2fit.com",
              name: "موظفة الاستقبال (ديمو)",
              role: "RECEPTION",
            }
          }

          // تسجيل دخول من قاعدة البيانات (للاستخدام الفعلي)
          const user = await prisma.user.findUnique({
            where: { email: credentials.email as string }
          })

          if (!user || !user.isActive) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password as string,
            user.password
          )

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email || "",
            name: user.name,
            role: user.role,
          }
        } catch (error) {
          console.error("Authorization error:", error)
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = (user as any)?.role || ""
      }
      return token
    },
    async session({ session, token }) {
      if (session.user && token) {
        (session.user as any).id = token.id as string
        (session.user as any).role = token.role as string
      }
      return session
    }
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET?.replace(/^["']|["']$/g, '') || "your-secret-key-change-in-production",
  trustHost: true,
}

export const { auth, signIn, signOut, handlers } = NextAuth(authOptions)

