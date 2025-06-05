<template>
  <form @submit.prevent="handleSubmit" class="forgot-password-form" ref="forgotForm">
    <div class="back-button" @click="handleBack" ref="backButton" :class="{ disabled: transitioning }">
      <font-awesome-icon icon="arrow-left" />
    </div>

    <div class="logo-container" ref="logoContainer">
      <font-awesome-icon icon="key" class="logo-icon" />
    </div>
    <h2 class="title-text" ref="titleText">Password Recovery</h2>
    <p class="subtitle" ref="subtitle">Recover your account access</p>

    <div class="form-content" ref="formContent">
      <div class="step-indicator" v-if="!resetCompleted" ref="stepIndicator">
        <div class="step" :class="{ active: currentStep === 1 }">1</div>
        <div class="step-line"></div>
        <div class="step" :class="{ active: currentStep === 2 }">2</div>
      </div>

      <!-- Step 1: Email Entry -->
      <div v-if="currentStep === 1">
        <div class="input-group" ref="emailGroup">
          <div class="input-container">
            <font-awesome-icon icon="envelope" class="input-icon" />
            <input type="email" id="email" v-model="email" :disabled="loading || transitioning" class="input-field"
              autocomplete="email" placeholder=" " required ref="emailInput" />
            <label for="email" class="input-label">Email Address</label>
          </div>
          <p class="input-hint">Enter your registered email address</p>
        </div>

        <button type="button" class="action-button" :disabled="loading || !email || transitioning"
          @click="requestPasswordReset" ref="requestButton">
          <template v-if="loading">
            <font-awesome-icon icon="spinner" spin class="button-icon" />
            Sending...
          </template>
          <template v-else>
            <font-awesome-icon icon="paper-plane" class="button-icon" />
            Send Reset Code
          </template>
        </button>
      </div>

      <!-- Step 2: Reset Password with Token -->
      <div v-if="currentStep === 2">
        <div class="input-group" ref="tokenGroup">
          <div class="input-container">
            <font-awesome-icon icon="fingerprint" class="input-icon" />
            <input type="text" inputmode="numeric" pattern="[0-9]{6}" id="token" v-model="token"
              :disabled="loading || transitioning" class="input-field" placeholder=" " required ref="tokenInput"
              aria-describedby="token-hint" />
            <label for="token" class="input-label">Reset Code</label>
          </div>
          <p id="token-hint" class="input-hint" :class="{ error: tokenError }">
            {{ tokenHintText }}
          </p>
        </div>

        <div class="input-group" ref="passwordGroup">
          <div class="input-container">
            <font-awesome-icon icon="lock" class="input-icon" />
            <input :type="showNewPassword ? 'text' : 'password'" id="newPassword" v-model="newPassword"
              :disabled="loading || transitioning" class="input-field" placeholder=" " required ref="passwordInput" />
            <label for="newPassword" class="input-label">New Password</label>
            <button type="button" class="toggle-password" @click="toggleNewPassword"
              :disabled="loading || transitioning" title="Toggle password visibility">
              <font-awesome-icon :icon="showNewPassword ? 'eye-slash' : 'eye'" class="toggle-icon" />
            </button>
          </div>
          <p class="password-strength" :class="passwordStrengthClass">
            <font-awesome-icon :icon="passwordStrengthIcon" class="button-icon" />
            {{ passwordStrengthText }}
          </p>
        </div>

        <div class="input-group" ref="confirmGroup">
          <div class="input-container">
            <font-awesome-icon icon="check-double" class="input-icon" />
            <input :type="showConfirmPassword ? 'text' : 'password'" id="confirmPassword" v-model="confirmPassword"
              :disabled="loading || transitioning" class="input-field" placeholder=" " required ref="confirmInput" />
            <label for="confirmPassword" class="input-label">Confirm Password</label>
            <button type="button" class="toggle-password" @click="toggleConfirmPassword"
              :disabled="loading || transitioning" title="Toggle password visibility">
              <font-awesome-icon :icon="showConfirmPassword ? 'eye-slash' : 'eye'" class="toggle-icon" />
            </button>
          </div>
          <p class="input-hint" v-if="passwordMismatch" style="color: var(--error-color);">
            <font-awesome-icon icon="exclamation-circle" class="button-icon" />
            Passwords don't match
          </p>
        </div>

        <button type="submit" class="action-button" :disabled="loading || !canResetPassword || transitioning"
          ref="resetButton">
          <template v-if="loading">
            <font-awesome-icon icon="spinner" spin class="button-icon" />
            Resetting...
          </template>
          <template v-else>
            <font-awesome-icon icon="key" class="button-icon" />
            Reset Password
          </template>
        </button>
      </div>

      <!-- Success State -->
      <div v-if="resetCompleted" class="success-container" ref="successContainer">
        <div class="success-icon">
          <font-awesome-icon icon="check-circle" />
        </div>
        <h3 class="success-title">Password Reset Successfully</h3>
        <p class="success-message">You can now log in with your new password</p>
        <button type="button" class="action-button" @click="handleBack" :disabled="transitioning">
          <font-awesome-icon icon="sign-in-alt" class="button-icon" />
          Return to Login
        </button>
      </div>
    </div>

    <div class="decorative-circles">
      <div class="circle circle-1" ref="circle1"></div>
      <div class="circle circle-2" ref="circle2"></div>
      <div class="circle circle-3" ref="circle3"></div>
    </div>
  </form>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { useToast } from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import anime from 'animejs/lib/anime.es.js';
