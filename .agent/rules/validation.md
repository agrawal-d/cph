---
trigger: always_on
description: 'Guidelines for validating project changes'
---

-   To validate changes, only run `npm run test-compile`, no other command needs
    to be run. Only run this for complex changes where there may be compilation
    errors. No need to run test-compile for trivial / simple edits.
-   No need to run webpack, prettier or other validations ever.
