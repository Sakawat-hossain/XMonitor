export interface User {
  id: string;
  username: string;
  role: 'admin';
  must_change_password: boolean;
  created_at: string;
  last_login_at: string;
}

export interface LoginResponse {
  success: boolean;
  data: {
    token: string;
    user: User;
  };
}
