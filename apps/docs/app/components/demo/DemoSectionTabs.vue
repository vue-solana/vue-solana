<script setup lang="ts">
import { onMounted, onScopeDispose, ref } from "vue";

const props = defineProps<{
  sections: Array<{ id: string; label: string }>;
}>();

const activeId = ref(props.sections[0]?.id || "");

let ticking = false;

function pickActive() {
  const threshold = 200;

  let current = activeId.value;

  for (const section of document.querySelectorAll<HTMLElement>("[data-demo-section]")) {
    if (section.getBoundingClientRect().top <= threshold) {
      current = section.id;
    }
  }

  activeId.value = current;
}

function onScroll() {
  if (ticking) {
    return;
  }

  ticking = true;

  requestAnimationFrame(() => {
    pickActive();
    ticking = false;
  });
}

function scrollTo(id: string) {
  activeId.value = id;
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

onMounted(() => {
  pickActive();
  window.addEventListener("scroll", onScroll, { passive: true });
});

onScopeDispose(() => {
  window.removeEventListener("scroll", onScroll);
});
</script>

<template>
  <nav
    aria-label="Demo sections"
    class="sticky top-(--ui-header-height) z-40 border-b border-slate-200/80 backdrop-blur dark:border-slate-800"
  >
    <div class="mx-auto flex max-w-295 gap-2 overflow-x-auto py-3">
      <UButton
        v-for="section in sections"
        :key="section.id"
        :color="activeId === section.id ? 'primary' : 'neutral'"
        :variant="activeId === section.id ? 'solid' : 'ghost'"
        size="sm"
        class="shrink-0 rounded-full"
        @click="scrollTo(section.id)"
      >
        {{ section.label }}
      </UButton>
    </div>
  </nav>
</template>
