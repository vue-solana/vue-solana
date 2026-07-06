<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    description?: string;
    section?: string;
    title?: string;
  }>(),
  {
    description: "Documentation for Vue and Nuxt libraries that help developers use Solana.",
    section: "Documentation",
    title: "Vue Solana",
  },
);
</script>

<template>
  <div
    :style="{
      alignItems: 'stretch',
      background: '#020617',
      color: '#f8fafc',
      display: 'flex',
      height: '100%',
      justifyContent: 'center',
      padding: '54px',
      width: '100%',
    }"
  >
    <div
      :style="{
        background: '#0f172a',
        border: '1px solid rgba(167, 139, 250, 0.32)',
        borderRadius: '36px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        padding: '58px 64px',
        position: 'relative',
        width: '100%',
      }"
    >
      <div
        :style="{
          background: '#312e81',
          borderRadius: '999px',
          opacity: 0.45,
          display: 'flex',
          height: '260px',
          position: 'absolute',
          right: '-40px',
          top: '-70px',
          width: '260px',
        }"
      />
      <div
        :style="{
          background: '#064e3b',
          borderRadius: '999px',
          opacity: 0.5,
          bottom: '-70px',
          display: 'flex',
          height: '240px',
          left: '-40px',
          position: 'absolute',
          width: '240px',
        }"
      />

      <div :style="{ display: 'flex', justifyContent: 'space-between', position: 'relative' }">
        <div :style="{ alignItems: 'center', display: 'flex', gap: '16px' }">
          <img
            src="/VueSolana-logo.png"
            alt=""
            :style="{
              display: 'flex',
              height: '74px',
              width: '74px',
            }"
          />
          <div :style="{ display: 'flex', flexDirection: 'column' }">
            <div
              :style="{
                color: '#f8fafc',
                fontSize: '30px',
                fontWeight: 800,
                letterSpacing: '-0.03em',
              }"
            >
              Vue Solana
            </div>
            <div :style="{ color: '#a7f3d0', fontSize: '19px', fontWeight: 600 }">
              Vue + Nuxt libraries
            </div>
          </div>
        </div>

        <div
          :style="{
            alignItems: 'center',
            border: '1px solid rgba(148, 163, 184, 0.28)',
            borderRadius: '999px',
            color: '#c4b5fd',
            display: 'flex',
            fontSize: '20px',
            fontWeight: 700,
            height: '48px',
            padding: '0 24px',
          }"
        >
          {{ props.section }}
        </div>
      </div>

      <div
        :style="{
          display: 'flex',
          flexDirection: 'column',
          gap: '26px',
          maxWidth: '880px',
          position: 'relative',
        }"
      >
        <h1
          :style="{
            color: '#ffffff',
            fontSize: '76px',
            fontWeight: 900,
            letterSpacing: '-0.06em',
            lineHeight: 0.94,
            margin: 0,
          }"
        >
          {{ props.title }}
        </h1>
        <p
          :style="{
            color: '#cbd5e1',
            fontSize: '30px',
            fontWeight: 500,
            lineHeight: 1.32,
            margin: 0,
          }"
        >
          {{ props.description }}
        </p>
      </div>

      <div
        :style="{
          alignItems: 'center',
          color: '#94a3b8',
          display: 'flex',
          fontSize: '22px',
          fontWeight: 600,
          justifyContent: 'space-between',
          position: 'relative',
        }"
      >
        <div :style="{ display: 'flex' }">vue-solana-docs.vercel.app</div>
        <div :style="{ color: '#14f195', display: 'flex' }">Build Solana apps the Vue way</div>
      </div>
    </div>
  </div>
</template>
