-- 1) Fix 270 Fire / DL62 8/07 ticket: equipment dated 8/07 but crew dated 8/08, zero hours
update shift_tickets
set equipment_entries = jsonb_build_array(
      jsonb_set(jsonb_set(equipment_entries->0, '{start}', '"07:00"'), '{total}', '12.5')
    ),
    personnel_entries = (
      select jsonb_agg(
        p || jsonb_build_object('date','2026-08-07','op_start','07:00','op_stop','12:00','sb_start','12:30','sb_stop','19:30','total',12,
          'remarks','Work, 30-min lunch at 12:00')
      ) from jsonb_array_elements(personnel_entries) p
    ),
    updated_at = now()
where id = '6abe7eac-e56e-471c-b832-3227fa3f7701';

-- 2) Owl Fire / DL62: remove blank 8/17 draft and duplicate 8/18 ticket
update shift_tickets set deleted_at = now(), deleted_reason = 'Blank draft; equipment 8/17 vs crew 8/18 mismatch, no hours'
where id = '5cf26024-604d-4f07-af8c-a893e81bd554' and deleted_at is null;

update shift_tickets set deleted_at = now(), deleted_reason = 'Exact duplicate of 8/18 ticket'
where id = '54ffa1a2-c7dd-4aa5-812b-e83c5df719fb' and deleted_at is null;

-- 3) Chapter Hill / DL62 8/10: keep the later corrected 12.5 hr ticket, retire the superseded 14.5 hr one
update shift_tickets set deleted_at = now(), deleted_reason = 'Superseded by corrected 8/10 ticket (12.5 hrs)'
where id = '5ecffad4-572f-412f-9047-33300c969b97' and deleted_at is null;
