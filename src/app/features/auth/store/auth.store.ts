import { UserResponse } from '../models/responses/user.response';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap } from 'rxjs';
import { tapResponse } from '@ngrx/operators';
import { LoginRequest } from '../models/requests/login.request';
import { MessageService } from 'primeng/api';
import { SpinLoaderService } from '../../../core/services/spin-loader.service';
import { loginSuccessPage, logoutSuccessPage } from './config/auth.config';

type AuthState = {
  user: UserResponse | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | undefined;
};

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: undefined,
};

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),

  withComputed(({ user }) => ({
    userName: computed(() => user()?.email ?? 'Guest'),
    email: computed(() => user()?.email ?? null),
    isAdmin: computed(() => false),
  })),

  withMethods(
    (
      store,
      authService = inject(AuthService),
      router = inject(Router),
      messageService = inject(MessageService),
      loaderService = inject(SpinLoaderService)
    ) => ({
      setError(error: string | undefined) {
        patchState(store, { error, loading: false });
      },

      clearError() {
        patchState(store, { error: undefined });
      },

      setUser(user: UserResponse) {
        patchState(store, { user, isAuthenticated: true, loading: false, error: undefined });
      },

      clearUser() {
        patchState(store, initialState);
      },

      me$: rxMethod<void>(
        pipe(
          tap(() => {
            patchState(store, { loading: true, error: undefined });
            loaderService.startSpinLoader();
          }),
          switchMap(() =>
            authService.me().pipe(
              tapResponse({
                next: (user) => {
                  patchState(store, { user, isAuthenticated: true, loading: false, error: undefined });
                  loaderService.stopSpinLoader();
                },
                error: () => {
                  patchState(store, { user: null, isAuthenticated: false, loading: false });
                  loaderService.stopSpinLoader();
                },
              })
            )
          )
        )
      ),

      login$: rxMethod<LoginRequest>(
        pipe(
          tap(() => {
            patchState(store, { loading: true, error: undefined });
            loaderService.startSpinLoader();
          }),
          switchMap((credentials) =>
            authService.login(credentials).pipe(
              tapResponse({
                next: (user) => {
                  patchState(store, { user, isAuthenticated: true, loading: false, error: undefined });
                  router.navigateByUrl(loginSuccessPage);
                  loaderService.stopSpinLoader();
                },
                error: (error: Error) => {
                  messageService.add({
                    severity: 'error',
                    summary: 'Errore di accesso',
                    detail: error.message,
                  });
                  patchState(store, { loading: false, isAuthenticated: false, error: error.message });
                  loaderService.stopSpinLoader();
                },
              })
            )
          )
        )
      ),

      logout$: rxMethod<void>(
        pipe(
          tap(() => patchState(store, { loading: true })),
          switchMap(() =>
            authService.logout().pipe(
              tapResponse({
                next: () => {
                  patchState(store, initialState);
                  router.navigateByUrl(logoutSuccessPage);
                },
                error: (error: Error) => {
                  messageService.add({
                    severity: 'error',
                    summary: 'Errore logout',
                    detail: error.message,
                  });
                },
              })
            )
          )
        )
      ),
    })
  ),
  withHooks({
    onInit(store) {
      store.me$();
    },
  })
);
