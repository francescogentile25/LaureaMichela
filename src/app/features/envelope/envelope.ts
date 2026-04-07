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

  @ViewChild('flap')   flapRef!:   ElementRef<HTMLElement>;
  @ViewChild('letter') letterRef!: ElementRef<HTMLElement>;

  readonly isTouchDevice = signal(false);
  readonly isFullyOpen   = signal(false);

  private flapAngle  = 0;   // current rotateX of the flap (0=closed, 180=open)
  private isDragging = false;
  private startY     = 0;
  private startAngle = 0;
  private isAnimating = false;

  private readonly onMoveBound = (e: PointerEvent) => this.onPointerMove(e);
  private readonly onUpBound   = (e: PointerEvent) => this.onPointerUp(e);

  ngAfterViewInit() {
    this.isTouchDevice.set(
      window.matchMedia('(hover: none) and (pointer: coarse)').matches
    );

    // Entrance animation
    gsap.set('.env-wrapper', { opacity: 0, y: 50, scale: 0.88 });
    gsap.to('.env-wrapper', {
      opacity: 1, y: 0, scale: 1,
      duration: 1, ease: 'power3.out', delay: 0.3,
    });
    gsap.set('.hint-area', { opacity: 0 });
    gsap.to('.hint-area', { opacity: 1, duration: 0.6, delay: 1.4 });

    window.addEventListener('pointermove', this.onMoveBound, { passive: false });
    window.addEventListener('pointerup',   this.onUpBound);
  }

  ngOnDestroy() {
    window.removeEventListener('pointermove', this.onMoveBound);
    window.removeEventListener('pointerup',   this.onUpBound);
  }

  onEnvelopePointerDown(e: PointerEvent) {
    if (this.isAnimating || this.isFullyOpen()) return;
    e.preventDefault();
    this.isDragging = true;
    this.startY     = e.clientY;
    this.startAngle = this.flapAngle;
  }

  private onPointerMove(e: PointerEvent) {
    if (!this.isDragging) return;
    e.preventDefault();

    const deltaY = this.startY - e.clientY;          // positive = swipe up
    const newAngle = Math.max(
      0,
      Math.min(180, this.startAngle + (deltaY / 140) * 180)
    );

    this.flapAngle = newAngle;
    // Flap starts at rotateX(180deg) = closed. Opening → rotateX(0deg).
    // So visual angle = 180 - flapAngle
    gsap.set(this.flapRef.nativeElement, {
      rotateX: 180 - newAngle,
    });

    if (newAngle >= 175) {
      this.isDragging = false;
      this.zone.run(() => this.completeOpen(false));
    }
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.isDragging) return;
    const movedY = Math.abs(this.startY - e.clientY);
    this.isDragging = false;

    // Desktop click
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
      rotateX: 0,
      duration: animated ? 0.5 : 0.2,
      ease: 'power1.inOut',
      onComplete: () => {
        this.flapAngle  = 180;
        this.isAnimating = false;
        // Drop flap behind card (like CodePen zIndex: -1)
        gsap.set(this.flapRef.nativeElement, { zIndex: -1 });
        this.zone.run(() => this.revealCard());
      },
    });
  }

  private closeFlap() {
    this.isAnimating = true;
    gsap.to(this.flapRef.nativeElement, {
      rotateX: 180,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => {
        this.flapAngle   = 0;
        this.isAnimating = false;
      },
    });
  }

  private revealCard() {
    this.isFullyOpen.set(true);
    gsap.to('.hint-area', { opacity: 0, duration: 0.2 });

    const card = this.letterRef.nativeElement;
    card.style.display = 'flex';

    const isMobile = window.innerWidth < 640;
    // Step 1: card rises slightly above the envelope (like CodePen bottom: 243px, scale: 0.95)
    const step1Bottom = isMobile ? '210px' : '290px';
    // Step 2: card comes forward large (like CodePen bottom: 25px, scale: 1.4)
    const step2Bottom = isMobile ? '30px' : '40px';

    const tl = gsap.timeline({
      onComplete: () => {
        setTimeout(() => {
          this.zone.run(() => {
            gsap.to('.page-bg', {
              opacity: 0,
              scale: 0.96,
              duration: 0.55,
              ease: 'power2.in',
              onComplete: () => { this.router.navigate(['/rsvp']); },
            });
          });
        }, 1200);
      },
    });

    // Step 1 — card peeks out (at 0.5s offset like CodePen)
    tl.to(card, {
      bottom: step1Bottom,
      scale: 0.95,
      boxShadow: '0 2px 5px 0 rgba(120,116,168,0.42)',
      duration: 0.5,
      ease: 'power1.inOut',
      delay: 0.5,
    });

    // Bring card z-index above SVG panels
    tl.set(card, { zIndex: 10 });

    // Step 2 — card comes out large
    tl.to(card, {
      bottom: step2Bottom,
      scale: isMobile ? 1.2 : 1.35,
      duration: 0.5,
      ease: 'power1.inOut',
    });
  }
}
