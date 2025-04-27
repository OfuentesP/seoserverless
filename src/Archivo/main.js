import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createRouter, createWebHistory } from 'vue-router'
import Home from './views/Home.vue'
import Resultados from './views/Resultados.vue'
import Loading from './views/Loading.vue'

// Polyfills para compatibilidad del navegador
if (typeof global === 'undefined') {
  window.global = window;
}

if (typeof process === 'undefined') {
  window.process = { env: {} };
}

// Definir rutas
const routes = [
  { path: '/', component: Home },
  { path: '/cargando', component: Loading },
  { path: '/resultados', component: Resultados }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

// Crear y montar la aplicación
const app = createApp(App);
app.use(router);
app.mount('#app');
