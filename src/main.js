import { createApp } from 'vue'
import './style.css'
import App from './App.vue'

// Polyfills para compatibilidad del navegador
if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof process === 'undefined') {
  window.process = { env: {} };
}

// Crear y montar la aplicación
const app = createApp(App);
app.mount('#app');