import api from '@/services/api';

export default {
  name: 'ForgotPasswordComponent',
  components: { FontAwesomeIcon },
  props: {
    transitioning: {
      type: Boolean,
      default: false,
    },
  },
  emits: ['back'],
  setup() {
    const toast = useToast();
    return { toast };
  },
  data() {
    return {
      currentStep: 1,
      email: '',
      token: '',
      newPassword: '',
      confirmPassword: '',
      loading: false,
      resetCompleted: false,
      tokenVerified: false,
      tokenError: false,
      showNewPassword: false,
      showConfirmPassword: false,
    };
  },
  computed: {
    passwordStrength() {
      let strength = 0;
      const password = this.newPassword;
      if (password.length >= 8) strength += 1;
      if (password.match(/[A-Z]/)) strength += 1;
      if (password.match(/[0-9]/)) strength += 1;
      if (password.match(/[^A-Za-z0-9]/)) strength += 1;
      return strength;
    },
    passwordStrengthText() {
      const strength = this.passwordStrength;
      if (strength === 0) return 'Too weak';
      if (strength === 1) return 'Weak';
      if (strength === 2) return 'Medium';
      if (strength === 3) return 'Strong';
      if (strength === 4) return 'Very strong';
      return '';
    },
    passwordStrengthClass() {
      const strength = this.passwordStrength;
      if (strength === 0) return 'pw-very-weak';
      if (strength === 1) return 'pw-weak';
      if (strength === 2) return 'pw-medium';
      if (strength === 3) return 'pw-strong';
      if (strength === 4) return 'pw-very-strong';
      return '';
    },
    passwordStrengthIcon() {
      const strength = this.passwordStrength;
      if (strength <= 1) return 'times-circle';
      if (strength === 2) return 'exclamation-circle';
      return 'check-circle';
    },
    passwordMismatch() {
      return this.confirmPassword && this.newPassword !== this.confirmPassword;
    },
    tokenHintText() {
      return this.tokenError ? 'Token must be a 6-digit number' : 'Enter the 6-digit code from the email';
    },
    canResetPassword() {
      return (
        this.token &&
        /^\d{6}$/.test(this.token) &&
        this.newPassword.length >= 8 &&
        this.confirmPassword.length >= 8 &&
        this.newPassword === this.confirmPassword &&
        this.passwordStrength >= 3
      );
    },
  },
  mounted() {
    this.initializeAnimations();
    this.animateDecorations();
  },
  methods: {
    toggleNewPassword() {
      if (this.transitioning) return;
      this.showNewPassword = !this.showNewPassword;
      anime({
        targets: this.$refs.passwordGroup.querySelector('.toggle-password'),
        scale: [1, 1.1, 1],
        duration: 300,
        easing: 'easeInOutSine',
      });
    },
    toggleConfirmPassword() {
      if (this.transitioning) return;
      this.showConfirmPassword = !this.showConfirmPassword;
      anime({
        targets: this.$refs.confirmGroup.querySelector('.toggle-password'),
        scale: [1, 1.1, 1],
        duration: 300,
        easing: 'easeInOutSine',
      });
    },
    handleBack() {
      if (this.transitioning) return;
      if (this.currentStep > 1 && !this.resetCompleted) {
        this.currentStep--;
        this.animateStepChange();
      } else {
        this.$emit('back');
      }
    },
    initializeAnimations() {
      anime.timeline({
        easing: 'easeInOutSine',
      })
        .add({
          targets: this.$refs.forgotForm,
          opacity: [0, 1],
          translateX: [50, 0],
          scale: [0.95, 1],
          duration: 600,
        })
        .add({
          targets: this.$refs.backButton,
          opacity: [0, 1],
          translateX: [-15, 0],
          scale: [0.8, 1],
          duration: 500,
        }, '-=500')
        .add({
          targets: this.$refs.logoContainer,
          scale: [0.7, 1],
          opacity: [0, 1],
          rotate: [5, 0],
          duration: 500,
        }, '-=400')
        .add({
          targets: [this.$refs.titleText, this.$refs.subtitle],
          opacity: [0, 1],
          translateY: [15, 0],
          delay: anime.stagger(100),
          duration: 500,
        }, '-=400')
        .add({
          targets: this.$refs.formContent,
          opacity: [0, 1],
          translateY: [20, 0],
          scale: [0.98, 1],
          duration: 500,
        }, '-=300')
        .add({
          targets: [this.$refs.circle1, this.$refs.circle2, this.$refs.circle3],
          scale: [0.6, 1],
          opacity: [0, 0.6],
          delay: anime.stagger(100),
          duration: 800,
        }, '-=600');

      this.setupInputAnimations();
    },
    setupInputAnimations() {
      const inputs = [this.$refs.emailInput, this.$refs.tokenInput, this.$refs.passwordInput, this.$refs.confirmInput];
      inputs.forEach((input) => {
        if (!input) return;
        input.addEventListener('focus', () => {
          anime({
            targets: input.parentNode,
            scale: [1, 1.02],
            boxShadow: ['0 0 0 rgba(59, 130, 246, 0)', '0 0 12px rgba(59, 130, 246, 0.3)'],
            duration: 300,
            easing: 'easeInOutSine',
          });
        });
        input.addEventListener('blur', () => {
          anime({
            targets: input.parentNode,
            scale: [1.02, 1],
            boxShadow: ['0 0 12px rgba(59, 130, 246, 0.3)', '0 0 0 rgba(59, 130, 246, 0)'],
            duration: 300,
            easing: 'easeInOutSine',
          });
        });
      });
    },
    animateStepChange() {
      anime.timeline({
        easing: 'easeInOutSine',
      })
        .add({
          targets: this.$refs.formContent,
          opacity: [1, 0],
          translateY: [0, -15],
          scale: [1, 0.98],
          duration: 300,
        })
        .add({
          targets: this.$refs.formContent,
          opacity: [0, 1],
          translateY: [15, 0],
          scale: [0.98, 1],
          duration: 400,
        });
    },
    animateDecorations() {
      anime({
        targets: this.$refs.circle1,
        translateX: '10px',
        translateY: '15px',
        duration: 7000,
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
      });
      anime({
        targets: this.$refs.circle2,
        translateX: '-15px',
        translateY: '-10px',
        duration: 8000,
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
      });
      anime({
        targets: this.$refs.circle3,
        translateX: '8px',
        translateY: '-12px',
        duration: 6000,
        direction: 'alternate',
        loop: true,
        easing: 'easeInOutSine',
      });
    },
    async requestPasswordReset() {
      if (this.loading || this.transitioning) return;
      if (!this.email.trim() || !this.email.includes('@') || !this.email.includes('.')) {
        this.toast.error('Please enter a valid email address', {
          position: 'top-center',
          timeout: 4000,
        });
        this.shakeElement(this.$refs.emailGroup);
        return;
      }
      this.loading = true;
      anime({
        targets: this.$refs.requestButton,
        scale: [1, 0.95],
        backgroundColor: ['#3b82f6', '#2563eb'],
        duration: 300,
        easing: 'easeInOutSine',
      });
      try {
        const response = await api.post('/api/forgot-password', {
          email: this.email,
        });
        if (response.status === 200) {
          this.toast.success('Reset code sent to your email. Please check your inbox.', {
            position: 'top-center',
            timeout: 4000,
          });
          this.currentStep = 2;
          this.animateStepChange();
          setTimeout(() => {
            if (this.$refs.tokenInput) {
              this.$refs.tokenInput.focus();
            }
          }, 400);
        } else {
          this.toast.error(response.data.message || 'Failed to send reset code', {
            position: 'top-center',
            timeout: 4000,
          });
          this.shakeElement(this.$refs.emailGroup);
        }
      } catch (error) {
        console.error('Request reset code error:', error);
        this.toast.error(error.response?.data?.message || 'An error occurred while sending the reset code', {
          position: 'top-center',
          timeout: 4000,
        });
        this.shakeElement(this.$refs.emailGroup);
      } finally {
        this.loading = false;
        anime({
          targets: this.$refs.requestButton,
          scale: [0.95, 1],
          backgroundColor: ['#2563eb', '#3b82f6'],
          duration: 300,
          easing: 'easeInOutSine',
        });
      }
    },
    async verifyToken() {
      if (!this.token || this.transitioning) return;
      if (!/^\d{6}$/.test(this.token)) {
        this.tokenError = true;
        this.toast.error('Token must be a 6-digit number', {
          position: 'top-center',
          timeout: 4000,
        });
        this.shakeElement(this.$refs.tokenGroup);
        return;
      }
      this.tokenError = false;
      this.loading = true;
      try {
        const response = await api.post('/api/verify-reset-token', {
          token: this.token,
        });
        if (response.status === 200 && response.data.valid) {
          this.tokenVerified = true;
          if (this.$refs.passwordInput) {
            this.$refs.passwordInput.focus();
          }
        } else {
          this.tokenError = true;
          this.toast.error('Invalid or expired reset code. Please request a new code.', {
            position: 'top-center',
            timeout: 4000,
          });
          this.token = '';
          this.currentStep = 1;
          this.animateStepChange();
        }
      } catch (error) {
        console.error('Verify token error:', error);
        this.tokenError = true;
        this.toast.error(error.response?.data?.message || 'Invalid or expired reset code', {
          position: 'top-center',
          timeout: 4000,
        });
        this.token = '';
        this.currentStep = 1;
        this.animateStepChange();
      } finally {
        this.loading = false;
      }
    },
    async handleSubmit() {
      if (this.loading || !this.canResetPassword || this.transitioning) return;
      if (!this.tokenVerified) {
        if (!/^\d{6}$/.test(this.token)) {
          this.tokenError = true;
          this.toast.error('Token must be a 6-digit number', {
            position: 'top-center',
            timeout: 4000,
          });
          this.shakeElement(this.$refs.tokenGroup);
          return;
        }
        try {
          this.loading = true;
          const verifyResponse = await api.post('/api/verify-reset-token', {
            token: this.token,
          });
          if (!verifyResponse.data.valid) {
            this.tokenError = true;
            this.toast.error('Invalid or expired reset code. Please request a new code.', {
              position: 'top-center',
              timeout: 4000,
            });
            this.shakeElement(this.$refs.tokenGroup);
            this.loading = false;
            return;
          }
          this.tokenVerified = true;
        } catch (error) {
          console.error('Token verification error:', error);
          this.tokenError = true;
          this.toast.error(error.response?.data?.message || 'Invalid or expired reset code', {
            position: 'top-center',
            timeout: 4000,
          });
          this.shakeElement(this.$refs.tokenGroup);
          this.loading = false;
          return;
        }
      }
      this.loading = true;
      anime({
        targets: this.$refs.resetButton,
        scale: [1, 0.95],
        backgroundColor: ['#3b82f6', '#2563eb'],
        duration: 300,
        easing: 'easeInOutSine',
      });
      try {
        const response = await api.post('/api/reset-password', {
          token: this.token,
          password: this.newPassword,
        });
        if (response.status === 200) {
          this.resetCompleted = true;
          this.toast.success('Password reset successfully', {
            position: 'top-center',
            timeout: 4000,
          });
          anime.timeline({
            easing: 'easeInOutSine',
          })
            .add({
              targets: this.$refs.successContainer,
              scale: [0.9, 1],
              opacity: [0, 1],
              rotate: [5, 0],
              duration: 600,
            })
            .add({
              targets: this.$refs.successIcon,
              scale: [0, 1.2, 1],
              opacity: [0, 1],
              duration: 400,
              easing: 'easeOutBack',
            }, '-=400');
        } else {
          this.toast.error(response.data.message || 'Failed to reset password', {
            position: 'top-center',
            timeout: 4000,
          });
          this.shakeElement(this.$refs.passwordGroup);
        }
      } catch (error) {
        console.error('Reset password error:', error);
        this.toast.error(error.response?.data?.message || 'An error occurred while resetting the password', {
          position: 'top-center',
          timeout: 4000,
        });
        this.shakeElement(this.$refs.passwordGroup);
      } finally {
        this.loading = false;
        anime({
          targets: this.$refs.resetButton,
          scale: [0.95, 1],
          backgroundColor: ['#2563eb', '#3b82f6'],
          duration: 300,
          easing: 'easeInOutSine',
        });
      }
    },
    shakeElement(element) {
      if (!element) return;
      anime({
        targets: element,
        translateX: [
          { value: -10, duration: 80 },
          { value: 10, duration: 80 },
          { value: -8, duration: 80 },
          { value: 8, duration: 80 },
          { value: -6, duration: 80 },
          { value: 0, duration: 80 },
        ],
        boxShadow: [
          '0 0 0 rgba(239, 68, 68, 0)',
          '0 0 12px rgba(239, 68, 68, 0.5)',
          '0 0 0 rgba(239, 68, 68, 0)',
        ],
        duration: 480,
        easing: 'easeInOutSine',
      });
    },
  },
};
</script>

