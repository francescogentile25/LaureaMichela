import { Component, computed, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Notification, Rsvp, RsvpService } from '../../core/services/rsvp.service';
import { AuthStore } from '../auth/store/auth.store';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { avatarColor } from '../../core/utils/avatar-color.util';
import confetti from 'canvas-confetti';

export type SortOption = 'date' | 'nome' | 'partecipanti';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, FormsModule, BadgeModule, ButtonModule, TagModule, ToastModule],
  providers: [MessageService],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private rsvpService = inject(RsvpService);
  private messageService = inject(MessageService);
  authStore = inject(AuthStore);

  rsvps = signal<Rsvp[]>([]);
  notifications = signal<Notification[]>([]);
  loading = signal(true);

  // Tracking visite invito
  inviteViews = signal(0);

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

  /** Colore avatar unico dal nome */
  getAvatarColor = avatarColor;

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

  /** Quante persone hanno aperto l'invito ma non hanno confermato */
  pendingViews = computed(() => Math.max(0, this.inviteViews() - this.activeRsvps().length));

  get totalPersone(): number {
    return this.activeRsvps().reduce((sum, r) => sum + r.num_partecipanti, 0);
  }

  get unreadCount(): number {
    return this.notifications().filter((n) => !n.read).length;
  }

  ngOnInit() {
    this.loadData();
    this.loadInviteViews();

    this.unsubRsvp = this.rsvpService.listenToRsvp(() => this.onNewRsvp());
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

  loadInviteViews() {
    this.rsvpService.getInviteViewsCount().subscribe({
      next: (count) => this.inviteViews.set(count),
    });
  }

  /** Quando arriva un nuovo RSVP in real-time: ricarica + confetti + toast */
  private onNewRsvp() {
    const prevCount = this.activeRsvps().length;

    this.rsvpService.getAllRsvp().subscribe({
      next: (data) => {
        this.rsvps.set(data);
        this.loading.set(false);

        // Se ci sono più RSVP attivi di prima → è una nuova conferma
        const newActive = data.filter(r => !r.deleted);
        if (newActive.length > prevCount) {
          const newest = newActive[0]; // ordinati desc per data
          this.fireConfetti();
          this.messageService.add({
            severity: 'success',
            summary: 'Nuova conferma!',
            detail: `${newest.nome} ha confermato con ${newest.num_partecipanti} persona/e`,
            life: 5000,
          });
        }
      },
    });
    this.loadNotifications();
  }

  /** Lancia coriandoli dalla pagina */
  private fireConfetti() {
    const defaults = { startVelocity: 30, spread: 360, ticks: 80, zIndex: 9999 };

    confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.5 } });
    confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.5 } });

    setTimeout(() => {
      confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.3 } });
    }, 250);
  }

  markAllRead() {
    this.rsvpService.markAllNotificationsRead().subscribe({
      next: () => {
        this.loadNotifications();
        this.messageService.add({
          severity: 'info',
          summary: 'Notifiche',
          detail: 'Tutte le notifiche segnate come lette',
          life: 3000,
        });
      },
    });
  }

  /** Primo click: mostra conferma. Secondo click: soft delete. */
  onDelete(id: string) {
    if (this.confirmDeleteId() === id) {
      const rsvp = this.rsvps().find(r => r.id === id);
      this.deleting.set(true);
      this.rsvpService.softDeleteRsvp(id).subscribe({
        next: () => {
          this.rsvps.update(list =>
            list.map(r => r.id === id ? { ...r, deleted: true } : r)
          );
          this.confirmDeleteId.set(null);
          this.deleting.set(false);
          this.messageService.add({
            severity: 'warn',
            summary: 'Spostato nel cestino',
            detail: rsvp ? `${rsvp.nome} rimosso dalla lista` : 'RSVP eliminato',
            life: 3000,
          });
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
    const rsvp = this.rsvps().find(r => r.id === id);
    this.rsvpService.restoreRsvp(id).subscribe({
      next: () => {
        this.rsvps.update(list =>
          list.map(r => r.id === id ? { ...r, deleted: false } : r)
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Ripristinato',
          detail: rsvp ? `${rsvp.nome} di nuovo nella lista` : 'RSVP ripristinato',
          life: 3000,
        });
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
