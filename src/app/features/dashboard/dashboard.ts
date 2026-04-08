import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Notification, Rsvp, RsvpService } from '../../core/services/rsvp.service';
import { AuthStore } from '../auth/store/auth.store';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

export type SortOption = 'date' | 'nome' | 'partecipanti';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, FormsModule, BadgeModule, ButtonModule, TagModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private rsvpService = inject(RsvpService);
  authStore = inject(AuthStore);

  rsvps = signal<Rsvp[]>([]);
  notifications = signal<Notification[]>([]);
  loading = signal(true);

  // Filtri e ricerca
  searchQuery = signal('');
  onlyWithMessage = signal(false);
  sortBy = signal<SortOption>('date');

  private unsubRsvp?: () => void;
  private unsubNotifications?: () => void;

  /** RSVP filtrati e ordinati */
  filteredRsvps = computed(() => {
    let list = this.rsvps();
    const query = this.searchQuery().trim().toLowerCase();

    // Ricerca per nome
    if (query) {
      list = list.filter(r => r.nome.toLowerCase().includes(query));
    }

    // Solo con messaggio
    if (this.onlyWithMessage()) {
      list = list.filter(r => !!r.messaggio);
    }

    // Ordinamento
    switch (this.sortBy()) {
      case 'nome':
        list = [...list].sort((a, b) => a.nome.localeCompare(b.nome));
        break;
      case 'partecipanti':
        list = [...list].sort((a, b) => b.num_partecipanti - a.num_partecipanti);
        break;
      case 'date':
      default:
        // già ordinati per data dal backend
        break;
    }

    return list;
  });

  /** Messaggi per la bacheca (solo RSVP con messaggio) */
  guestMessages = computed(() =>
    this.rsvps().filter(r => !!r.messaggio)
  );

  get totalPersone(): number {
    return this.rsvps().reduce((sum, r) => sum + r.num_partecipanti, 0);
  }

  get unreadCount(): number {
    return this.notifications().filter((n) => !n.read).length;
  }

  ngOnInit() {
    this.loadData();

    this.unsubRsvp = this.rsvpService.listenToRsvp(() => this.loadData());
    this.unsubNotifications = this.rsvpService.listenToNotifications(() =>
      this.loadNotifications()
    );
  }

  ngOnDestroy() {
    this.unsubRsvp?.();
    this.unsubNotifications?.();
  }

  loadData() {
    this.loading.set(true);
    this.rsvpService.getAllRsvp().subscribe({
      next: (data) => {
        this.rsvps.set(data);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
    this.loadNotifications();
  }

  loadNotifications() {
    this.rsvpService.getNotifications().subscribe({
      next: (data) => this.notifications.set(data),
    });
  }

  markAllRead() {
    this.rsvpService.markAllNotificationsRead().subscribe({
      next: () => this.loadNotifications(),
    });
  }

  shareOnWhatsApp() {
    const url = `${window.location.origin}/invito`;
    const text = `🎓 Sei invitato/a alla festa di laurea di Michela!\n\nApri l'invito qui 👇\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  }

  logout() {
    this.authStore.logout$();
  }
}
