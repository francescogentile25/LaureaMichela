import { Component, output } from '@angular/core';

@Component({
  selector: 'app-invitation-card',
  standalone: true,
  templateUrl: './invitation-card.component.html',
  styleUrl: './invitation-card.component.scss',
})
export class InvitationCardComponent {
  conferma = output<void>();
}
