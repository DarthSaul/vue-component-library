import { createRouter, createWebHistory } from 'vue-router'

export default createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/guide/button', component: () => import('../pages/Guide/Button/button.md') },
    { path: '/guide/card',   component: () => import('../pages/Guide/Card/card.md') },
    { path: '/guide/alert',  component: () => import('../pages/Guide/Alert/alert.md') },
    { path: '/', redirect: '/guide/button' },
  ],
})