<style scoped>
:root {
  --bg-color: #1f2937;
  --input-bg: #2d3748;
  --text-color: #e5e7eb;
  --input-border: #4b5563;
  --primary-color: #3b82f6;
  --primary-color-rgb: 59, 130, 246;
  --error-color: #ef4444;
  --warning-color: #f59e0b;
  --success-color: #4b9960;
}

.forgot-password-form {
  width: 100%;
  padding: 2.5rem;
  background: rgba(45, 55, 72, 0.8);
  backdrop-filter: blur(10px);
  border-radius: 20px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  border: 1px solid var(--input-border);
  position: relative;
  margin-top: 1rem;
  overflow: hidden;
  z-index: 10;
  will-change: transform, opacity;
}

.back-button {
  position: absolute;
  top: 1.5rem;
  left: 1.5rem;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--text-color);
  opacity: 0.7;
  transition: all 0.3s ease-in-out;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.1);
  z-index: 10;
}

.back-button:hover:not(.disabled) {
  transform: translateX(-3px);
  opacity: 1;
  color: var(--primary-color);
}

.back-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.form-content {
  position: relative;
  z-index: 2;
}

.logo-container {
  text-align: center;
  margin-bottom: 2rem;
  position: relative;
  z-index: 2;
}

.logo-icon {
  font-size: 2.5rem;
  color: var(--primary-color);
  padding: 1.2rem;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(var(--primary-color-rgb), 0.15) 0%, rgba(var(--primary-color-rgb), 0.05) 70%);
  box-shadow: 0 5px 20px rgba(var(--primary-color-rgb), 0.4), 0 0 30px rgba(var(--primary-color-rgb), 0.2);
  transition: transform 0.3s ease-in-out;
}

