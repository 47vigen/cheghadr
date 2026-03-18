# Frontend Consistency Refactor Baseline

This document is the pre-refactor baseline for the frontend consistency effort.

## Target Routes

- `/` (assets)
- `/prices`
- `/calculator`
- `/assets/add`

## Baseline UX Checklist

- [ ] Loading state matches route intent and uses consistent visual language
- [ ] Error state includes clear title, explanation, and retry action
- [ ] Empty state has purposeful copy and next-step action where applicable
- [ ] Pull-to-refresh indicator behavior is consistent across data routes
- [ ] RTL/LTR behavior is correct for text inputs, numbers, and labels
- [ ] Safe-area spacing works with bottom navigation and sticky actions
- [ ] Modals use consistent structure, spacing, and button treatment
- [ ] Avatar fallback behavior is consistent across all asset lists
- [ ] Skeleton rows visually match eventual content structure

## Visual Baseline Capture

Capture before/after screenshots for each route in both light and dark themes:

- [ ] assets-light-before
- [ ] assets-dark-before
- [ ] prices-light-before
- [ ] prices-dark-before
- [ ] calculator-light-before
- [ ] calculator-dark-before
- [ ] add-asset-light-before
- [ ] add-asset-dark-before

## Notes

- This checklist is intentionally practical and route-focused to keep validation fast.
- The implementation phase should only move style/system primitives after baseline parity is confirmed.
