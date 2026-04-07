import {
  AfterViewInit,
  Component,
  ElementRef,
  inject,
  NgZone,
  OnDestroy,
  signal,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { gsap } from 'gsap';

@Component({
  selector: 'app-envelope',
  standalone: true,
  templateUrl: './envelope.html',
  styleUrl: './envelope.scss',
})
export class EnvelopePage implements AfterViewInit, OnDestroy {
  private router = inject(Router);
  private zone = inject(NgZone);

  @ViewChild('flap') flapRef!: ElementRef<HTMLElement>;
  @ViewChild('letter') letterRef!: ElementRef<HTMLElement>;

  readonly isTouchDevice = signal(false);
  readonly isFullyOpen = signal(false);

  private flapAngle = 0;
  private isDragging = false;
  private startY = 0;
  private startAngle = 0;
  private isAnimating = false;

  private readonly onMoveBound = (e: PointerEvent) => this.onPointerMove(e);
  private readonly onUpBound = (e: PointerEvent) => this.onPointerUp(e);

  ngAfterViewInit() {
    this.isTouchDevice.set(
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
    );

    gsap.set('.envelope-scene', { opacity: 0, y: 45, scale: 0.88 });
    gsap.to('.envelope-scene', {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1,
      ease: 'power3.out',
      delay: 0.35,
    });
    gsap.set('.hint-area', { opacity: 0 });
    gsap.to('.hint-area', { opacity: 1, duration: 0.6, delay: 1.4 });

    window.addEventListener('pointermove', this.onMoveBound, { passive: false });
    window.addEventListener('pointerup', this.onUpBound);
  }

  ngOnDestroy() {
    window.removeEventListener('pointermove', this.onMoveBound);
    window.removeEventListener('pointerup', this.onUpBound);
  }

  onEnvelopePointerDown(e: PointerEvent) {
    if (this.isAnimating || this.isFullyOpen()) return;
    e.preventDefault();
    this.isDragging = true;
    this.startY = e.clientY;
    this.startAngle = this.flapAngle;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isDragging) return;
    e.preventDefault();

    const deltaY = this.startY - e.clientY;
    const sensitivity = 150;
    const newAngle = Math.max(
      0,
      Math.min(180, this.startAngle + (deltaY / sensitivity) * 180)
    );

    this.flapAngle = newAngle;
    gsap.set(this.flapRef.nativeElement, { rotateX: -newAngle });

    if (newAngle >= 175) {
      this.isDragging = false;
      this.zone.run(() => this.completeOpen(false));
    }
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.isDragging) return;
    const movedY = Math.abs(this.startY - e.clientY);
    this.isDragging = false;

    // Desktop click (minimal movement)
    if (movedY < 8 && e.pointerType === 'mouse') {
      this.completeOpen(true);
      return;
    }

    if (this.flapAngle >= 90) {
      this.completeOpen(true);
    } else {
      this.closeFlap();
    }
  }

  private completeOpen(animated: boolean) {
    if (this.isAnimating || this.isFullyOpen()) return;
    this.isAnimating = true;

    gsap.to(this.flapRef.nativeElement, {
      rotateX: -180,
      duration: animated ? 0.6 : 0.22,
      ease: animated ? 'power2.inOut' : 'power1.out',
      onComplete: () => {
        this.flapAngle = 180;
        this.isAnimating = false;
        this.zone.run(() => this.revealLetter());
      },
    });
  }

  private closeFlap() {
    this.isAnimating = true;
    gsap.to(this.flapRef.nativeElement, {
      rotateX: 0,
      duration: 0.45,
      ease: 'power2.out',
      onComplete: () => {
        this.flapAngle = 0;
        this.isAnimating = false;
      },
    });
  }

  private revealLetter() {
    this.isFullyOpen.set(true);
    gsap.to('.hint-area', { opacity: 0, duration: 0.2 });

    const letter = this.letterRef.nativeElement;
    letter.style.display = 'flex';

    const isMobile = window.innerWidth < 640;
    const targetY = isMobile ? -128 : -158;

    gsap.set(letter, { xPercent: -50, y: 0, opacity: 0 });
    gsap.to(letter, {
      xPercent: -50,
      y: targetY,
      opacity: 1,
      duration: 0.9,
      delay: 0.12,
      ease: 'power2.out',
      onComplete: () => {
        setTimeout(() => {
          this.zone.run(() => {
            gsap.to('.page-bg', {
              opacity: 0,
              scale: 0.96,
              duration: 0.65,
              ease: 'power2.in',
              onComplete: () => this.router.navigate(['/rsvp']),
            });
          });
        }, 2500);
      },
    });
  }
}
