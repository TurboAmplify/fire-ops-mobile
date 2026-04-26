## Tighten Incident Agreements empty state

Currently the "Incident Agreements" section uses two lines when empty: the label/upload row, and a separate "No agreements uploaded." line below. Move the empty message inline with the label so it occupies a single row.

### File to change
- `src/components/incidents/AgreementUpload.tsx`

### Change
In the header row, place the empty-state text next to the section label (instead of below it):

```
INCIDENT AGREEMENTS — No agreements uploaded.            ↑ Upload
```

- Group the label and (when empty) the "— No agreements uploaded." text inside a flex row aligned to the baseline.
- Keep the Upload control on the right.
- Remove the standalone `<p>` rendered below when empty.
- Loading and populated-list states are unchanged (file list still renders below as today).

This is a small, isolated UI tweak — no logic changes, no other components affected. Same component is used for truck-level agreements, so they get the same tighter empty state.