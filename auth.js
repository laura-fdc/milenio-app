import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import Credentials from 'next-auth/providers/credentials';

const providers = [Google];

// Solo en local: login de prueba sin Google (AUTH_DEV_LOGIN=1 en .env.local).
if (process.env.AUTH_DEV_LOGIN === '1' && process.env.NODE_ENV !== 'production') {
  providers.push(
    Credentials({
      id: 'dev',
      name: 'Dev',
      credentials: { email: { label: 'Email' } },
      authorize: async (c) => (c?.email ? { id: String(c.email), email: String(c.email).toLowerCase(), name: String(c.email).split('@')[0] } : null),
    })
  );
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 30 },
  pages: { signIn: '/login' },
  trustHost: true,
});
