<template>
  <div class="login-container">
    <!-- Particle Canvas -->
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>

    <div class="form-wrapper">
      <transition name="slide">
        <form v-if="!showForgotPassword" @submit.prevent="handleSubmit" class="login-form" ref="loginForm" key="login">
          <div class="logo-container" ref="logoContainer">
            <font-awesome-icon icon="user-lock" class="logo-icon" />
          </div>
          <h2 class="welcome-text" ref="welcomeText">Welcome Back</h2>
          <p class="subtitle" ref="subtitle">Sign in to continue</p>

          <div class="form-content" ref="formContent">
            <div class="input-group" ref="usernameGroup">
              <div class="input-container">
                <font-awesome-icon icon="user" class="input-icon" />
                <input type="text" id="username" v-model="username" :disabled="loading || transitioning"
                  class="input-field" autocomplete="username" placeholder=" " required ref="usernameInput" />
                <label for="username" class="input-label">Username</label>
              </div>
            </div>

            <div class="input-group" ref="passwordGroup">
              <div class="input-container">
                <font-awesome-icon icon="lock" class="input-icon" />
                <input :type="showPassword ? 'text' : 'password'" id="password" v-model="password"
                  :disabled="loading || transitioning" class="input-field" autocomplete="current-password"
                  placeholder=" " required ref="passwordInput" />
                <label for="password" class="input-label">Password</label>
                <button type="button" class="toggle-password" @click="togglePassword"
                  :disabled="loading || transitioning" title="Toggle password visibility">
                  <font-awesome-icon :icon="showPassword ? 'eye-slash' : 'eye'" class="toggle-icon" />
                </button>
              </div>
            </div>

            <button type="submit" class="login-button" :disabled="loading || transitioning" ref="loginButton">
              <template v-if="loading">
                <font-awesome-icon icon="spinner" spin class="button-icon" />
                Signing In...
              </template>
              <template v-else>
                <font-awesome-icon icon="sign-in-alt" class="button-icon" />
                Sign In
              </template>
            </button>
          </div>

          <div class="additional-links" ref="additionalLinks">
            <a href="#" class="link-text" @click.prevent="forgotPassword" :class="{ disabled: transitioning }">
              Forgot password?
            </a>
          </div>

          <div class="decorative-circles">
            <div class="circle circle-1" ref="circle1"></div>
            <div class="circle circle-2" ref="circle2"></div>
            <div class="circle circle-3" ref="circle3"></div>
          </div>
        </form>

        <ForgotPasswordComponent v-else @back="handleBack" key="forgot" :transitioning="transitioning" />
      </transition>
    </div>
  </div>
</template>

<script>
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome';
import { useToast } from 'vue-toastification';
import 'vue-toastification/dist/index.css';
import anime from 'animejs/lib/anime.es.js';
import api from '@/services/api';
import ForgotPasswordComponent from './ForgotPassword.vue';