.logo-icon:hover {
  transform: scale(1.05);
}

.title-text {
  color: var(--text-color);
  font-size: 1.85rem;
  text-align: center;
  margin: 0 0 0.8rem 0;
  font-weight: 700;
  position: relative;
  z-index: 2;
}

.subtitle {
  color: var(--text-color);
  opacity: 0.8;
  text-align: center;
  margin-bottom: 2rem;
  font-size: 1rem;
  position: relative;
  z-index: 2;
}

.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 2rem;
}

.step {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--bg-color);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  border: 2px solid rgba(var(--primary-color-rgb), 0.3);
  color: var(--text-color);
  opacity: 0.7;
  transition: all 0.3s ease-in-out;
}

.step.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
  opacity: 1;
  box-shadow: 0 0 0 5px rgba(var(--primary-color-rgb), 0.15);
}

.step-line {
  height: 2px;
  width: 60px;
  background: rgba(var(--primary-color-rgb), 0.3);
}

.input-group {
  margin-bottom: 1.5rem;
  position: relative;
  z-index: 2;
}

.input-container {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  transition: all 0.3s ease-in-out;
}

.input-icon {
  position: absolute;
  left: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-color);
  opacity: 0.6;
  z-index: 1;
}

.input-field {
  width: 100%;
  padding: 1.2rem 3.2rem 1.2rem 3.2rem;
  border: 2px solid var(--input-border);
  border-radius: 12px;
  color: var(--text-color);
  font-size: 1rem;
  background: var(--bg-color);
  transition: all 0.3s ease-in-out;
}

