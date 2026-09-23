<script setup>
import { computed, ref } from 'vue'

import AppIcon from '@/components/icons/AppIcon.vue'
import { getCategoryLabel, getStatusMeta, getWeightLabel } from '@/utils/format'

const props = defineProps({
  evaluation: {
    type: Object,
    required: true
  }
})

const categories = computed(() => {
  const groups = new Map()

  for (const criterion of props.evaluation.criteria || []) {
    if (!groups.has(criterion.category)) {
      groups.set(criterion.category, [])
    }

    groups.get(criterion.category).push(criterion)
  }

  return Array.from(groups.entries()).map(([key, criteria]) => ({
    key,
    label: getCategoryLabel(key),
    criteria,
    metCount: criteria.filter(item => item.status === 'met').length,
    total: criteria.length
  }))
})

const activeCategory = ref(categories.value[0]?.key || '')

const activeCriteria = computed(
  () =>
    categories.value.find(cat => cat.key === activeCategory.value)?.criteria ||
    []
)
</script>

<template>
  <div class="criteria-board">
    <div v-if="evaluation.caps?.length" class="caps-banner">
      <AppIcon name="alert-triangle" />

      <div>
        <strong
          v-for="(cap, index) in evaluation.caps"
          :key="index"
          class="cap-line"
        >
          Nota limitada a {{ cap.limit }}: {{ cap.reason }}
        </strong>
      </div>
    </div>

    <div
      class="category-tabs"
      role="tablist"
      aria-label="Categorías del baremo"
    >
      <button
        v-for="category in categories"
        :key="category.key"
        role="tab"
        type="button"
        class="category-tab"
        :aria-selected="activeCategory === category.key"
        :class="{ active: activeCategory === category.key }"
        @click="activeCategory = category.key"
      >
        {{ category.label }}
        <span class="tab-count"
          >{{ category.metCount }}/{{ category.total }}</span
        >
      </button>
    </div>

    <ul class="criteria-list" role="tabpanel">
      <li
        v-for="criterion in activeCriteria"
        :key="criterion.id"
        class="criterion-item"
        :class="getStatusMeta(criterion.status).className"
      >
        <span class="criterion-status-icon">
          <AppIcon :name="getStatusMeta(criterion.status).icon" />
        </span>

        <div class="criterion-body">
          <div class="criterion-head">
            <strong>{{ criterion.label }}</strong>

            <div class="criterion-tags">
              <span v-if="criterion.mandatory" class="mandatory-tag"
                >Obligatorio</span
              >
              <span class="weight-tag">{{
                getWeightLabel(criterion.weight)
              }}</span>
            </div>
          </div>

          <p v-if="criterion.evidence" class="criterion-evidence">
            «{{ criterion.evidence }}»
          </p>

          <p v-if="criterion.note" class="criterion-note">
            {{ criterion.note }}
          </p>
        </div>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.criteria-board {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.caps-banner {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  background: var(--score-warn-bg);
  color: var(--score-warn);
  border: 1px solid rgba(251, 191, 36, 0.3);
  font-size: 0.88rem;
}

.caps-banner svg {
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}

.cap-line {
  display: block;
  font-weight: 500;
}

.category-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
}

.category-tab {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.5rem 0.9rem;
  border-radius: var(--radius-full);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 0.85rem;
  transition:
    color var(--duration-base) var(--ease-out),
    border-color var(--duration-base) var(--ease-out),
    background-color var(--duration-base) var(--ease-out);
}

.category-tab.active {
  color: var(--color-text);
  border-color: var(--accent-border);
  background: var(--accent-soft);
}

.tab-count {
  font-size: 0.72rem;
  color: var(--color-text-tertiary);
}

.category-tab.active .tab-count {
  color: var(--accent-strong);
}

.criteria-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.criterion-item {
  display: flex;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-border);
  background: var(--color-surface);
}

.criterion-status-icon {
  display: inline-flex;
  width: 24px;
  height: 24px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
}

.criterion-item.status-met .criterion-status-icon {
  color: var(--score-good);
}

.criterion-item.status-partial .criterion-status-icon {
  color: var(--score-warn);
}

.criterion-item.status-missing .criterion-status-icon {
  color: var(--score-bad);
}

.criterion-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  flex: 1;
  min-width: 0;
}

.criterion-head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.criterion-head strong {
  font-size: 0.92rem;
}

.criterion-tags {
  display: flex;
  gap: var(--space-2);
  flex-shrink: 0;
}

.mandatory-tag {
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  background: var(--score-bad-bg);
  color: var(--score-bad);
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.weight-tag {
  padding: 0.2rem 0.6rem;
  border-radius: var(--radius-full);
  background: var(--color-surface-hover);
  color: var(--color-text-tertiary);
  font-size: 0.7rem;
}

.criterion-evidence {
  font-size: 0.85rem;
  color: var(--color-text-secondary);
  font-style: italic;
  border-left: 2px solid var(--color-border-strong);
  padding-left: var(--space-3);
}

.criterion-note {
  font-size: 0.85rem;
  color: var(--color-text-tertiary);
}
</style>
