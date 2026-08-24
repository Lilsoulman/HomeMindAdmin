<template>
  <el-dialog
    :model-value="modelValue"
    v-bind="$attrs"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <slot />
    <template v-if="$slots.footer" #footer><slot name="footer" /></template>
  </el-dialog>
</template>

<script>
export default {
  inheritAttrs: false,
  props: {
    modelValue: { type: Boolean, required: true }
  },
  emits: ['update:modelValue']
}
</script>
