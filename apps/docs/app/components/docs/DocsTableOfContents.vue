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
      <div class="relative min-w-0">
        <div
          data-slot="indicator"
          class="absolute inset-s-0 top-0 ms-2.5 grid w-px overflow-hidden rounded-full"
          :style="{ gridTemplateRows: `repeat(${flatLinks.length}, 1.75rem)` }"
        >
          <div
            v-for="{ link } in flatLinks"
            :key="link.id"
            data-slot="indicatorSegment"
            class="h-7 w-full"
            :class="activeHeadingId === link.id ? 'bg-primary' : 'bg-border'"
          />
        </div>

        <ul class="ms-2.5 min-w-0 ps-4">
          <li v-for="{ link, level } in flatLinks" :key="link.id" class="-ms-px h-7 min-w-0">
            <a
              :href="`#${encodeURIComponent(link.id)}`"
              :aria-current="activeHeadingId === link.id ? 'location' : undefined"
              class="block h-7 min-w-0 max-w-full truncate rounded-md text-sm leading-7 transition-colors"
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
      </div>
    </template>
  </UContentToc>
</template>
