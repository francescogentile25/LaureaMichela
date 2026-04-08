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

  // Pannelli collassabili (false = chiuso, true = aperto)
  showNotifications = signal(false);
  showRsvpList = signal(true);
  showTrash = signal(false);
  showGuestbook = signal(true);

  // Soft delete
  confirmDeleteId = signal<string | null>(null);
  deleting = signal(false);

  private unsubRsvp?: () => void;
  private unsubNotifications?: () => void;

  /** RSVP attivi (non eliminati) */
  activeRsvps = computed(() => this.rsvps().filter(r => !r.deleted));

  /** RSVP nel cestino */
  deletedRsvps = computed(() => this.rsvps().filter(r => r.deleted));

  /** RSVP attivi filtrati e ordinati */
  filteredRsvps = computed(() => {
    let list = this.activeRsvps();
    const query = this.searchQuery().trim().toLowerCase();

    if (query) {
      list = list.filter(r => r.nome.toLowerCase().includes(query));
    }

    if (this.onlyWithMessage()) {
      list = list.filter(r => !!r.messaggio);
    }

    switch (this.sortBy()) {
      case 'nome':
        list = [...list].sort((a, b) => a.nome.localeCompare(b.nome));
        break;
      case 'partecipanti':
        list = [...list].sort((a, b) => b.num_partecipanti - a.num_partecipanti);
        break;
      case 'date':
      default:
        break;
    }

    return list;
  });

  /** Messaggi per la bacheca (solo RSVP attivi con messaggio) */
  guestMessages = computed(() =>
    this.activeRsvps().filter(r => !!r.messaggio)
  );

  get totalPersone(): number {
    return this.activeRsvps().reduce((sum, r) => sum + r.num_partecipanti, 0);
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

  /** Primo click: mostra conferma. Secondo click: soft delete. */
  onDelete(id: string) {
    if (this.confirmDeleteId() === id) {
      this.deleting.set(true);
      this.rsvpService.softDeleteRsvp(id).subscribe({
        next: () => {
          this.rsvps.update(list =>
            list.map(r => r.id === id ? { ...r, deleted: true } : r)
          );
          this.confirmDeleteId.set(null);
          this.deleting.set(false);
        },
        error: () => {
          this.confirmDeleteId.set(null);
          this.deleting.set(false);
        },
      });
    } else {
      this.confirmDeleteId.set(id);
    }
  }

  cancelDelete() {
    this.confirmDeleteId.set(null);
  }

  /** Ripristina un RSVP dal cestino */
  onRestore(id: string) {
    this.rsvpService.restoreRsvp(id).subscribe({
      next: () => {
        this.rsvps.update(list =>
          list.map(r => r.id === id ? { ...r, deleted: false } : r)
        );
      },
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