export default {
  name: 'LoginComponent',
  components: {
    FontAwesomeIcon,
    ForgotPasswordComponent,
  },
  emits: ['login-success'],
  setup() {
    const toast = useToast();
    return { toast };
  },
  data() {
    return {
      username: '',
      password: '',
      loading: false,
      error: null,
      showForgotPassword: false,
      sessionChecking: false,
      particles: [],
      ctx: null,
      canvas: null,
      showPassword: false,
      transitioning: false,
    };
  },
  mounted() {
    this.initializeAnimations();
    this.checkSession();
    this.initParticles();
    this.animateParticles();
  },
  methods: {
    togglePassword() {
      if (this.transitioning) return;
      this.showPassword = !this.showPassword;
      anime({
        targets: this.$el.querySelector('.toggle-password'),
        scale: [1, 1.1, 1],
        duration: 300,
        easing: 'easeInOutSine',
      });
    },
    async checkSession() {
      this.sessionChecking = true;
      try {
        console.log('Checking session status...');
        const response = await api.get('/api/session');
        if (response.status === 200 && response.data.logged_in) {
          console.log('User already logged in as:', response.data.user.role);
          this.$emit('login-success', response.data.user.role);
          this.toast.success('Welcome back!', {
            timeout: 2000,
            position: 'top-center',
            icon: true,
          });
        }
      } catch (error) {
        console.error('Session check failed:', error);
        if (error.response && error.response.status !== 401) {
          this.toast.error('Could not verify login status. Please check your connection.', {
            timeout: 4000,
            position: 'top-center',
            icon: true,
          });
        }
      } finally {
        this.sessionChecking = false;
      }
    },
    initParticles() {
      this.canvas = this.$refs.particleCanvas;
      this.ctx = this.canvas.getContext('2d');
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;

      const particleCount = 50;
      for (let i = 0; i < particleCount; i++) {
        this.particles.push({
          x: Math.random() * this.canvas.width,
          y: Math.random() * this.canvas.height,
          radius: Math.random() * 2 + 1,
          vx: (Math.random() - 0.5) * 1.5,
          vy: (Math.random() - 0.5) * 1.5,
          opacity: Math.random() * 0.4 + 0.2,
        });
      }

      window.addEventListener('resize', () => {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
      });
    },
    animateParticles() {
      const animate = () => {
        if (!this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.particles.forEach((particle) => {
          particle.x += particle.vx;
          particle.y += particle.vy;

          if (particle.x < 0 || particle.x > this.canvas.width) particle.vx *= -1;
          if (particle.y < 0 || particle.y > this.canvas.height) particle.vy *= -1;

          this.ctx.beginPath();
          this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          this.ctx.fillStyle = `rgba(59, 130, 246, ${particle.opacity})`;
          this.ctx.shadowBlur = 8;
          this.ctx.shadowColor = 'rgba(59, 130, 246, 0.6)';
          this.ctx.fill();
          this.ctx.closePath();
        });
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    },
    initializeAnimations() {
      anime.timeline({
        easing: 'easeInOutSine',
      })
        .add({
          targets: this.$refs.loginForm,
          opacity: [0, 1],
          translateX: [-20, 0],
          duration: 600,
        })
        .add({
          targets: this.$refs.logoContainer,
          scale: [0.8, 1],
          opacity: [0, 1],
          duration: 500,
        }, '-=500')
        .add({
          targets: [this.$refs.welcomeText, this.$refs.subtitle],
          opacity: [0, 1],
          translateY: [10, 0],
          delay: anime.stagger(100),
          duration: 500,
        }, '-=400')
        .add({
          targets: [this.$refs.usernameGroup, this.$refs.passwordGroup, this.$refs.loginButton],
          opacity: [0, 1],
          translateY: [15, 0],
          delay: anime.stagger(100),
          duration: 500,
        }, '-=400')
        .add({
          targets: this.$refs.additionalLinks,
          opacity: [0, 1],
          translateY: [10, 0],
          duration: 500,
        }, '-=300')
        .add({
          targets: [this.$refs.circle1, this.$refs.circle2, this.$refs.circle3],
          scale: [0.7, 1],
          opacity: [0, 0.6],
          delay: anime.stagger(100),
          duration: 800,
        }, '-=600');

      this.setupInputAnimations();
      this.animateDecorations();
    },
    setupInputAnimations() {
      const inputs = [this.$refs.usernameInput, this.$refs.passwordInput];
      inputs.forEach((input) => {
        if (!input) return;
        input.addEventListener('focus', () => {
          anime({
            targets: input.parentNode,
            scale: [1, 1.02],
            boxShadow: ['0 0 0 rgba(59, 130, 246, 0)', '0 0 10px rgba(59, 130, 246, 0.2)'],
            duration: 300,
            easing: 'easeInOutSine',
          });
        });
        input.addEventListener('blur', () => {
          anime({
            targets: input.parentNode,
            scale: [1.02, 1],
            boxShadow: ['0 0 10px rgba(59, 130, 246, 0.2)', '0 0 0 rgba(59, 130, 246, 0)'],
            duration: 300,
            easing: 'easeInOutSine',
          });
        });
      });
    },
    animateDecorations() {
      if (this.$refs.circle1) {
        anime({
          targets: this.$refs.circle1,
          translateX: '8px',
          translateY: '12px',
          duration: 7000,
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine',
        });
      }
      if (this.$refs.circle2) {
        anime({
          targets: this.$refs.circle2,
          translateX: '-12px',
          translateY: '-8px',
          duration: 8000,
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine',
        });
      }
      if (this.$refs.circle3) {
        anime({
          targets: this.$refs.circle3,
          translateX: '6px',
          translateY: '-10px',
          duration: 6000,
          direction: 'alternate',
          loop: true,
          easing: 'easeInOutSine',
        });
      }
    },
    async handleSubmit() {
      if (this.transitioning || !this.username.trim() || !this.password.trim()) {
        if (!this.username.trim() || !this.password.trim()) {
          this.showError('Please fill in all fields');
          this.shakeForm();
        }
        return;
      }
      this.loading = true;
      this.error = null;
      anime({
        targets: this.$refs.loginButton,
        scale: [1, 0.98],
        duration: 300,
        easing: 'easeInOutSine',
      });
      try {
        const response = await api.post('/api/login', {
          username: this.username,
          password: this.password,
        });
        if (response.status === 200 && response.data.message === 'Login successful') {
          const role = response.data.role;
          localStorage.setItem('userRole', role);
          if (role === 'admin') {
            window.location.href = '/admin/dashboard';
          } else {
            window.location.href = '/agent/dashboard';
          }
          this.animateSuccessfulLogin();
          this.toast.success('Login successful!', {
            timeout: 2000,
            position: 'top-center',
            icon: true,
          });
          setTimeout(() => {
            this.$emit('login-success', response.data);
          }, 1000);
        } else {
          this.showError(response.data.message || 'Login failed. Please try again.');
          this.shakeForm();
        }
      } catch (error) {
        console.error('Login error:', error);
        if (error.response) {
          this.showError(
            error.response.data?.message ||
            `Server error: ${error.response.status} ${error.response.statusText}`,
          );
        } else if (error.request) {
          this.showError('Network error - please check your connection');
        } else {
          this.showError(error.message || 'Login failed. Please try again.');
        }
        this.shakeForm();
      } finally {
        if (this.loading) {
          anime({
            targets: this.$refs.loginButton,
            scale: [0.98, 1],
            duration: 300,
            easing: 'easeInOutSine',
          });
          this.loading = false;
        }
      }
    },
    animateSuccessfulLogin() {
      anime.timeline({
        easing: 'easeInOutSine',
      })
        .add({
          targets: this.$refs.loginButton,
          scale: [0.98, 1.05],
          backgroundColor: ['#3b82f6', '#4b9960'],
          duration: 400,
        })
        .add({
          targets: [this.$refs.usernameGroup, this.$refs.passwordGroup, this.$refs.additionalLinks],
          opacity: 0,
          translateY: -10,
          duration: 400,
          delay: anime.stagger(80),
        }, '-=300')
        .add({
          targets: this.$refs.loginButton,
          scale: [1.05, 1],
          duration: 200,
        }, '-=200');
    },
    shakeForm() {
      if (!this.$refs.loginForm) return;
      anime({
        targets: this.$refs.loginForm,
        translateX: [
          { value: -8, duration: 80 },
          { value: 8, duration: 80 },
          { value: -6, duration: 80 },
          { value: 6, duration: 80 },
          { value: -4, duration: 80 },
          { value: 0, duration: 80 },
        ],
        easing: 'easeInOutSine',
      });
    },
    forgotPassword() {
      if (this.transitioning) return;
      this.transitioning = true;
      anime({
        targets: this.$refs.loginForm,
        opacity: [1, 0],
        translateX: [0, -50],
        duration: 400,
        easing: 'easeInOutSine',
        complete: () => {
          this.showForgotPassword = true;
          this.transitioning = false;
        },
      });
    },
    handleBack() {
      if (this.transitioning) return;
      this.transitioning = true;
      anime({
        targets: this.$el.querySelector('.forgot-password-form'),
        opacity: [1, 0],
        translateX: [0, 50],
        duration: 400,
        easing: 'easeInOutSine',
        complete: () => {
          this.showForgotPassword = false;
          this.transitioning = false;
        },
      });
    },
    showError(message) {
      this.error = message;
      this.toast.error(message, {
        timeout: 4000,
        position: 'top-center',
        icon: true,
        closeButton: true,
        pauseOnFocusLoss: true,
        pauseOnHover: true,
        draggable: true,
        draggablePercent: 0.6,
        showCloseButtonOnHover: false,
        hideProgressBar: false,
        closeOnClick: true,
        rtl: false,
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
  --success-color: #4b9960;
}

.particle-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 0;
}

.login-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  padding: 1rem;
  background-color: var(--bg-color);
  position: relative;
  overflow: hidden;
}

.form-wrapper {
  width: 100%;
  max-width: 450px;
  position: relative;
}

.login-form {
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
}

.form-content {
  margin-top: 1.5rem;
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

.welcome-text {
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

.login-button {
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
}

.login-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 14px rgba(var(--primary-color-rgb), 0.3);
}

.login-button:active:not(:disabled) {
  transform: translateY(0);
  box-shadow: 0 2px 6px rgba(var(--primary-color-rgb), 0.2);
}

.login-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.button-icon {
  margin-right: 0.5rem;
}

.additional-links {
  margin-top: 2rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: center;
  position: relative;
  z-index: 2;
}

.link-text {
  color: var(--text-color);
  opacity: 0.8;
  text-decoration: none;
  font-size: 0.95rem;
  transition: all 0.3s ease-in-out;
  position: relative;
}

.link-text:hover:not(.disabled) {
  opacity: 1;
  color: var(--primary-color);
}

.link-text.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.link-text:not(.disabled):after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  width: 0;
  height: 1px;
  background-color: var(--primary-color);
  transition: width 0.3s ease-in-out;
}

.link-text:hover:not(.disabled):after {
  width: 100%;
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

@keyframes shakeEffect {
  0% {
    transform: translateX(0);
  }

  25% {
    transform: translateX(8px);
  }

  50% {
    transform: translateX(-8px);
  }

  75% {
    transform: translateX(4px);
  }

  100% {
    transform: translateX(0);
  }
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.4s ease-in-out;
  position: absolute;
  width: 100%;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(50px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-50px);
}

@media (max-width: 480px) {
  .login-form {
    padding: 2rem 1.5rem;
  }

  .welcome-text {
    font-size: 1.6rem;
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