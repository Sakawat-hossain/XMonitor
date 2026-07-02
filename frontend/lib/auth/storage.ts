import Cookies from 'js-cookie';

const TOKEN_COOKIE = 'xmonitor_token';

// Token lives in a cookie (not localStorage) so the Next.js middleware
// can read it server-side and redirect unauthenticated /admin requests.
export const tokenStorage = {
  get: (): string | undefined => Cookies.get(TOKEN_COOKIE),

  set: (token: string): void => {
    Cookies.set(TOKEN_COOKIE, token, {
      expires: 1, // days — matches the backend's 24h JWT expiry
      sameSite: 'strict',
      secure: window.location.protocol === 'https:',
    });
  },

  clear: (): void => {
    Cookies.remove(TOKEN_COOKIE);
  },
};

export { TOKEN_COOKIE };
