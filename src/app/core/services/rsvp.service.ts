import { inject, Injectable } from '@angular/core';
import { from, map, Observable } from 'rxjs';

import { SupabaseService } from './supabase.service';

export type Rsvp = {
  id: string;
  nome: string;
  num_partecipanti: number;
  messaggio: string | null;
  deleted: boolean;
  created_at: string;
};

export type Notification = {
  id: string;
  message: string;
  read: boolean;
  created_at: string;
};

export type InviteView = {
  id: string;
  visitor_id: string;
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

  /** Soft delete: segna l'RSVP come eliminato */
  softDeleteRsvp(id: string): Observable<void> {
    return from(
      this.supabase.client.from('rsvp').update({ deleted: true }).eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      })
    );
  }

  /** Ripristina un RSVP eliminato */
  restoreRsvp(id: string): Observable<void> {
    return from(
      this.supabase.client.from('rsvp').update({ deleted: false }).eq('id', id)
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      })
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

  /** Registra una visita unica alla pagina invito (1 per browser via localStorage) */
  trackInviteView(): Observable<void> {
    const storageKey = 'invite_visitor_id';
    let visitorId = localStorage.getItem(storageKey);
    if (visitorId) return new Observable(sub => sub.complete()); // già tracciato

    visitorId = crypto.randomUUID();
    localStorage.setItem(storageKey, visitorId);

    return from(
      this.supabase.client.from('invite_views').insert({ visitor_id: visitorId })
    ).pipe(
      map(({ error }) => {
        if (error) throw new Error(error.message);
      })
    );
  }

  /** Conta le visite uniche all'invito */
  getInviteViewsCount(): Observable<number> {
    return from(
      this.supabase.client.from('invite_views').select('*', { count: 'exact', head: true })
    ).pipe(
      map(({ count, error }) => {
        if (error) throw new Error(error.message);
        return count ?? 0;
      })
    );
  }

  listenToNotifications(callback: () => void): () => void {
    const channel = this.supabase.client
      .channel('notification-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, callback)
      .subscribe();

    return () => this.supabase.client.removeChannel(channel);
  }
}
