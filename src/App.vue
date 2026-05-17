<template>
  <RouterView v-slot="{ Component, route }">
    <Transition name="page" mode="out-in">
      <component :is="Component" :key="route.path" />
    </Transition>
  </RouterView>
  <AppToast />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import AppToast from './components/AppToast.vue'
</script>
