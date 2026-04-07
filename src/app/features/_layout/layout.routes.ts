import { Routes } from "@angular/router";
import { loginGuard } from "../../core/guards/login.guard";
import { authGuard } from "../../core/guards/auth.guard";

export const layoutRoutes: Routes = [
  {
    path: 'invito',
    loadComponent: () => import('./../envelope/envelope').then(c => c.EnvelopePage)
  },
  {
    path: 'rsvp',
    loadComponent: () => import('./../rsvp/rsvp').then(c => c.Rsvp)
  },
  {
    path: 'login',
    canActivate: [loginGuard],
    loadComponent: () => import('./../auth/login/login').then(c => c.Login)
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./../dashboard/dashboard').then(c => c.Dashboard)
  },
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'invito'
  },
  {
    path: '**',
    redirectTo: 'invito'
  },
];