.input-field:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(var(--primary-color-rgb), 0.15);
  outline: none;
}

.input-label {
  position: absolute;
  left: 3.2rem;
  top: 50%;
  transform: translateY(-50%);
  background: var(--bg-color);
  padding: 0 0.5rem;
  color: var(--text-color);
  opacity: 0.6;
  transition: all 0.3s ease-in-out;
  pointer-events: none;
}

.input-field:focus+.input-label,
.input-field:not(:placeholder-shown)+.input-label {
  transform: translateY(-2rem) scale(0.85);
  opacity: 1;
  color: var(--primary-color);
  font-weight: 600;
  left: 2.5rem;
}

.toggle-password {
  position: absolute;
  right: 1.2rem;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--text-color);
  opacity: 0.6;
  cursor: pointer;
  padding: 0.5rem;
  z-index: 1;
  transition: all 0.3s ease-in-out;
}

.toggle-password:hover:not(:disabled) {
  opacity: 1;
  color: var(--primary-color);
}

.toggle-password:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.toggle-icon {
  font-size: 1rem;
}

.input-hint {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  color: var(--text-color);
  opacity: 0.7;
  padding-left: 0.5rem;
}

.input-hint.error {
  color: var(--error-color);
}

.password-strength {
  font-size: 0.85rem;
  margin-top: 0.5rem;
  font-weight: 600;
  padding-left: 0.5rem;
  display: flex;
  align-items: center;
}

