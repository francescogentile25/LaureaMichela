import { inject, Injectable } from '@angular/core';
import { forkJoin, from, map, Observable } from 'rxjs';
import { SupabaseService } from './supabase.service';

export type Rsvp = {
  id: string;
  nome: string;
  num_partecipanti: number;
  messaggio: string | null;
  created_at: string;
};

export type Notification = {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
};

@Injectable({ providedIn: 'root' })
export class RsvpService {
  private supabase = inject(SupabaseService);

  submitRsvp(nome: string, num_partecipanti: number, messaggio?: string): Observable<void> {
    return from(
      this.supabase.client.from('rsvp').insert({ nome, num_partecipanti, messaggio: messaggio ?? null })
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      })
    );
  }

  getAllRsvp(): Observable<Rsvp[]> {
    return from(
      this.supabase.client.from('rsvp').select('*').order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return data as Rsvp[];
      })
    );
  }

  getNotifications(): Observable<Notification[]> {
    return from(
      this.supabase.client
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
    ).pipe(
      map(({ data, error }) => {
        if (error) throw new Error(error.message);
        return data as Notification[];
      })
    );
  }

  /** Elimina l'RSVP e le notifiche il cui messaggio contiene il nome */
  deleteRsvp(id: string, nome: string): Observable<void> {
    const deleteRsvp$ = from(
      this.supabase.client.from('rsvp').delete().eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      })
    );

    const deleteNotifications$ = from(
      this.supabase.client.from('notifications').delete().ilike('message', `%${nome}%`)
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      })
    );

    return forkJoin([deleteRsvp$, deleteNotifications$]).pipe(
      map(() => void 0)
    );
  }

  markAllNotificationsRead(): Observable<void> {
    return from(
      this.supabase.client.from('notifications').update({ read: true }).eq('read', false)
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      })
    );
  }

  listenToRsvp(callback: () => void): () => void {
    const channel = this.supabase.client
      .channel('rsvp-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'rsvp' }, callback)
      .subscribe();

    return () => this.supabase.client.removeChannel(channel);
  }

  listenToNotifications(callback: () => void): () => void {
    const channel = this.supabase.client
      .channel('notification-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, callback)
      .subscribe();

    return () => this.supabase.client.removeChannel(channel);
  }
}
