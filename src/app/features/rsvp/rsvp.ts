import { AfterViewInit, Component, inject, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RsvpService } from '../../core/services/rsvp.service';
import { InvitationCardComponent } from './invitation-card/invitation-card.component';
import { gsap } from 'gsap';

@Component({
  selector: 'app-rsvp',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, InvitationCardComponent],
  templateUrl: './rsvp.html',
  styleUrl: './rsvp.scss',
})
export class Rsvp implements AfterViewInit {
  private rsvpService = inject(RsvpService);
  private fb = inject(NonNullableFormBuilder);

  showForm = signal(false);
  loading = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    nome: this.fb.control('', [Validators.required, Validators.minLength(2)]),
    num_partecipanti: this.fb.control(1, [Validators.required, Validators.min(1), Validators.max(20)]),
    messaggio: this.fb.control(''),
  });

  ngAfterViewInit() {
    // Animazione entrata card
    gsap.fromTo(
      'app-invitation-card',
      { opacity: 0, scale: 0.92, y: 30 },
      { opacity: 1, scale: 1, y: 0, duration: 0.9, ease: 'power3.out' }
    );

    // Cerchi fluttuanti
    gsap.to('.blob--tl', { y: -12, x: 6, duration: 4.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('.blob--tr', { y: 10, x: -8, duration: 5.5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.8 });
    gsap.to('.blob--bl', { y: -10, duration: 4, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 1.2 });
    gsap.to('.blob--br', { y: 14, x: 6, duration: 5, repeat: -1, yoyo: true, ease: 'sine.inOut', delay: 0.4 });

    // Fiore pulsa dolcemente
    gsap.to('.flower', { scale: 1.08, duration: 2.2, repeat: -1, yoyo: true, ease: 'sine.inOut', transformOrigin: 'center bottom' });
  }

  openForm() {
    this.showForm.set(true);
    setTimeout(() => {
      gsap.fromTo('.form-panel', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power3.out' });
    }, 0);
  }

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    const { nome, num_partecipanti, messaggio } = this.form.getRawValue();
    this.rsvpService.submitRsvp(nome, num_partecipanti, messaggio || undefined).subscribe({
      next: () => {
        this.loading.set(false);
        this.submitted.set(true);
        setTimeout(() => {
          gsap.fromTo('.success-msg', { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(1.4)' });
        }, 0);
      },
      error: (err: Error) => {
        this.error.set(err.message);
        this.loading.set(false);
      },
    });
  }

  incrementa() {
    const v = this.form.controls.num_partecipanti.value;
    if (v < 20) this.form.controls.num_partecipanti.setValue(v + 1);
  }
  decrementa() {
    const v = this.form.controls.num_partecipanti.value;
    if (v > 1) this.form.controls.num_partecipanti.setValue(v - 1);
  }
}
