import { inject, Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';
import { SupabaseService } from '../../../core/services/supabase.service';
import { UserResponse } from '../models/responses/user.response';
import { LoginRequest } from '../models/requests/login.request';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private supabase = inject(SupabaseService);

  me(): Observable<UserResponse> {
    return from(this.supabase.client.auth.getSession()).pipe(
      map(({ data, error }) => {
        if (error || !data.session?.user) throw new Error('Sessione non trovata');
        const user = data.session.user;
        return { id: user.id, email: user.email! };
      })
    );
  }

  login(request: LoginRequest): Observable<UserResponse> {
    return from(
      this.supabase.client.auth.signInWithPassword({
        email: request.email,
        password: request.password,
      })
    ).pipe(
      map(({ data, error }) => {
        if (error || !data.user) throw new Error(error?.message ?? 'Credenziali non valide');
        return { id: data.user.id, email: data.user.email! };
      })
    );
  }

  logout(): Observable<void> {
    return from(this.supabase.client.auth.signOut()).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      })
    );
  }
}
