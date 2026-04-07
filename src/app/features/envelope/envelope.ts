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
  private router  = inject(Router);
  private zone    = inject(NgZone);

  @ViewChild('envelopeEl') envelopeRef!: ElementRef<HTMLElement>;
  @ViewChild('flapOuter')  flapRef!:     ElementRef<HTMLElement>;
  @ViewChild('letter')     letterRef!:   ElementRef<HTMLElement>;
  @ViewChild('bow')        bowRef!:       ElementRef<SVGElement>;

  readonly isTouchDevice = signal(false);
  readonly isFullyOpen   = signal(false);

  // Gesture state — flapAngle: 0 = closed, 180 = fully open
  private flapAngle   = 0;
  private isDragging  = false;
  private startY      = 0;
  private startAngle  = 0;
  private isAnimating = false;

  private readonly onMoveBound = (e: PointerEvent) => this.onPointerMove(e);
  private readonly onUpBound   = (e: PointerEvent) => this.onPointerUp(e);

  ngAfterViewInit(): void {
    this.isTouchDevice.set(
      window.matchMedia('(hover: none) and (pointer: coarse)').matches,
    );

    // Set initial flap state: rotateX(0) = closed (diamond covers top)
    gsap.set(this.flapRef.nativeElement, { rotateX: 0, perspective: 1200 });

    // Entrance animation
    gsap.from('.envelope', { opacity: 0, y: 60, scale: 0.88, duration: 1, ease: 'power3.out', delay: 0.3 });
    gsap.set('.hint-area', { opacity: 0 });
    gsap.to('.hint-area', { opacity: 1, duration: 0.6, delay: 1.4 });

    window.addEventListener('pointermove', this.onMoveBound, { passive: false });
    window.addEventListener('pointerup',   this.onUpBound);
  }

  ngOnDestroy(): void {
    window.removeEventListener('pointermove', this.onMoveBound);
    window.removeEventListener('pointerup',   this.onUpBound);
  }

  onEnvelopePointerDown(e: PointerEvent): void {
    if (this.isAnimating || this.isFullyOpen()) return;
    e.preventDefault();
    this.isDragging = true;
    this.startY     = e.clientY;
    this.startAngle = this.flapAngle;
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;
    e.preventDefault();

    // Swipe up = positive deltaY → open flap
    const deltaY   = this.startY - e.clientY;
    const newAngle = Math.max(0, Math.min(180, this.startAngle + (deltaY / 130) * 180));

    this.flapAngle = newAngle;
    gsap.set(this.flapRef.nativeElement, { rotateX: newAngle });

    if (newAngle >= 175) {
      this.isDragging = false;
      this.zone.run(() => { this.completeOpen(false); });
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isDragging) return;
    const movedY    = Math.abs(this.startY - e.clientY);
    this.isDragging = false;

    // Desktop click (barely any movement)
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

  private completeOpen(animated: boolean): void {
    if (this.isAnimating || this.isFullyOpen()) return;
    this.isAnimating = true;

    gsap.to(this.flapRef.nativeElement, {
      rotateX: 180,
      duration: animated ? 0.55 : 0.2,
      ease: 'power1.inOut',
      onComplete: () => {
        this.flapAngle   = 180;
        this.isAnimating = false;
        gsap.set(this.flapRef.nativeElement, { zIndex: -1 });
        this.zone.run(() => { this.afterFlapOpen(); });
      },
    });
  }

  private closeFlap(): void {
    this.isAnimating = true;
    gsap.to(this.flapRef.nativeElement, {
      rotateX: 0,
      duration: 0.4,
      ease: 'power2.out',
      onComplete: () => {
        this.flapAngle   = 0;
        this.isAnimating = false;
      },
    });
  }

  private afterFlapOpen(): void {
    this.isFullyOpen.set(true);
    gsap.to('.hint-area', { opacity: 0, duration: 0.2 });

    const env = this.envelopeRef.nativeElement;
    const bow = this.bowRef.nativeElement;

    // Tilt envelope (like original CodePen)
    gsap.to(env, {
      rotateZ: 7,
      rotateY: -9,
      y: window.innerWidth < 640 ? 80 : 130,
      duration: 0.6,
      ease: 'power2.inOut',
    });

    // Split bow halves apart
    const bowLeft  = bow.querySelector('#bow-left');
    const bowRight = bow.querySelector('#bow-right');
    if (bowLeft && bowRight) {
      gsap.to(bowLeft,  { x: -50, opacity: 0, duration: 0.5, ease: 'power2.in' });
      gsap.to(bowRight, { x:  50, opacity: 0, duration: 0.5, ease: 'power2.in' });
      // Knot fades too
      gsap.to(bow.querySelector('circle'), { opacity: 0, duration: 0.3, delay: 0.2 });
    }

    // Reveal the card after short delay
    setTimeout(() => {
      this.zone.run(() => { this.revealCard(); });
    }, 350);
  }

  private revealCard(): void {
    const card     = this.letterRef.nativeElement;
    card.style.display = 'flex';

    const isMobile  = window.innerWidth < 640;
    const step1Y    = isMobile ? '-210px' : '-290px';
    const step2Y    = isMobile ? '-30px'  : '-40px';
    const step2Scale = isMobile ? 1.2 : 1.35;

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

    // Step 1 — card peeks out above envelope
    tl.to(card, {
      yPercent: 0,
      y: step1Y,
      scale: 0.95,
      zIndex: 10,
      boxShadow: '0 2px 5px 0 rgba(120,116,168,0.42)',
      duration: 0.5,
      ease: 'power1.inOut',
      delay: 0.4,
    });

    // Step 2 — card comes forward large
    tl.to(card, {
      y: step2Y,
      scale: step2Scale,
      duration: 0.5,
      ease: 'power1.inOut',
    });
  }
}
