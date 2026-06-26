import type { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? ""
    })
  ],
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt"
  },
  callbacks: {
    async signIn({ user }) {
      const email = user.email?.trim().toLowerCase();

      if (!email) return true;

      const investor = await prisma.investor.findFirst({
        where: {
          email: {
            equals: email,
            mode: "insensitive"
          }
        },
        select: { status: true }
      });

      if (investor?.status === "BLOCKED") {
        return "/login?error=suspended";
      }

      return true;
    }
  },
  secret: process.env.NEXTAUTH_SECRET
};