.pw-very-weak,
.pw-weak {
  color: var(--error-color);
}

.pw-medium {
  color: var(--warning-color);
}

.pw-strong,
.pw-very-strong {
  color: var(--success-color);
}

.action-button {
  width: 100%;
  padding: 1.1rem;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease-in-out;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  z-index: 2;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(var(--primary-color-rgb), 0.25);
  margin-top: 1.5rem;
}

.action-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(var(--primary-color-rgb), 0.3);
}

.action-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(var(--primary-color-rgb), 0.2);
}

.action-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.button-icon {
  margin-right: 0.5rem;
}

.success-container {
  text-align: center;
  padding: 1rem 0;
}

.success-icon {
  font-size: 3.5rem;
  color: var(--success-color);
  margin-bottom: 1.5rem;
}

.success-title {
  font-size: 1.5rem;
  color: var(--text-color);
  margin-bottom: 0.5rem;
  font-weight: 700;
}

.success-message {
  color: var(--text-color);
  opacity: 0.8;
  margin-bottom: 2rem;
}

.decorative-circles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: 1;
}

.circle {
  position: absolute;
  border-radius: 50%;
}

.circle-1 {
  background: linear-gradient(135deg, rgba(var(--primary-color-rgb), 0.5), rgba(var(--primary-color-rgb), 0.05));
  width: 200px;
  height: 200px;
  top: -100px;
  right: -80px;
  opacity: 0.6;
}

.circle-2 {
  background: linear-gradient(45deg, rgba(var(--primary-color-rgb), 0.1), rgba(var(--primary-color-rgb), 0.4));
  width: 150px;
  height: 150px;
  bottom: -50px;
  left: -50px;
  opacity: 0.5;
}

.circle-3 {
  background: linear-gradient(225deg, rgba(var(--primary-color-rgb), 0.15), rgba(var(--primary-color-rgb), 0.3));
  width: 80px;
  height: 80px;
  bottom: 40%;
  right: -20px;
  opacity: 0.4;
}

@media (max-width: 480px) {
  .forgot-password-form {
    padding: 2rem 1.5rem;
  }

  .title-text {
    font-size: 1.6rem;
  }

  .back-button {
    top: 1rem;
    left: 1rem;
    width: 32px;
    height: 32px;
  }

  .circle-1 {
    width: 150px;
    height: 150px;
  }

  .circle-2 {
    width: 100px;
    height: 100px;
  }
}
</style>