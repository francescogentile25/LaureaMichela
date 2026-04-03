import { Component, inject } from '@angular/core';
import { AuthStore } from '../store/auth.store';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { SimpleFormModel } from '../../../core/utils/simple-form-model.util';
import { LoginRequest } from '../models/requests/login.request';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, FormsModule, InputTextModule, PasswordModule, ButtonModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {
  public authStore = inject(AuthStore);
  fb = inject(NonNullableFormBuilder);

  form = this.fb.group<SimpleFormModel<LoginRequest>>({
    email: this.fb.control<string>({ value: '', disabled: false }, [Validators.required, Validators.email]),
    password: this.fb.control<string>({ value: '', disabled: false }, [Validators.required]),
  });

  onSubmit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.authStore.login$(this.form.getRawValue());
  }
}
