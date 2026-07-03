<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

export type DocsTocLink = {
  id: string;
  text: string;
  depth: number;
  children?: DocsTocLink[];
};

type FlatTocLink = {
  link: DocsTocLink;
  level: number;
};

const props = defineProps<{
  links: DocsTocLink[];
}>();

const activeHeadingId = ref<string>();
let animationFrame: number | undefined;

function flattenTocLinks(links: DocsTocLink[], level = 0): FlatTocLink[] {
  return links.flatMap((link) => [
    { link, level },
    ...(link.children?.length ? flattenTocLinks(link.children, level + 1) : []),
  ]);
}

const flatLinks = computed(() => flattenTocLinks(props.links));
const flatLinkIds = computed(() => flatLinks.value.map(({ link }) => link.id));

function updateActiveHeading() {
  const ids = flatLinkIds.value;

  if (!ids.length) {
    activeHeadingId.value = undefined;
    return;
  }

  let activeId = ids[0];

  for (const id of ids) {
    const heading = document.getElementById(id);

    if (!heading) {
      continue;
    }

    if (heading.getBoundingClientRect().top <= 112) {
      activeId = id;
      continue;
    }

    break;
  }

  activeHeadingId.value = activeId;
}

function scheduleActiveHeadingUpdate() {
  if (animationFrame !== undefined) {
    return;
  }

  animationFrame = window.requestAnimationFrame(() => {
    animationFrame = undefined;
    updateActiveHeading();
  });
}

function refreshActiveHeading() {
  void nextTick(() => {
    const hashId = decodeURIComponent(window.location.hash.slice(1));

    if (hashId && flatLinkIds.value.includes(hashId)) {
      activeHeadingId.value = hashId;
      return;
    }

    updateActiveHeading();
  });
}

onMounted(() => {
  refreshActiveHeading();

  window.addEventListener("scroll", scheduleActiveHeadingUpdate, { passive: true });
  window.addEventListener("resize", scheduleActiveHeadingUpdate);
  window.addEventListener("hashchange", refreshActiveHeading);
});

onBeforeUnmount(() => {
  if (animationFrame !== undefined) {
    window.cancelAnimationFrame(animationFrame);
  }

  window.removeEventListener("scroll", scheduleActiveHeadingUpdate);
  window.removeEventListener("resize", scheduleActiveHeadingUpdate);
  window.removeEventListener("hashchange", refreshActiveHeading);
});

watch(() => flatLinkIds.value.join("\u0000"), refreshActiveHeading);
</script>

<template>
  <UContentToc v-if="links.length" :links="links">
    <template #content>
      <ul class="space-y-1">
        <li v-for="{ link, level } in flatLinks" :key="link.id">
          <a
            :href="`#${encodeURIComponent(link.id)}`"
            :aria-current="activeHeadingId === link.id ? 'location' : undefined"
            class="block truncate rounded-md py-1 text-sm transition-colors"
            :class="[
              activeHeadingId === link.id
                ? 'font-medium text-primary'
                : 'text-muted hover:text-default',
              level > 0 ? 'ps-4' : '',
            ]"
            @click="activeHeadingId = link.id"
          >
            {{ link.text }}
          </a>
        </li>
      </ul>
    </template>
  </UContentToc>
</template>
