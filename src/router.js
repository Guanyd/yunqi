import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', name: 'home', component: () => import('./views/HomeView.vue') },
  { path: '/visits', name: 'visits', component: () => import('./views/VisitsView.vue') },
  { path: '/visits/:id', name: 'visit-detail', component: () => import('./views/VisitDetailView.vue'), props: true },
  { path: '/expenses', name: 'expenses', component: () => import('./views/ExpensesView.vue') },
  { path: '/stages', name: 'stages', component: () => import('./views/StagesView.vue') },
  { path: '/settings', name: 'settings', component: () => import('./views/SettingsView.vue') },
  { path: '/setup', name: 'setup', component: () => import('./views/SetupView.vue') }
]

export default createRouter({
  history: createWebHashHistory(),
  routes
})