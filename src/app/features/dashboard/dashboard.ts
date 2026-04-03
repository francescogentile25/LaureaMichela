import { Component, inject, OnDestroy, OnInit, signal } from '@angular/core';
import { Notification, Rsvp, RsvpService } from '../../core/services/rsvp.service';
import { AuthStore } from '../auth/store/auth.store';
import { DatePipe } from '@angular/common';
import { BadgeModule } from 'primeng/badge';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';

@Component({
  selector: 'app-dashboard',
  imports: [DatePipe, BadgeModule, ButtonModule, TagModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard implements OnInit, OnDestroy {
  private rsvpService = inject(RsvpService);
  authStore = inject(AuthStore);

  rsvps = signal<Rsvp[]>([]);
  notifications = signal<Notification[]>([]);
  loading = signal(true);

  private unsubRsvp?: () => void;
  private unsubNotifications?: () => void;

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

  logout() {
    this.authStore.logout$();
  }
}
